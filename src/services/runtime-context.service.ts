import type { Request } from 'express';

import type { SessionUser } from '../lib/request-session.js';
import { resolveSessionUser } from '../lib/request-session.js';
import { resolveConfigUserId } from './seed-follow.service.js';

/**
 * HTTP/Bus 请求运行时主体。
 * userId：落库/会话；configUserId：配置/MCP/Provider 池键（guest 可走 seedFollow）。
 */
export interface RequestPrincipal {
  user: SessionUser | undefined;
  userId: string | undefined;
  configUserId: string | null;
}

const principalByRequest = new WeakMap<Request, RequestPrincipal>();

/** 每请求解析一次主体并缓存（高性能：避免同请求多次 getSession / seedFollow 查库） */
export async function resolvePrincipal(req: Request): Promise<RequestPrincipal> {
  const cached = principalByRequest.get(req);
  if (cached !== undefined) {
    return cached;
  }
  const user = await resolveSessionUser(req);
  const configUserId = await resolveConfigUserId({ requestUserId: user?.id });
  const principal: RequestPrincipal = {
    user,
    userId: user?.id,
    configUserId,
  };
  principalByRequest.set(req, principal);
  return principal;
}
