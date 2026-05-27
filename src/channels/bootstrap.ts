import { registerChannelAdapter } from './registry.js';
import { getWebChannelAdapter } from './web/web-channel.adapter.js';

/** 注册 Web 等渠道 Adapter（不含 MessageBus Worker 启动） */
export function startChannels(): void {
  registerChannelAdapter(getWebChannelAdapter());
}
