import {
  resolveEnableAutoCompact,
  resolveMaxToolCallRounds
} from '../../config/feature-config.js';
import type { ChatOptions, WebAgentMessageEnvelope } from '../../types/channel.types.js';
import type { InternalMessage } from '../../core/agent-harness/types.js';
import { ChatStore } from '../../services/chat-store.service.js';
import { buildWebSessionKey } from '../session-key.js';

export interface WebInboundInput {
  body: Record<string, unknown>;
  requestId: string;
  abortSignal?: AbortSignal;
  /** 已登录用户 ID；有值走 authed 服务端组上下文（body 只带 sessionId + 新消息），缺省为 guest */
  userId?: string;
}

/** authed 上下文裁剪选项：messageHistoryCount 等本地设置随 body.contextOptions 上行 */
function resolveContextMessageCount(body: Record<string, unknown>): number | undefined {
  const contextOptions = body.contextOptions;
  if (typeof contextOptions !== 'object' || contextOptions === null) {
    return undefined;
  }
  const count = (contextOptions as Record<string, unknown>).messageHistoryCount;
  return typeof count === 'number' && count > 0 ? count : undefined;
}

function resolveMessages(body: Record<string, unknown>): InternalMessage[] {
  const messages = body.messages;
  const message = body.message;

  if (Array.isArray(messages) && messages.length > 0) {
    return messages as InternalMessage[];
  }

  if (typeof message === 'string' && message.length > 0) {
    return [{ role: 'user', content: message }];
  }

  throw new Error('缺少消息参数');
}

/** 仅映射请求体显式字段；Web MCP 见 resolveWebMcpServerIds */
function buildChatOptionsFromBody(body: Record<string, unknown>): ChatOptions | undefined {
  const options: ChatOptions = {};

  if (typeof body.enableTools === 'boolean') {
    options.enableTools = body.enableTools;
  }
  if (typeof body.enablePrompts === 'boolean') {
    options.enablePrompts = body.enablePrompts;
  }
  if (typeof body.maxToolCallRounds === 'number') {
    options.maxToolCallRounds = resolveMaxToolCallRounds(body.maxToolCallRounds);
  }
  if (typeof body.enableAutoCompact === 'boolean') {
    options.enableAutoCompact = resolveEnableAutoCompact(body.enableAutoCompact);
  }
  if (typeof body.model === 'string') {
    options.model = body.model;
  }
  if (typeof body.temperature === 'number') {
    options.temperature = body.temperature;
  }
  if (typeof body.maxTokens === 'number') {
    options.maxTokens = body.maxTokens;
  }
  if (typeof body.compactModel === 'string') {
    options.compactModel = body.compactModel;
  }
  if (Array.isArray(body.mcpServerIds)) {
    options.mcpServerIds = body.mcpServerIds.filter((id): id is string => typeof id === 'string');
  }
  if (Array.isArray(body.enabledToolNames)) {
    options.enabledToolNames = body.enabledToolNames.filter(
      (name): name is string => typeof name === 'string'
    );
  }
  if (Array.isArray(body.enabledSystemToolNames)) {
    options.enabledSystemToolNames = body.enabledSystemToolNames.filter(
      (name): name is string => typeof name === 'string'
    );
  }
  if (
    body.permissionMode === 'open' ||
    body.permissionMode === 'interactive' ||
    body.permissionMode === 'locked'
  ) {
    options.permissionMode = body.permissionMode;
  }
  if (typeof body.skipMemory === 'boolean') {
    options.skipMemory = body.skipMemory;
  }

  return Object.keys(options).length > 0 ? options : undefined;
}

/**
 * Web 入站：HTTP body + requestId + AbortSignal → AgentMessageEnvelope。
 * - guest：沿用现网，body messages[] 全量入队。
 * - authed：body 只带 sessionId + 新 user 消息；服务端单查询取历史 + 注入压缩基线组完整上下文。
 */
export async function normalizeWebInbound(
  input: WebInboundInput
): Promise<WebAgentMessageEnvelope> {
  const { body, requestId, abortSignal, userId } = input;
  const vendor = typeof body.vendor === 'string' ? body.vendor : undefined;
  const webChatSessionId =
    typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!webChatSessionId) {
    throw new Error('缺少 sessionId（Web 聊天会话标识）');
  }

  let messages: InternalMessage[];
  if (userId) {
    // authed 契约：body 只带新 user 消息（历史由服务端组装）。
    // 若误传 assistant/tool 历史则 fail-fast，避免历史被标 user 二次落库（双写）。
    const newMessages = resolveMessages(body);
    if (newMessages.some((message) => message.role !== 'user')) {
      throw new Error('已登录会话仅可上行新的 user 消息，历史由服务端组装');
    }
    // 新 user 消息标记 _source='user'（落库）；历史/基线由 ChatStore 标记 persisted（落库跳过）
    const taggedNew = newMessages.map<InternalMessage>((message) => ({
      ...message,
      _source: 'user'
    }));
    const context = await ChatStore.assembleContextMessages(userId, webChatSessionId, {
      messageHistoryCount: resolveContextMessageCount(body)
    });
    messages = [...context, ...taggedNew];
  } else {
    messages = resolveMessages(body);
  }

  const chatOptions = buildChatOptionsFromBody(body);

  return {
    id: requestId,
    source: 'web:api',
    type: 'agent.message.inbound',
    time: new Date().toISOString(),
    channel: 'web',
    sessionKey: buildWebSessionKey(requestId),
    channelMeta: {
      requestId,
      webChatSessionId,
      ...(vendor !== undefined ? { vendor } : {}),
      ...(userId !== undefined ? { userId } : {}),
      ...(abortSignal !== undefined ? { abortSignal } : {})
    },
    payload: {
      messages,
      ...(chatOptions !== undefined ? { chatOptions } : {})
    },
    trace: {
      traceId: requestId,
      idempotencyKey: requestId
    }
  };
}
