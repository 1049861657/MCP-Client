import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';

import { auth } from './auth.js';

/** 登录态用户（Cookie 会话解析结果） */
export interface SessionUser {
  id: string;
  email: string;
  username: string | null;
  role: string | null;
}

/**
 * 解析当前请求的登录用户（每请求至多一次 getSession）。
 * requireAuth / optionalAuth 注入 req.user 后走快速路径。
 */
export async function resolveSessionUser(req: Request): Promise<SessionUser | undefined> {
  if (req.user) {
    return req.user;
  }
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) {
    return undefined;
  }
  const u = session.user;
  return { id: u.id, email: u.email, username: u.username ?? null, role: u.role ?? null };
}
