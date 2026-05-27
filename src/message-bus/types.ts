import type { AgentMessageEnvelope, AgentOutboundEnvelope } from '../types/channel.types.js';

/** 消息总线：入站 Envelope 入队 */
export interface MessageBus {
  publishInbound(envelope: AgentMessageEnvelope): Promise<void>;
}

/** 出站路由：按 channel 分发至对应 Adapter */
export interface OutboundRouter {
  route(envelope: AgentOutboundEnvelope): void;
}
