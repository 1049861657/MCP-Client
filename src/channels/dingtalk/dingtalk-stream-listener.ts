import { DWClient, TOPIC_ROBOT } from 'dingtalk-stream';
import { publishInbound } from '../../message-bus/inbound-queue.js';
import { Logger } from '../../utils/logger.js';
import {
  DingtalkInboundSkipError,
  normalizeDingtalkInbound
} from './normalize-dingtalk-inbound.js';
import type { DingtalkBotMessageDownstream } from './dingtalk-event.types.js';

let streamClient: DWClient | null = null;

function readDingtalkCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.DINGTALK_CLIENT_ID?.trim();
  const clientSecret = process.env.DINGTALK_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

function ackCallback(client: DWClient, downstream: DingtalkBotMessageDownstream): void {
  client.socketCallBackResponse(downstream.headers.messageId, { status: 'SUCCESS' });
}

async function handleDingtalkMessage(
  client: DWClient,
  downstream: DingtalkBotMessageDownstream
): Promise<void> {
  try {
    const envelope = normalizeDingtalkInbound(downstream);
    await publishInbound(envelope);
    ackCallback(client, downstream);
  } catch (error: unknown) {
    ackCallback(client, downstream);
    if (error instanceof DingtalkInboundSkipError) {
      Logger.debug('DINGTALK', error.message);
      return;
    }
    Logger.error('DINGTALK', '入站事件处理失败:', error);
  }
}

/**
 * 启动钉钉 Stream 长连接；未配置 DINGTALK_CLIENT_ID/SECRET 时跳过。
 * handler 仅 normalize + publishInbound，不 await Harness。
 */
export function startDingtalkStreamListener(): void {
  const credentials = readDingtalkCredentials();
  if (!credentials) {
    Logger.info('DINGTALK', '未配置 DINGTALK_CLIENT_ID/DINGTALK_CLIENT_SECRET，跳过钉钉 Stream');
    return;
  }

  if (streamClient) {
    Logger.warn('DINGTALK', '钉钉 Stream 已启动，跳过重复初始化');
    return;
  }

  streamClient = new DWClient({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret
  });

  streamClient.registerCallbackListener(TOPIC_ROBOT, (downstream: DingtalkBotMessageDownstream) => {
    void handleDingtalkMessage(streamClient as DWClient, downstream);
  });

  void streamClient.connect().catch((error: unknown) => {
    Logger.error('DINGTALK', '钉钉 Stream 连接失败:', error);
  });

  Logger.info('DINGTALK', '钉钉 Stream 已启动（/v1.0/im/bot/messages/get）');
}
