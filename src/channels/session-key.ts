import type { AgentMessageEnvelopeSerialized } from '../types/channel.types.js';
import { isWebInboundEnvelope } from '../types/channel.types.js';

/**
 * Web 渠道 sessionKey：T1 请求体无 sessionId，以 requestId 分区。
 */
export function buildWebSessionKey(requestId: string): string {
  return `web:${requestId}`;
}

/** Web 聊天页会话：权限「本会话始终允许」Redis 键（跨多轮 requestId） */
export function buildWebChatPermissionSessionKey(chatSessionId: string): string {
  return `web-chat:${chatSessionId}`;
}

/** 工具权限会话键：Web 必须带 body.sessionId；IM 用 envelope.sessionKey */
export function resolvePermissionSessionKey(
  envelope: AgentMessageEnvelopeSerialized
): string {
  if (isWebInboundEnvelope(envelope)) {
    const chatSessionId = envelope.channelMeta.webChatSessionId?.trim() ?? '';
    if (!chatSessionId) {
      throw new Error('Web 入站缺少 channelMeta.webChatSessionId（body.sessionId）');
    }
    return buildWebChatPermissionSessionKey(chatSessionId);
  }
  return envelope.sessionKey;
}

/** 飞书渠道 sessionKey：按 chat_id 分区多轮会话 */
export function buildFeishuSessionKey(chatId: string): string {
  return `feishu:${chatId}`;
}

/** 钉钉渠道 sessionKey：按 conversationId 分区多轮会话 */
export function buildDingtalkSessionKey(conversationId: string): string {
  return `dingtalk:${conversationId}`;
}
