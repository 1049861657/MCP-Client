import type { Response } from 'express';

/**
 * 动态 API 默认策略（2026 业界共识：private + no-store，不靠 Vary: Cookie）。
 * - private：共享缓存（CDN/代理）不存
 * - no-store：浏览器也不持久化，避免跨账号 304 串数据
 * 参考：JSON API caching guides、Open WebUI 全局 CACHE_CONTROL=no-store
 */
export function setApiPrivateNoStore(res: Response): void {
  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.set({ etag: false });
}

/** 极少数全站一致的只读 API 白名单（显式 opt-in 才可缓存） */
export function setApiPublicCache(res: Response, maxAgeSec: number): void {
  res.setHeader('Cache-Control', `public, max-age=${maxAgeSec}, must-revalidate`);
  res.set({ etag: false });
}
