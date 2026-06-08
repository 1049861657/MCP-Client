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

/** Worker 开始处理入站任务（T1-02-04） */
export function logInboundDequeue(
  envelope: AgentMessageEnvelopeSerialized,
  options?: { profileId?: string; vendor?: string; mcpCount?: number; permissionMode?: string }
): void {
  const extras: string[] = [];
  if (options?.profileId) {
    extras.push(`profileId=${options.profileId}`);
  }
  if (options?.vendor) {
    extras.push(`vendor=${options.vendor}`);
  }
  if (options?.mcpCount !== undefined) {
    extras.push(`mcpCount=${options.mcpCount}`);
  }
  if (options?.permissionMode) {
    extras.push(`permissionMode=${options.permissionMode}`);
  }
  const suffix = extras.length > 0 ? ` ${extras.join(' ')}` : '';
  Logger.info('BUS', `inbound processing ${formatInboundLogFields(envelope)}${suffix}`);
}
