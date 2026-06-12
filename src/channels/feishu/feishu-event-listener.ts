import * as Lark from '@larksuiteoapi/node-sdk';
import { publishInbound } from '../../message-bus/inbound-queue.js';
import { Logger } from '../../utils/logger.js';
import type { FeishuReceiveMessageEvent } from './feishu-event.types.js';
import {
  FeishuInboundSkipError,
  normalizeFeishuInbound
} from './normalize-feishu-inbound.js';
import { getFeishuClient, initFeishuClient, resolveFeishuDomain } from './feishu-sdk.js';

type ChannelLinkStatus = 'connected' | 'disconnected' | 'skipped';

let wsClient: Lark.WSClient | null = null;
let linkStatus: ChannelLinkStatus = 'skipped';

export function getFeishuLinkStatus(): ChannelLinkStatus {
  return linkStatus;
}

function readFeishuCredentials(): { appId: string; appSecret: string } | null {
  const appId = process.env.FEISHU_APP_ID?.trim();
  const appSecret = process.env.FEISHU_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    return null;
  }
  return { appId, appSecret };
}

async function handleFeishuMessage(event: FeishuReceiveMessageEvent): Promise<void> {
  try {
    const envelope = normalizeFeishuInbound(event);
    await publishInbound(envelope);
  } catch (error: unknown) {
    if (error instanceof FeishuInboundSkipError) {
      Logger.debug('FEISHU', error.message);
      return;
    }
    Logger.error('FEISHU', '入站事件处理失败:', error);
  }
}

/**
 * 启动飞书 WSClient 长连接；未配置 FEISHU_APP_ID/SECRET 时跳过。
 * handler 仅 normalize + publishInbound，不 await Harness。
 */
export function startFeishuEventListener(): void {
  const credentials = readFeishuCredentials();
  if (!credentials) {
    linkStatus = 'skipped';
    Logger.info('FEISHU', '未配置 FEISHU_APP_ID/FEISHU_APP_SECRET，跳过飞书长连接');
    return;
  }

  if (wsClient) {
    Logger.warn('FEISHU', '飞书长连接已启动，跳过重复初始化');
    return;
  }

  const domain = resolveFeishuDomain();
  initFeishuClient({ ...credentials, domain });
  getFeishuClient();

  wsClient = new Lark.WSClient({
    appId: credentials.appId,
    appSecret: credentials.appSecret,
    domain
  });

  try {
    wsClient.start({
      eventDispatcher: new Lark.EventDispatcher({}).register({
        'im.message.receive_v1': (data: FeishuReceiveMessageEvent) => {
          void handleFeishuMessage(data);
        }
      })
    });
    linkStatus = 'connected';
    Logger.info('FEISHU', '飞书长连接已启动（im.message.receive_v1）');
  } catch (error: unknown) {
    linkStatus = 'disconnected';
    Logger.error('FEISHU', '飞书长连接启动失败:', error);
  }
}
