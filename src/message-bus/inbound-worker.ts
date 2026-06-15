import type {
  AgentMessageEnvelopeSerialized,
  DingtalkAgentMessageEnvelopeSerialized,
  FeishuAgentMessageEnvelopeSerialized,
  WebAgentMessageEnvelopeSerialized
} from '../types/channel.types.js';
import {
  isDingtalkInboundEnvelope,
  isFeishuInboundEnvelope,
  isWebInboundEnvelope
} from '../types/channel.types.js';
import type { ChunkResponse } from '../core/agent-harness/types.js';
import { envelopeToHarnessInput } from '../channels/envelope-mapper.js';
import { resolvePermissionSessionKey } from '../channels/session-key.js';
import { resolveProfile } from '../config-plane/profile-resolver.js';
import { McpConnectionService } from '../services/mcp-connection.service.js';
import { getDingtalkChannelAdapter } from '../channels/dingtalk/dingtalk-channel.adapter.js';
import { getFeishuChannelAdapter } from '../channels/feishu/feishu-channel.adapter.js';
import { getWebChannelAdapter } from '../channels/web/web-channel.adapter.js';
import { getProviderForUser } from '../providers/ai-providers.js';
import { AiProvider } from '../providers/ai-provider.js';
import { logInboundDequeue } from './inbound-log.js';
import { Logger } from '../utils/logger.js';
import { getOutboundSink } from './outbound-sink-registry.js';
import { outboundRouter } from './outbound-router.js';

const INBOUND_AI_UNAVAILABLE_MESSAGE =
  '当前渠道绑定的账号未配置可用的 AI 供应商，请联系管理员。';

function routeInboundError(
  envelope: AgentMessageEnvelopeSerialized,
  requestId: string,
  error: string
): void {
  outboundRouter.route({
    sessionKey: envelope.sessionKey,
    channel: envelope.channel,
    requestId,
    kind: 'error',
    payload: { requestId, error }
  });
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === 'AbortError' || error.name === 'APIUserAbortError';
}

function endResponseOnAbort(requestId: string): void {
  const sink = getOutboundSink(requestId);
  if (!sink || sink.response.writableEnded) {
    return;
  }
  sink.clearKeepAlive?.();
  sink.response.end();
}

function routeContextCompacted(
  envelope: AgentMessageEnvelopeSerialized,
  chunk: ChunkResponse
): void {
  const payload =
    typeof chunk.summaryContent === 'string' && chunk.summaryContent.length > 0
      ? { summaryContent: chunk.summaryContent }
      : {};
  outboundRouter.route({
    sessionKey: envelope.sessionKey,
    channel: envelope.channel,
    requestId: envelope.channelMeta.requestId,
    kind: 'context_compacted',
    payload
  });
}

async function runHarnessForEnvelope(
  envelope: AgentMessageEnvelopeSerialized,
  requestId: string,
  signal?: AbortSignal
): Promise<void> {
  const resolved = await resolveProfile(envelope);
  const vendor = resolved.vendor ?? envelope.channelMeta.vendor;
  logInboundDequeue(envelope, {
    profileId: resolved.profileId,
    vendor: vendor ?? 'default',
    mcpCount: resolved.mcpServerIds.length,
    permissionMode: resolved.permissionMode
  });

  // T4-06-04/T4-07: per-user Provider 实例；guest 跟随 seedFollowUserId
  const configUserId = resolved.configUserId ?? null;
  const service = await getProviderForUser(configUserId, vendor ?? undefined);
  if (!service) {
    Logger.warn('BUS', `Inbound Worker 跳过：无可用 AI 服务 requestId=${requestId}`);
    routeInboundError(envelope, requestId, INBOUND_AI_UNAVAILABLE_MESSAGE);
    return;
  }

  const { messages } = envelopeToHarnessInput(envelope);
  const wallStarted = Date.now();
  McpConnectionService.beginChatScope(configUserId, requestId);

  try {
    const result = await service.chatStream(
      messages,
    (chunk, done) => {
      if (done || signal?.aborted) {
        return;
      }
      if (envelope.channel === 'web') {
        const sink = getOutboundSink(requestId);
        if (!sink || sink.response.writableEnded) {
          return;
        }
      }
      if (chunk.contextCompacted) {
        routeContextCompacted(envelope, chunk);
        return;
      }
      outboundRouter.route({
        sessionKey: envelope.sessionKey,
        channel: envelope.channel,
        requestId,
        kind: 'chunk',
        payload: chunk
      });
    },
    resolved.model,
    resolved.temperature,
    resolved.maxTokens,
    resolved.enableTools,
    resolved.enablePrompts,
    signal,
    resolved.maxToolCallRounds,
    requestId,
    resolved.enableAutoCompact,
    resolved.compactModel,
    resolved,
    {
      channel: envelope.channel,
      sessionKey: resolvePermissionSessionKey(envelope),
      permissionMode: resolved.permissionMode
    }
  );

    if (signal?.aborted) {
      return;
    }
    if (envelope.channel === 'web') {
      const sink = getOutboundSink(requestId);
      if (!sink || sink.response.writableEnded) {
        return;
      }
    }

    const elapsedTime = (Date.now() - wallStarted) / 1000;
    outboundRouter.route({
      sessionKey: envelope.sessionKey,
      channel: envelope.channel,
      requestId,
      kind: 'usage',
      payload: {
        requestId,
        ...result.usage,
        elapsedTime: elapsedTime.toFixed(2),
        hasReasoning: !!result.reasoning_content,
        hasTool: Boolean(result.tool_calls && result.tool_calls.length > 0)
      }
    });
    outboundRouter.route({
      sessionKey: envelope.sessionKey,
      channel: envelope.channel,
      requestId,
      kind: 'done',
      payload: {
        requestId,
        finish_reason: result.finish_reason
      }
    });
  } finally {
    await McpConnectionService.releaseChatScope(configUserId, requestId);
  }
}

