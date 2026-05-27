/** 公司共享 Redis 实例 key 前缀（BullMQ prefix + 幂等 key） */
export const REDIS_KEY_PREFIX = 'mcp-client';

/** Inbound 队列逻辑名（BullMQ 内部会加 prefix） */
export const INBOUND_QUEUE_NAME = 'inbound';

export const DEFAULT_INBOUND_WORKER_CONCURRENCY = 5;

/** Inbound job 名称 */
export const INBOUND_JOB_NAME = 'agent.message.inbound';

/** 幂等 key TTL（秒） */
export const IDEMPOTENCY_TTL_SECONDS = 86400;

/**
 * 解析 Inbound Worker 并发数。
 * @throws 环境变量非法时
 */
export function resolveInboundWorkerConcurrency(): number {
  const raw = process.env.INBOUND_WORKER_CONCURRENCY;
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_INBOUND_WORKER_CONCURRENCY;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error(`Invalid INBOUND_WORKER_CONCURRENCY: ${raw}`);
  }
  return parsed;
}

/** 幂等 Redis key：`mcp-client:idem:{idempotencyKey}` */
export function buildIdempotencyRedisKey(idempotencyKey: string): string {
  return `${REDIS_KEY_PREFIX}:idem:${idempotencyKey}`;
}
