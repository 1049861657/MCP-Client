import {
  resolveEnableAutoCompact,
  resolveMaxToolCallRounds,
  ToolsConfig
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

function buildChatOptions(body: Record<string, unknown>): ChatOptions {
  const enableTools =
    typeof body.enableTools === 'boolean' ? body.enableTools : ToolsConfig.enableMCPTools;
  const enableParamValidation =
    typeof body.enableParamValidation === 'boolean'
      ? body.enableParamValidation
      : ToolsConfig.enableParamValidation;
  const enablePrompts =
    typeof body.enablePrompts === 'boolean' ? body.enablePrompts : ToolsConfig.enablePrompts;

  const options: ChatOptions = {
    enableTools,
    enableParamValidation,
    enablePrompts,
    maxToolCallRounds: resolveMaxToolCallRounds(body.maxToolCallRounds),
    enableAutoCompact: resolveEnableAutoCompact(body.enableAutoCompact)
  };

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

  return options;
}

/**
 * Web 入站：HTTP body + requestId + AbortSignal → AgentMessageEnvelope
 */
export function normalizeWebInbound(input: WebInboundInput): WebAgentMessageEnvelope {
  const { body, requestId, abortSignal } = input;
  const messages = resolveMessages(body);
  const vendor = typeof body.vendor === 'string' ? body.vendor : undefined;

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
      chatOptions: buildChatOptions(body)
    },
    trace: {
      traceId: requestId,
      idempotencyKey: requestId
    }
  };
}
