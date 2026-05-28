import { registerChannelAdapter } from './registry.js';
import { getDingtalkChannelAdapter } from './dingtalk/dingtalk-channel.adapter.js';
import { startDingtalkStreamListener } from './dingtalk/dingtalk-stream-listener.js';
import { getFeishuChannelAdapter } from './feishu/feishu-channel.adapter.js';
import { startFeishuEventListener } from './feishu/feishu-event-listener.js';
import { getWebChannelAdapter } from './web/web-channel.adapter.js';

/** 注册渠道 Adapter 并启动 IM 长连接（不含 MessageBus Worker 启动） */
export function startChannels(): void {
  registerChannelAdapter(getWebChannelAdapter());
  registerChannelAdapter(getFeishuChannelAdapter());
  registerChannelAdapter(getDingtalkChannelAdapter());
  startFeishuEventListener();
  startDingtalkStreamListener();
}
