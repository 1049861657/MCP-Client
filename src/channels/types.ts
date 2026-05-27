import type { Response } from 'express';
import type {
  AgentMessageEnvelope,
  AgentOutboundEnvelope,
  ChannelId
} from '../types/channel.types.js';

/** Web SSE 出站 sink（进程内，不入队） */
export interface WebOutboundSink {
  response: Response;
  abortController: AbortController;
  /** Controller 注册；done/error 时清除 SSE keep-alive */
  clearKeepAlive?: () => void;
}

/** 渠道适配器：出站写回 + sink 生命周期 */
export interface ChannelAdapter {
  readonly channel: ChannelId;
  sendOutbound(envelope: AgentOutboundEnvelope): void;
  registerSink(requestId: string, sink: WebOutboundSink): void;
  unregisterSink(requestId: string): void;
}

/** 入站端口：HTTP/IM 等外部输入 → Envelope（T1-03 实现 Web 侧） */
export interface InboundPort {
  toEnvelope(input: unknown): AgentMessageEnvelope;
}
