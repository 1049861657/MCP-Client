import { Logger } from '../utils/logger.js';
import type { AgentOutboundEnvelope } from '../types/channel.types.js';
import { getChannelAdapter } from '../channels/registry.js';
import type { OutboundRouter } from './types.js';

function routeOutbound(envelope: AgentOutboundEnvelope): void {
  const adapter = getChannelAdapter(envelope.channel);
  if (!adapter) {
    Logger.warn('BUS', `出站路由失败：未注册 channel=${envelope.channel}`);
    return;
  }
  adapter.sendOutbound(envelope);
}

/** 出站路由：按 channel 分发至 Adapter（T1 仅 web） */
export const outboundRouter: OutboundRouter = {
  route: routeOutbound
};
