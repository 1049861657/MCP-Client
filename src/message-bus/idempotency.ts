import {
  buildIdempotencyRedisKey,
  IDEMPOTENCY_TTL_SECONDS
} from './queue-names.js';
import { getIdempotencyRedisConnection } from './redis-connection.js';

/**
 * 尝试占用幂等键（SET NX EX 24h）。
 * @returns true 表示首次请求可入队；false 表示重复应跳过
 */
export async function tryAcquireIdempotency(idempotencyKey: string): Promise<boolean> {
  const redis = getIdempotencyRedisConnection();
  const key = buildIdempotencyRedisKey(idempotencyKey);
  const result = await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL_SECONDS, 'NX');
  return result === 'OK';
}

/** 测试专用：释放幂等键 */
export async function releaseIdempotency(idempotencyKey: string): Promise<void> {
  const redis = getIdempotencyRedisConnection();
  await redis.del(buildIdempotencyRedisKey(idempotencyKey));
}
