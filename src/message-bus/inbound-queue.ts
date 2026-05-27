import { Queue, Worker, type Job } from 'bullmq';
import type {
  AgentMessageEnvelope,
  AgentMessageEnvelopeSerialized
} from '../types/channel.types.js';
import { parseAgentMessageEnvelopeSerialized } from '../types/channel.schema.js';
import { Logger } from '../utils/logger.js';
import { tryAcquireIdempotency } from './idempotency.js';
import { prepareSerializedInbound } from './inbound-envelope.js';
import { logInboundDequeue, logInboundEnqueue } from './inbound-log.js';
import {
  INBOUND_JOB_NAME,
  INBOUND_QUEUE_NAME,
  REDIS_KEY_PREFIX
} from './queue-names.js';
import {
  getQueueConnectionOptions,
  getWorkerConnectionOptions
} from './redis-connection.js';

export type InboundJobHandler = (envelope: AgentMessageEnvelopeSerialized) => Promise<void>;

const INBOUND_ATTEMPTS = 3;
const INBOUND_BACKOFF_DELAY_MS = 1000;

let inboundQueue: Queue | null = null;
let inboundWorker: Worker<AgentMessageEnvelopeSerialized> | null = null;

function getOrCreateInboundQueue(): Queue {
  if (!inboundQueue) {
    inboundQueue = new Queue(INBOUND_QUEUE_NAME, {
      connection: getQueueConnectionOptions(),
      prefix: REDIS_KEY_PREFIX,
      defaultJobOptions: {
        attempts: INBOUND_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: INBOUND_BACKOFF_DELAY_MS
        },
        removeOnComplete: true,
        removeOnFail: true
      }
    });
  }
  return inboundQueue;
}

/**
 * 入站 Envelope 入队。
 * 幂等：Redis SET NX + BullMQ jobId 双保险；重复请求静默跳过。
 */
export async function publishInbound(envelope: AgentMessageEnvelope): Promise<void> {
  const idempotencyKey = envelope.trace.idempotencyKey;
  const acquired = await tryAcquireIdempotency(idempotencyKey);
  if (!acquired) {
    Logger.info(
      'BUS',
      `inbound skipped duplicate idempotencyKey=${idempotencyKey} requestId=${envelope.channelMeta.requestId}`
    );
    return;
  }

  const serialized = prepareSerializedInbound(envelope);
  logInboundEnqueue(serialized);

  const queue = getOrCreateInboundQueue();
  await queue.add(INBOUND_JOB_NAME, serialized, {
    jobId: idempotencyKey
  });
}

/**
 * 启动 Inbound Worker 订阅队列。
 * @returns Worker 实例（进程生命周期内保持）
 */
export function startInboundWorker(
  handler: InboundJobHandler,
  concurrency: number
): Worker<AgentMessageEnvelopeSerialized> {
  if (inboundWorker) {
    return inboundWorker;
  }

  inboundWorker = new Worker<AgentMessageEnvelopeSerialized>(
    INBOUND_QUEUE_NAME,
    async (job: Job<AgentMessageEnvelopeSerialized>) => {
      const envelope = parseAgentMessageEnvelopeSerialized(job.data);
      logInboundDequeue(envelope);
      await handler(envelope);
    },
    {
      connection: getWorkerConnectionOptions(),
      prefix: REDIS_KEY_PREFIX,
      concurrency
    }
  );

  inboundWorker.on('failed', (job, error) => {
    Logger.error(
      'BUS',
      `inbound job failed jobId=${job?.id ?? 'unknown'}: ${error.message}`
    );
  });

  Logger.info('BUS', `Inbound Worker started concurrency=${concurrency}`);
  return inboundWorker;
}

/** 测试 / 优雅关闭 */
export async function closeInboundMessageBus(): Promise<void> {
  if (inboundWorker) {
    await inboundWorker.close();
    inboundWorker = null;
  }
  if (inboundQueue) {
    await inboundQueue.close();
    inboundQueue = null;
  }
}