async function processWebInboundJob(
  envelope: WebAgentMessageEnvelopeSerialized
): Promise<void> {
  const requestId = envelope.channelMeta.requestId;
  const webAdapter = getWebChannelAdapter();

  try {
    const sink = getOutboundSink(requestId);
    if (!sink) {
      return;
    }
    if (sink.abortController.signal.aborted) {
      return;
    }

    await runHarnessForEnvelope(envelope, requestId, sink.abortController.signal);
  } catch (error: unknown) {
    const sink = getOutboundSink(requestId);
    if (sink?.abortController.signal.aborted || isAbortError(error)) {
      endResponseOnAbort(requestId);
      return;
    }
    const errMessage = error instanceof Error ? error.message : String(error);
    Logger.error('BUS', `Inbound Worker 处理失败 requestId=${requestId}:`, error);
    if (sink && !sink.response.writableEnded) {
      routeInboundError(envelope, requestId, errMessage);
    }
  } finally {
    webAdapter.unregisterSink(requestId);
  }
}

async function processFeishuInboundJob(
  envelope: FeishuAgentMessageEnvelopeSerialized
): Promise<void> {
  const { requestId, messageId, chatId } = envelope.channelMeta;
  const feishuAdapter = getFeishuChannelAdapter();
  feishuAdapter.beginReply(requestId, messageId, chatId);

  try {
    await runHarnessForEnvelope(envelope, requestId);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    Logger.error('BUS', `Inbound Worker 飞书处理失败 requestId=${requestId}:`, error);
    routeInboundError(envelope, requestId, errMessage);
  } finally {
    feishuAdapter.endReply(requestId);
  }
}

async function processDingtalkInboundJob(
  envelope: DingtalkAgentMessageEnvelopeSerialized
): Promise<void> {
  const { requestId, ...meta } = envelope.channelMeta;
  const dingtalkAdapter = getDingtalkChannelAdapter();
  dingtalkAdapter.beginReply(requestId, { requestId, ...meta });

  try {
    await runHarnessForEnvelope(envelope, requestId);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    Logger.error('BUS', `Inbound Worker 钉钉处理失败 requestId=${requestId}:`, error);
    routeInboundError(envelope, requestId, errMessage);
  } finally {
    dingtalkAdapter.endReply(requestId);
  }
}

/** Inbound Worker：Envelope → Harness → OutboundRouter → 渠道 Adapter */
export async function processInboundJob(
  envelope: AgentMessageEnvelopeSerialized
): Promise<void> {
  if (isWebInboundEnvelope(envelope)) {
    await processWebInboundJob(envelope);
    return;
  }
  if (isFeishuInboundEnvelope(envelope)) {
    await processFeishuInboundJob(envelope);
    return;
  }
  if (isDingtalkInboundEnvelope(envelope)) {
    await processDingtalkInboundJob(envelope);
    return;
  }
  Logger.warn('BUS', `Inbound Worker 跳过未知 channel=${String((envelope as { channel?: string }).channel)}`);
}
