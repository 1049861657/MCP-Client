/**
 * Web 渠道 sessionKey：T1 请求体无 sessionId，以 requestId 分区。
 * 将来 body 可选 sessionId 时再改为 web:{sessionId}。
 */
export function buildWebSessionKey(requestId: string): string {
  return `web:${requestId}`;
}
