/**
 * T4-03 聊天持久化收口（仅已登录用户；guest 走浏览器 IndexedDB 不入库）。
 * 所有读写经此服务，对调用方屏蔽 Prisma；查询强制 userId 过滤防跨用户泄漏。
 * append-only：消息写入后不更新不删除，仅随会话级联删除。
 */
import { Prisma } from '../generated/prisma/client.js';
import { HistoryConfig } from '../config/feature-config.js';
import { prisma } from '../lib/prisma.js';
import type { InternalMessage } from '../core/agent-harness/types.js';

/** 服务端压缩基线：摘要 + 边界时刻（晚于此时刻的消息为 tail，append-only 保证稳定） */
export interface CompactBaseline {
  summaryContent: string;
  compactedAt: string;
}

/** 会话摘要（列表用） */
export interface ChatSessionSummary {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 消息分页结果（只读展示用） */
export interface ChatMessagePage {
  messages: StoredChatMessage[];
  nextCursor: string | null;
}

/** 持久化消息的对外形态（字段对齐 P0 完整 graph：content / toolCalls / reasoning） */
export interface StoredChatMessage {
  id: string;
  role: string;
  content: string | null;
  toolCalls: Prisma.JsonValue | null;
  reasoning: string | null;
  createdAt: Date;
}

interface ContextAssembleOptions {
  /** 无压缩基线时，取最近 N 条；缺省用 config 默认值 */
  messageHistoryCount?: number;
}

// 落库时跳过的来源：历史回放 / 系统提示 / 记忆 / 提醒 / 压缩产物（仅持久化本轮真实对话）
const PERSIST_EXCLUDE_SOURCES: ReadonlySet<string> = new Set([
  'persisted',
  'hook',
  'reminder',
  'summary',
  'compact',
  'system'
]);

const PERSISTABLE_ROLES: ReadonlySet<string> = new Set(['user', 'assistant', 'tool']);

const TITLE_MAX_CHARS = 40;

function isCompactBaseline(value: Prisma.JsonValue | null | undefined): value is CompactBaseline & Prisma.JsonObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).summaryContent === 'string' &&
    typeof (value as Record<string, unknown>).compactedAt === 'string'
  );
}

function messageContentText(content: InternalMessage['content']): string | null {
  return typeof content === 'string' ? content : null;
}

/** Prisma 行 → 对外消息形态（getMessagesPage / assembleContextMessages 共用） */
function mapRowToStored(row: {
  id: string;
  role: string;
  content: string | null;
  toolCallsJson: Prisma.JsonValue | null;
  reasoning: string | null;
  createdAt: Date;
}): StoredChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    toolCalls: row.toolCallsJson ?? null,
    reasoning: row.reasoning,
    createdAt: row.createdAt
  };
}

/** ChatMessage 行 → Harness InternalMessage（标记 persisted，供落库跳过 + 上下文回放） */
function rowToInternalMessage(row: StoredChatMessage): InternalMessage {
  if (row.role === 'assistant') {
    return {
      role: 'assistant',
      content: row.content,
      _source: 'persisted',
      ...(Array.isArray(row.toolCalls) ? { tool_calls: row.toolCalls } : {}),
      ...(row.reasoning ? { reasoning_content: row.reasoning } : {})
    } as InternalMessage;
  }

  if (row.role === 'tool') {
    const toolCallId =
      row.toolCalls && typeof row.toolCalls === 'object' && !Array.isArray(row.toolCalls)
        ? (row.toolCalls as Record<string, unknown>).toolCallId
        : undefined;
    return {
      role: 'tool',
      content: row.content ?? '',
      tool_call_id: typeof toolCallId === 'string' ? toolCallId : '',
      _source: 'persisted'
    } as InternalMessage;
  }

  return { role: 'user', content: row.content ?? '', _source: 'persisted' };
}

