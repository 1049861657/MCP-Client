import type { AgentMessageEnvelopeSerialized, ChatOptions } from '../types/channel.types.js';
import type { InternalMessage } from '../core/agent-harness/types.js';

/** 仅保留非 undefined 字段，避免 chatStream 收到多余 undefined 入参 */
export function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    const value = obj[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export interface EnvelopeHarnessInput {
  messages: InternalMessage[];
  chatOptions: Partial<ChatOptions>;
}

/** 入队 Envelope → Harness / AiProvider 入参 */
export function envelopeToHarnessInput(
  envelope: AgentMessageEnvelopeSerialized
): EnvelopeHarnessInput {
  return {
    messages: envelope.payload.messages,
    chatOptions: pickDefined((envelope.payload.chatOptions ?? {}) as Record<string, unknown>) as Partial<ChatOptions>
  };
}
