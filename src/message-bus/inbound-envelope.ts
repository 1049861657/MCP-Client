import type {
  AgentMessageEnvelope,
  AgentMessageEnvelopeSerialized
} from '../types/channel.types.js';
import { parseAgentMessageEnvelopeSerialized } from '../types/channel.schema.js';
import { tryAcquireIdempotency } from './idempotency.js';

/** runtime Envelope → 入队 JSON（剥离 abortSignal） */
export function serializeInboundEnvelope(
  envelope: AgentMessageEnvelope
): AgentMessageEnvelopeSerialized {
  const { requestId, vendor } = envelope.channelMeta;
  return {
    id: envelope.id,
    source: envelope.source,
    type: envelope.type,
    time: envelope.time,
    channel: envelope.channel,
    sessionKey: envelope.sessionKey,
    channelMeta: vendor !== undefined ? { requestId, vendor } : { requestId },
    payload: envelope.payload,
    trace: envelope.trace
  };
}

/** 入队前校验 */
export function prepareSerializedInbound(
  envelope: AgentMessageEnvelope
): AgentMessageEnvelopeSerialized {
  const serialized = serializeInboundEnvelope(envelope);
  return parseAgentMessageEnvelopeSerialized(serialized);
}
