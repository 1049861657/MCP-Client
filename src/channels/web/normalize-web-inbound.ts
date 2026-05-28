import {
  resolveEnableAutoCompact,
  resolveMaxToolCallRounds
} from '../../config/feature-config.js';
import type { ChatOptions, WebAgentMessageEnvelope } from '../../types/channel.types.js';
import type { InternalMessage } from '../../core/agent-harness/types.js';
import { buildWebSessionKey } from '../session-key.js';

export interface WebInboundInput {
  body: Record<string, unknown>;
  requestId: string;
  abortSignal?: AbortSignal;
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

/** 仅映射请求体显式字段，供 Resolver 作 override；未传字段由 web Profile 补全 */
function buildChatOptionsFromBody(body: Record<string, unknown>): ChatOptions | undefined {
  const options: ChatOptions = {};

  if (typeof body.enableTools === 'boolean') {
    options.enableTools = body.enableTools;
  }
  if (typeof body.enableParamValidation === 'boolean') {
    options.enableParamValidation = body.enableParamValidation;
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

  return Object.keys(options).length > 0 ? options : undefined;
}

/**
 * Web 入站：HTTP body + requestId + AbortSignal → AgentMessageEnvelope
 */
export function normalizeWebInbound(input: WebInboundInput): WebAgentMessageEnvelope {
  const { body, requestId, abortSignal } = input;
  const messages = resolveMessages(body);
  const vendor = typeof body.vendor === 'string' ? body.vendor : undefined;

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
      ...(vendor !== undefined ? { vendor } : {}),
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
