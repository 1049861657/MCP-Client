import type { WebOutboundSink } from '../channels/types.js';

const sinks = new Map<string, WebOutboundSink>();

/** 注册 Web SSE sink（同一 requestId 覆盖旧值） */
export function registerOutboundSink(requestId: string, sink: WebOutboundSink): void {
  sinks.set(requestId, sink);
}

/** 获取 sink；不存在返回 undefined */
export function getOutboundSink(requestId: string): WebOutboundSink | undefined {
  return sinks.get(requestId);
}

/** 注销 sink（幂等：不存在时不抛错） */
export function unregisterOutboundSink(requestId: string): void {
  sinks.delete(requestId);
}

/** 测试/诊断：当前注册数 */
export function outboundSinkCount(): number {
  return sinks.size;
}

/** 测试专用：清空 registry */
export function clearOutboundSinks(): void {
  sinks.clear();
}