/** InternalMessage → ChatMessage 写入字段（仅本轮真实对话消息调用） */
function internalMessageToCreateData(
  message: InternalMessage
): Prisma.ChatMessageCreateManyInput | null {
  const content = messageContentText(message.content);

  if (message.role === 'assistant') {
    const toolCalls = (message as { tool_calls?: unknown }).tool_calls;
    const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0;
    if (!content && !hasToolCalls) {
      return null;
    }
    return {
      sessionId: '',
      role: 'assistant',
      content,
      toolCallsJson: hasToolCalls ? (toolCalls as Prisma.InputJsonValue) : Prisma.JsonNull,
      reasoning: message.reasoning_content ?? null
    };
  }

  if (message.role === 'tool') {
    const toolCallId = (message as { tool_call_id?: unknown }).tool_call_id;
    return {
      sessionId: '',
      role: 'tool',
      content,
      toolCallsJson:
        typeof toolCallId === 'string' && toolCallId.length > 0
          ? ({ toolCallId } as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      reasoning: null
    };
  }

  if (!content) {
    return null;
  }
  return { sessionId: '', role: 'user', content, toolCallsJson: Prisma.JsonNull, reasoning: null };
}

function shouldPersist(message: InternalMessage): boolean {
  if (!PERSISTABLE_ROLES.has(message.role)) {
    return false;
  }
  const source = message._source;
  return !(typeof source === 'string' && PERSIST_EXCLUDE_SOURCES.has(source));
}

function deriveTitle(messages: InternalMessage[]): string | null {
  for (const message of messages) {
    if (message.role !== 'user') {
      continue;
    }
    const text = messageContentText(message.content)?.trim();
    if (text) {
      return text.length > TITLE_MAX_CHARS ? `${text.slice(0, TITLE_MAX_CHARS)}…` : text;
    }
  }
  return null;
}

export class ChatStore {
  /** 当前用户的会话列表（按更新时间倒序） */
  static async listSessions(userId: string): Promise<ChatSessionSummary[]> {
    return prisma.chatSession.findMany({
      where: { userId },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /** 新建会话（归属当前用户） */
  static async createSession(userId: string, title?: string): Promise<ChatSessionSummary> {
    return prisma.chatSession.create({
      data: { userId, title: title?.trim() || null },
      select: { id: true, title: true, createdAt: true, updatedAt: true }
    });
  }

  /** 删除会话（仅当前用户；级联删除其全部消息）。返回是否命中。 */
  static async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await prisma.chatSession.deleteMany({ where: { id: sessionId, userId } });
    return result.count > 0;
  }

  /** 校验会话归属，返回会话（含压缩基线）；不存在或非本人返回 null */
  static async getOwnedSession(
    userId: string,
    sessionId: string
  ): Promise<{ id: string; title: string | null; compactBaseline: CompactBaseline | null } | null> {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, title: true, compactBaselineJson: true }
    });
    if (!session) {
      return null;
    }
    return {
      id: session.id,
      title: session.title,
      compactBaseline: isCompactBaseline(session.compactBaselineJson)
        ? { summaryContent: session.compactBaselineJson.summaryContent, compactedAt: session.compactBaselineJson.compactedAt }
        : null
    };
  }

  /** 分页读取会话消息（只读展示；强制 userId 过滤防越权）。非本人/不存在返回 null（控制器映射 404）。 */
  static async getMessagesPage(
    userId: string,
    sessionId: string,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<ChatMessagePage | null> {
    const owned = await ChatStore.getOwnedSession(userId, sessionId);
    if (!owned) {
      return null;
    }

    const limit = options.limit && options.limit > 0 ? options.limit : HistoryConfig.messagesPageSize;
    const rows = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(options.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
      select: { id: true, role: true, content: true, toolCallsJson: true, reasoning: true, createdAt: true }
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      messages: page.map(mapRowToStored),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null
    };
  }

  /**
   * 组装已登录会话的上下文消息（历史 + 压缩基线，复刻前端 buildApiContextMessages 语义）。
   * 返回的消息均标记 _source='persisted'（落库跳过）。会话不存在或非本人时 throw（fail-fast）。
   */
  static async assembleContextMessages(
    userId: string,
    sessionId: string,
    options: ContextAssembleOptions = {}
  ): Promise<InternalMessage[]> {
    const owned = await ChatStore.getOwnedSession(userId, sessionId);
    if (!owned) {
      throw new Error('会话不存在或无权访问');
    }

    const rows = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, toolCallsJson: true, reasoning: true, createdAt: true }
    });
    const stored = rows.map(mapRowToStored);

    if (owned.compactBaseline) {
      const boundary = new Date(owned.compactBaseline.compactedAt).getTime();
      const tail = stored.filter((row) => row.createdAt.getTime() > boundary);
      return [
        { role: 'user', content: owned.compactBaseline.summaryContent, _source: 'persisted' },
        ...tail.map(rowToInternalMessage)
      ];
    }

    const count =
      options.messageHistoryCount && options.messageHistoryCount > 0
        ? options.messageHistoryCount
        : HistoryConfig.defaultMessageHistoryCount;
    return stored.slice(-count).map(rowToInternalMessage);
  }

  /**
   * 轮末单事务批量 append 本轮新消息（user/assistant/tool）；强制 userId 归属校验防越权写。
   * 跳过历史回放与系统/记忆/提醒/压缩产物。会话首条 user 消息顺带生成 title。
   */
  static async appendTurnMessages(
    userId: string,
    sessionId: string,
    messages: InternalMessage[]
  ): Promise<void> {
    const data = messages
      .filter(shouldPersist)
      .map(internalMessageToCreateData)
      .filter((row): row is Prisma.ChatMessageCreateManyInput => row !== null)
      .map((row) => ({ ...row, sessionId }));

    if (data.length === 0) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      const session = await tx.chatSession.findFirst({
        where: { id: sessionId, userId },
        select: { title: true }
      });
      if (!session) {
        throw new Error(`落库失败：会话不存在或无权访问 sessionId=${sessionId}`);
      }

      await tx.chatMessage.createMany({ data });

      const title = session.title ? null : deriveTitle(messages);
      await tx.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date(), ...(title ? { title } : {}) }
      });
    });
  }

  /** 自动/手动压缩后回写会话压缩基线（不能只发 SSE 给前端）；强制 userId 归属校验 */
  static async updateCompactBaseline(
    userId: string,
    sessionId: string,
    baseline: CompactBaseline
  ): Promise<void> {
    const result = await prisma.chatSession.updateMany({
      where: { id: sessionId, userId },
      data: { compactBaselineJson: baseline as unknown as Prisma.InputJsonValue }
    });
    if (result.count === 0) {
      throw new Error(`压缩基线回写失败：会话不存在或无权访问 sessionId=${sessionId}`);
    }
  }
}
