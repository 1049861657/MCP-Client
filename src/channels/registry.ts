import type { ChannelAdapter } from './types.js';
import type { ChannelId } from '../types/channel.types.js';

const adapters = new Map<ChannelId, ChannelAdapter>();

/** 注册渠道 Adapter（同 channel 覆盖） */
export function registerChannelAdapter(adapter: ChannelAdapter): void {
  adapters.set(adapter.channel, adapter);
}

/** 按 channel 获取 Adapter */
export function getChannelAdapter(channel: ChannelId): ChannelAdapter | undefined {
  return adapters.get(channel);
}
