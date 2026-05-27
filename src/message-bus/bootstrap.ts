import type { Worker } from 'bullmq';
import type { AgentMessageEnvelopeSerialized } from '../types/channel.types.js';
import { startInboundWorker } from './inbound-queue.js';
import { processInboundJob } from './inbound-worker.js';
import { resolveInboundWorkerConcurrency } from './queue-names.js';

/** 启动消息总线（Inbound Worker 订阅队列） */
export function startMessageBus(): Worker<AgentMessageEnvelopeSerialized> {
  const concurrency = resolveInboundWorkerConcurrency();
  return startInboundWorker(processInboundJob, concurrency);
}
