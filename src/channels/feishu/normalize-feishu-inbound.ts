import {
  resolveEnableAutoCompact,
  resolveMaxToolCallRounds,
  ToolsConfig
} from '../../config/feature-config.js';
import type { ChatOptions, FeishuAgentMessageEnvelope } from '../../types/channel.types.js';
import { generateRequestId } from '../../utils/request-id.js';
import { buildFeishuSessionKey } from '../session-key.js';
import type { FeishuReceiveMessageEvent } from './feishu-event.types.js';

export class FeishuInboundSkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeishuInboundSkipError';
  }
}

function buildDefaultChatOptions(): ChatOptions {
  return {
    enableTools: ToolsConfig.enableMCPTools,
    enableParamValidation: ToolsConfig.enableParamValidation,
    enablePrompts: ToolsConfig.enablePrompts,
    maxToolCallRounds: resolveMaxToolCallRounds(undefined),
    enableAutoCompact: resolveEnableAutoCompact(undefined)
  };
}

function parseTextContent(content: string): string {
  const parsed = JSON.parse(content) as { text?: string };
  if (typeof parsed.text !== 'string' || parsed.text.length === 0) {
    throw new Error('飞书消息 content 缺少 text');
  }
  return parsed.text;
}

function stripMentionKeys(
  text: string,
  mentions: FeishuReceiveMessageEvent['message']['mentions']
): string {
  let result = text.trim();
  if (!mentions) {
    return result;
  }
  for (const mention of mentions) {
    result = result.replaceAll(mention.key, '').trim();
  }
  return result.trim();
}

function hasBotMention(
  mentions: FeishuReceiveMessageEvent['message']['mentions']
): boolean {
  return Boolean(mentions?.some((mention) => mention.mentioned_type === 'bot'));
}

function assertShouldProcess(event: FeishuReceiveMessageEvent): void {
  if (event.sender.sender_type === 'bot') {
    throw new FeishuInboundSkipError('跳过机器人消息');
  }

  const { chat_type: chatType, mentions } = event.message;
  if (chatType === 'group' && !hasBotMention(mentions)) {
    throw new FeishuInboundSkipError('群聊未 @ 机器人');
  }

  if (event.message.message_type !== 'text') {
    throw new FeishuInboundSkipError(`暂不支持消息类型: ${event.message.message_type}`);
  }
}

function resolveEventId(event: FeishuReceiveMessageEvent): string {
  const eventId = event.event_id?.trim();
  if (!eventId) {
    throw new Error('飞书事件缺少 event_id');
  }
  return eventId;
}

/**
 * 飞书 im.message.receive_v1 → AgentMessageEnvelope；应跳过的消息 throw FeishuInboundSkipError
 */
export function normalizeFeishuInbound(
  event: FeishuReceiveMessageEvent
): FeishuAgentMessageEnvelope {
  assertShouldProcess(event);

  const eventId = resolveEventId(event);
  const requestId = generateRequestId();
  const { message_id: messageId, chat_id: chatId } = event.message;
  const text = stripMentionKeys(parseTextContent(event.message.content), event.message.mentions);

  if (text.length === 0) {
    throw new FeishuInboundSkipError('消息文本为空');
  }

  return {
    id: requestId,
    source: 'feishu:im',
    type: 'agent.message.inbound',
    time: new Date().toISOString(),
    channel: 'feishu',
    sessionKey: buildFeishuSessionKey(chatId),
    channelMeta: {
      requestId,
      messageId,
      chatId
    },
    payload: {
      messages: [{ role: 'user', content: text }],
      chatOptions: buildDefaultChatOptions()
    },
    trace: {
      traceId: requestId,
      idempotencyKey: eventId
    }
  };
}
