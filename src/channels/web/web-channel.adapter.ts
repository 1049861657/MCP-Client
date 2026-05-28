import type {
  AgentOutboundEnvelope,
  ContextCompactedPayload,
  DoneOutboundPayload,
  ErrorOutboundPayload,
  UsageOutboundPayload
} from '../../types/channel.types.js';
import type { ChunkResponse } from '../../core/agent-harness/types.js';
import {
  getOutboundSink,
  registerOutboundSink,
  unregisterOutboundSink
} from '../../message-bus/outbound-sink-registry.js';
import type { ChannelAdapter, WebOutboundSink } from '../types.js';

export class WebChannelAdapter implements ChannelAdapter {
  readonly channel = 'web' as const;

  registerSink(requestId: string, sink: WebOutboundSink): void {
    registerOutboundSink(requestId, sink);
  }

  unregisterSink(requestId: string): void {
    unregisterOutboundSink(requestId);
  }

  sendOutbound(envelope: AgentOutboundEnvelope): void {
    if (envelope.channel !== 'web') {
      return;
    }

    const sink = getOutboundSink(envelope.requestId);
    if (!sink || sink.response.writableEnded) {
      return;
    }

    const { response: res } = sink;

    switch (envelope.kind) {
      case 'chunk': {
        const chunk = envelope.payload as ChunkResponse;
        res.write(`data: ${JSON.stringify({ ...chunk, requestId: envelope.requestId })}\n\n`);
        break;
      }
      case 'context_compacted': {
        const payload = envelope.payload as ContextCompactedPayload;
        res.write(`event: context_compacted\ndata: ${JSON.stringify(payload)}\n\n`);
        break;
      }
      case 'usage': {
        const payload = envelope.payload as UsageOutboundPayload;
        res.write(`event: usage\ndata: ${JSON.stringify(payload)}\n\n`);
        break;
      }
      case 'done': {
        sink.clearKeepAlive?.();
        const payload = envelope.payload as DoneOutboundPayload;
        res.write(`event: done\ndata: ${JSON.stringify(payload)}\n\n`);
        res.end();
        break;
      }
      case 'error': {
        sink.clearKeepAlive?.();
        const payload = envelope.payload as ErrorOutboundPayload;
        res.write(`event: error\ndata: ${JSON.stringify(payload)}\n\n`);
        res.end();
        break;
      }
      default: {
        const _exhaustive: never = envelope.kind;
        return _exhaustive;
      }
    }
  }
}

let webChannelAdapter: WebChannelAdapter | null = null;

export function getWebChannelAdapter(): WebChannelAdapter {
  if (!webChannelAdapter) {
    webChannelAdapter = new WebChannelAdapter();
  }
  return webChannelAdapter;
}
