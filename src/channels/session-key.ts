/**
 * Web 渠道 sessionKey：T1 请求体无 sessionId，以 requestId 分区。
 * 将来 body 可选 sessionId 时再改为 web:{sessionId}。
 */
export function buildWebSessionKey(requestId: string): string {
  return `web:${requestId}`;
}

/** 飞书渠道 sessionKey：按 chat_id 分区多轮会话 */
export function buildFeishuSessionKey(chatId: string): string {
  return `feishu:${chatId}`;
}

/** 钉钉渠道 sessionKey：按 conversationId 分区多轮会话 */
export function buildDingtalkSessionKey(conversationId: string): string {
  return `dingtalk:${conversationId}`;
}
