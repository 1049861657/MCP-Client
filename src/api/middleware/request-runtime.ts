import type { NextFunction, Request, Response } from 'express';

import { setApiPrivateNoStore, setApiPublicCache } from '../../lib/http-response.js';
import { resolveSessionUser } from '../../lib/request-session.js';

/**
 * 全 API 可选鉴权：解析 Cookie 会话并注入 req.user（不 401）。
 * 挂载于 /api 路由根，保证每请求至多一次 getSession。
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    const user = await resolveSessionUser(req);
    if (user) {
      req.user = user;
    }
  }
  next();
}

/**
 * /api 默认缓存策略：全部 private+no-store。
 * 新增接口无需再手工加禁缓存；仅全站静态只读 API 用 publicApiCache 白名单。
 */
export function defaultApiCachePolicy(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  setApiPrivateNoStore(res);
  next();
}

/** 白名单：与登录用户无关、全站相同内容的 GET（短 TTL 即可） */
export function publicApiCache(maxAgeSec: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    setApiPublicCache(res, maxAgeSec);
    next();
  };
}
