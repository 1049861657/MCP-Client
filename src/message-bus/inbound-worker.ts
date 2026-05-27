import type { AgentMessageEnvelopeSerialized } from '../types/channel.types.js';
import type { ChunkResponse } from '../core/agent-harness/types.js';
import { envelopeToHarnessInput } from '../channels/envelope-mapper.js';
import { getWebChannelAdapter } from '../channels/web/web-channel.adapter.js';
import { aiService, providerServices } from '../providers/ai-providers.js';
import { AiProvider } from '../providers/ai-provider.js';
import { Logger } from '../utils/logger.js';
import { getOutboundSink } from './outbound-sink-registry.js';
import { outboundRouter } from './outbound-router.js';

function resolveServiceForVendor(vendor?: string): AiProvider | undefined {
  if (vendor && providerServices[vendor]) {
    return providerServices[vendor];
  }
  if (vendor) {
    Logger.warn('BUS', `找不到供应商服务: ${vendor}，使用默认服务`);
  }
  return aiService;
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
    channel: 'web',
    requestId: envelope.channelMeta.requestId,
    kind: 'context_compacted',
    payload
  });
}

/** Inbound Worker：Envelope → Harness → OutboundRouter → SSE */
export async function processInboundJob(
  envelope: AgentMessageEnvelopeSerialized
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

    const service = resolveServiceForVendor(envelope.channelMeta.vendor);
    if (!service) {
      Logger.warn('BUS', `Inbound Worker 跳过：无可用 AI 服务 requestId=${requestId}`);
      return;
    }

    const { messages, chatOptions } = envelopeToHarnessInput(envelope);
    const signal = sink.abortController.signal;
    const wallStarted = Date.now();

    const result = await service.chatStream(
      messages,
      (chunk, done) => {
        if (done || signal.aborted || sink.response.writableEnded) {
          return;
        }
        if (chunk.contextCompacted) {
          routeContextCompacted(envelope, chunk);
          return;
        }
        outboundRouter.route({
          sessionKey: envelope.sessionKey,
          channel: 'web',
          requestId,
          kind: 'chunk',
          payload: chunk
        });
      },
      chatOptions.model,
      chatOptions.temperature,
      chatOptions.maxTokens,
      chatOptions.enableTools,
      chatOptions.enableParamValidation,
      chatOptions.enablePrompts,
      signal,
      chatOptions.maxToolCallRounds,
      requestId,
      chatOptions.enableAutoCompact,
      chatOptions.compactModel
    );

    if (signal.aborted || sink.response.writableEnded) {
      return;
    }

    const elapsedTime = (Date.now() - wallStarted) / 1000;
    outboundRouter.route({
      sessionKey: envelope.sessionKey,
      channel: 'web',
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
      channel: 'web',
      requestId,
      kind: 'done',
      payload: {
        requestId,
        finish_reason: result.finish_reason
      }
    });
  } catch (error: unknown) {
    const sink = getOutboundSink(requestId);
    if (sink?.abortController.signal.aborted || isAbortError(error)) {
      endResponseOnAbort(requestId);
      return;
    }
    const errMessage = error instanceof Error ? error.message : String(error);
    Logger.error('BUS', `Inbound Worker 处理失败 requestId=${requestId}:`, error);
    if (sink && !sink.response.writableEnded) {
      outboundRouter.route({
        sessionKey: envelope.sessionKey,
        channel: 'web',
        requestId,
        kind: 'error',
        payload: { requestId, error: errMessage }
      });
    }
  } finally {
    webAdapter.unregisterSink(requestId);
  }
}
