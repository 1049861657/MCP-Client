import type { AgentMessageEnvelopeSerialized } from '../types/channel.types.js';
import { Logger } from '../utils/logger.js';

/** 入队/出队日志公共字段 */
export function formatInboundLogFields(envelope: AgentMessageEnvelopeSerialized): string {
  return [
    `traceId=${envelope.trace.traceId}`,
    `sessionKey=${envelope.sessionKey}`,
    `channel=${envelope.channel}`,
    `requestId=${envelope.channelMeta.requestId}`
  ].join(' ');
}

/** 入队日志（T1-02-04） */
export function logInboundEnqueue(envelope: AgentMessageEnvelopeSerialized): void {
  Logger.info('BUS', `inbound enqueue ${formatInboundLogFields(envelope)}`);
}

/** Worker 出队日志（T1-02-04） */
export function logInboundDequeue(envelope: AgentMessageEnvelopeSerialized): void {
  Logger.info('BUS', `inbound dequeue ${formatInboundLogFields(envelope)}`);
}
