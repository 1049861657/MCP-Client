import type { ChunkResponse, InternalMessage, UsageInfo } from '../core/agent-harness/types.js';

/** T1 支持的渠道标识（当前仅 web） */
export type ChannelId = 'web';

/** 入站 Envelope CloudEvents 核心字段 */
export interface AgentEnvelopeCore {
  id: string;
  source: string;
  type: string;
  time: string;
}

/** Web 入站 channelMeta（序列化 JSON，不含 abortSignal） */
export interface WebChannelMetaSerialized {
  requestId: string;
  vendor?: string;
}

/** Web 入站 channelMeta（进程内 runtime，含 AbortSignal） */
export interface WebChannelMeta extends WebChannelMetaSerialized {
  abortSignal?: AbortSignal;
}

/** 聊天选项（全部可选，Worker 侧 pickDefined 透传） */
export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableTools?: boolean;
  enableParamValidation?: boolean;
  enablePrompts?: boolean;
  maxToolCallRounds?: number;
  enableAutoCompact?: boolean;
  compactModel?: string;
}

/** 入站 payload */
export interface AgentInboundPayload {
  messages: InternalMessage[];
  chatOptions?: ChatOptions;
}

/** 分布式追踪与幂等 */
export interface AgentTrace {
  traceId: string;
  idempotencyKey: string;
}

/** 入站 Envelope（Web，进程内 runtime） */
export interface AgentMessageEnvelope extends AgentEnvelopeCore {
  source: 'web:api';
  type: 'agent.message.inbound';
  channel: 'web';
  sessionKey: string;
  channelMeta: WebChannelMeta;
  payload: AgentInboundPayload;
  trace: AgentTrace;
}

/** 入队 JSON 形态（不含 abortSignal） */
export interface AgentMessageEnvelopeSerialized extends Omit<AgentMessageEnvelope, 'channelMeta'> {
  channelMeta: WebChannelMetaSerialized;
}

/** 出站 kind */
export type AgentOutboundKind =
  | 'chunk'
  | 'context_compacted'
  | 'usage'
  | 'done'
  | 'error';

/** context_compacted 出站 payload */
export interface ContextCompactedPayload {
  summaryContent?: string;
}

/** usage 出站 payload（与 ai.controller chatStream 一致） */
export interface UsageOutboundPayload extends UsageInfo {
  requestId: string;
  elapsedTime: string;
  hasReasoning: boolean;
  hasTool: boolean;
}

/** done 出站 payload */
export interface DoneOutboundPayload {
  requestId: string;
  finish_reason?: string;
}

/** error 出站 payload */
export interface ErrorOutboundPayload {
  requestId: string;
  error: string;
}

/** 出站 payload 联合（按 kind 区分） */
export type AgentOutboundPayload =
  | ChunkResponse
  | ContextCompactedPayload
  | UsageOutboundPayload
  | DoneOutboundPayload
  | ErrorOutboundPayload;

/** 出站 Envelope（Web → SSE） */
export interface AgentOutboundEnvelope {
  sessionKey: string;
  channel: 'web';
  requestId: string;
  kind: AgentOutboundKind;
  payload: AgentOutboundPayload;
}
