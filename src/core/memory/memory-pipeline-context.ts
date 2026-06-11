import {
  isHindsightMemoryConfigured,
  MemoryConfig,
  resolveSkipMemory
} from '../../config/feature-config.js';
import type { InternalMessage } from '../agent-harness/types.js';
import type { MemoryIdentityScope } from '../../types/channel.types.js';
import { resolveHindsightBankId } from './hindsight-memory-provider.js';

export interface MemoryPipelineContext {
  bankId: string;
  query: string;
  skipMemory: boolean;
  /** retain document_id 作用域；有值时按轮 append，避免重复整段 transcript */
  documentSessionId?: string;
}

/**
 * 身份作用域 → bankId；无稳定身份（Web 匿名 / 缺省）返回 undefined → 短路 recall/retain。
 * 新渠道：扩展 MemoryIdentityScope + 本 switch 即可，bankId 自动带渠道前缀。
 */
export function resolveMemoryBankId(scope?: MemoryIdentityScope): string | undefined {
  if (!scope) {
    return undefined;
  }
  switch (scope.channel) {
    case 'web':
      return scope.userId
        ? resolveHindsightBankId('web', `web:${scope.userId}`)
        : undefined;
    case 'feishu':
      return resolveHindsightBankId('feishu', `feishu:${scope.chatId}`);
    case 'dingtalk':
      return resolveHindsightBankId(
        'dingtalk',
        scope.robotCode
          ? `dingtalk:${scope.conversationId}:${scope.robotCode}`
          : `dingtalk:${scope.conversationId}`
      );
  }
}

/** Hindsight retain 推荐 JSON 对话数组元素 */
export interface RetainConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface RetainPayload {
  content: string;
  /** 首条保留消息的 ISO 时间，供 retain() timestamp */
  conversationStartedAt?: string;
}

function messageText(content: InternalMessage['content']): string {
  if (typeof content === 'string') {
    return content.trim();
  }
  return '';
}

function isRetainEligibleMessage(message: InternalMessage): boolean {
  if (message.role !== 'user' && message.role !== 'assistant') {
    return false;
  }
  if (message._source === 'reminder' || message._source === 'hook') {
    return false;
  }
  return messageText(message.content).length > 0;
}

function toRetainTurn(message: InternalMessage): RetainConversationTurn {
  const turn: RetainConversationTurn = {
    role: message.role as 'user' | 'assistant',
    content: messageText(message.content).slice(0, MemoryConfig.perMessageRetainMaxChars)
  };
  const timestamp = message._timestamp?.trim();
  if (timestamp) {
    turn.timestamp = timestamp;
  }
  return turn;
}

function buildRetainJson(
  messages: InternalMessage[],
  options?: { startIndex?: number }
): RetainPayload {
  const startIndex = options?.startIndex ?? 0;
  const turns: RetainConversationTurn[] = [];
  let serializedLength = 2; // []

  for (let i = startIndex; i < messages.length; i += 1) {
    const message = messages[i];
    if (!isRetainEligibleMessage(message)) {
      continue;
    }

    const turn = toRetainTurn(message);
    const turnJson = JSON.stringify(turn);
    const addedLength = turns.length === 0 ? turnJson.length : turnJson.length + 1;
    if (serializedLength + addedLength > MemoryConfig.sessionRetainMaxChars) {
      break;
    }

    turns.push(turn);
    serializedLength += addedLength;
  }

  return {
    content: JSON.stringify(turns),
    conversationStartedAt: turns[0]?.timestamp
  };
}

/** 取最近一条用户消息作为 recall query；无则使用通用 query */
export function extractRecallQuery(messages: InternalMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const text = messageText(messages[i]?.content);
    if (messages[i]?.role === 'user' && text.length > 0) {
      return text.slice(0, MemoryConfig.recallQueryMaxChars);
    }
  }
  return 'user preferences and project conventions';
}

/**
 * 会话结束 retain 摘要：仅 user/assistant 文本，跳过 tool/system/reminder
 */
export function buildSessionRetainSummary(messages: InternalMessage[]): RetainPayload {
  return buildRetainJson(messages);
}

/**
 * 本轮增量 retain：仅最后一条 user 及其后 assistant 回复（配合 document_id append）
 */
export function buildTurnRetainDelta(messages: InternalMessage[]): RetainPayload {
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== 'user' || !isRetainEligibleMessage(message)) {
      continue;
    }
    lastUserIndex = i;
    break;
  }
  if (lastUserIndex < 0) {
    return { content: '[]' };
  }

  return buildRetainJson(messages, { startIndex: lastUserIndex });
}

/** 有 documentSessionId 时优先增量；否则回退整段摘要 */
export function buildRetainContent(
  messages: InternalMessage[],
  documentSessionId?: string
): RetainPayload {
  if (documentSessionId?.trim()) {
    const delta = buildTurnRetainDelta(messages);
    if (delta.content !== '[]') {
      return delta;
    }
  }
  return buildSessionRetainSummary(messages);
}

export function resolveMemoryPipelineContext(
  messages: InternalMessage[],
  options: {
    skipMemory?: boolean;
    documentSessionId?: string;
    identityScope?: MemoryIdentityScope;
  }
): MemoryPipelineContext | undefined {
  const skipMemory = resolveSkipMemory(options.skipMemory);
  if (skipMemory || !isHindsightMemoryConfigured()) {
    return undefined;
  }

  const bankId = resolveMemoryBankId(options.identityScope);
  if (!bankId) {
    return undefined;
  }

  const documentSessionId = options.documentSessionId?.trim();

  return {
    bankId,
    query: extractRecallQuery(messages),
    skipMemory: false,
    ...(documentSessionId ? { documentSessionId } : {})
  };
}
