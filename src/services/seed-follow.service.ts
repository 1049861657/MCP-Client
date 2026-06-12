import { SETTING_SEED_FOLLOW_USER_ID } from '../types/config-plane.types.js';
import { prisma } from '../lib/prisma.js';
import { Logger } from '../utils/logger.js';
import { ConfigService } from './config.service.js';

export interface SeedFollowState {
  userId: string | null;
  username: string | null;
}

/** 与 bootstrap-users 创建的初始体验账号一致 */
export const BOOTSTRAP_SEED_USERNAME = 'seed';

const SEED_FOLLOW_CACHE_TTL_MS = 30_000;

let seedFollowUserIdCache: { value: string | null; expiresAt: number } | null = null;

function invalidateSeedFollowCache(): void {
  seedFollowUserIdCache = null;
}

/** 读取 seedFollowUserId；账号已删则回退 null */
async function getSeedFollowUserId(): Promise<string | null> {
  const now = Date.now();
  if (seedFollowUserIdCache && seedFollowUserIdCache.expiresAt > now) {
    return seedFollowUserIdCache.value;
  }

  const raw = await ConfigService.getSetting(SETTING_SEED_FOLLOW_USER_ID);
  if (typeof raw !== 'string' || !raw.trim()) {
    seedFollowUserIdCache = { value: null, expiresAt: now + SEED_FOLLOW_CACHE_TTL_MS };
    return null;
  }
  const userId = raw.trim();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    Logger.warn('SEED_FOLLOW', `seedFollowUserId 指向已删除账号 ${userId}，回退 null 行`);
    seedFollowUserIdCache = { value: null, expiresAt: now + SEED_FOLLOW_CACHE_TTL_MS };
    return null;
  }
  seedFollowUserIdCache = { value: userId, expiresAt: now + SEED_FOLLOW_CACHE_TTL_MS };
  return userId;
}

/** 读取归属状态（含用户名，供管理端展示） */
export async function getSeedFollowState(): Promise<SeedFollowState> {
  const userId = await getSeedFollowUserId();
  if (!userId) {
    return { userId: null, username: null };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  return { userId, username: user?.username ?? null };
}

/**
 * 解析生效配置 userId。
 * 优先级：requestUserId（已登录）> boundUserId > seedFollowUserId > null seed
 */
export async function resolveConfigUserId(options: {
  requestUserId?: string;
  boundUserId?: string | null;
}): Promise<string | null> {
  if (options.requestUserId) {
    return options.requestUserId;
  }
  if (options.boundUserId) {
    return options.boundUserId;
  }
  return getSeedFollowUserId();
}

/** guest 匿名 GET 读配置：有归属则返回 followId，否则 undefined（走 null seed） */
export async function resolveGuestConfigUserId(): Promise<string | undefined> {
  const followId = await getSeedFollowUserId();
  return followId ?? undefined;
}

/**
 * 启动幂等：未配置或指向已删账号时，将默认配置归属设为 bootstrap seed 账号。
 * 超管已手动指定有效账号时不覆盖。
 */
export async function ensureSeedFollowDefault(): Promise<void> {
  const current = await getSeedFollowUserId();
  if (current) {
    return;
  }
  const seedUser = await prisma.user.findUnique({
    where: { username: BOOTSTRAP_SEED_USERNAME },
    select: { id: true },
  });
  if (!seedUser) {
    Logger.warn('SEED_FOLLOW', `bootstrap 账号 ${BOOTSTRAP_SEED_USERNAME} 不存在，跳过默认配置归属`);
    return;
  }
  await setSeedFollowUserId(seedUser.id);
  Logger.info('SEED_FOLLOW', `默认配置归属已初始化为 ${BOOTSTRAP_SEED_USERNAME}`);
}

/** 超管保存默认配置归属（唯一写入口）；userId=null 表示清空回退 seed 行 */
export async function setSeedFollowUserId(userId: string | null): Promise<void> {
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new Error('用户不存在');
    }
    await ConfigService.saveSetting(SETTING_SEED_FOLLOW_USER_ID, userId);
  } else {
    await prisma.setting.deleteMany({
      where: { userId: null, key: SETTING_SEED_FOLLOW_USER_ID },
    });
  }
  invalidateSeedFollowCache();
  Logger.info('SEED_FOLLOW', `默认配置归属已更新 userId=${userId ?? 'null'}`);
}
