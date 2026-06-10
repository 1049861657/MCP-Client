import { fromNodeHeaders } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';

import { auth, SUPERADMIN_ROLE } from '../lib/auth.js';

// 登录态用户（注入 req.user 供下游控制器读取，T4-06 配置 per-user 化据此分流）
export interface AuthedUser {
  id: string;
  email: string;
  username: string | null;
  role: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

async function resolveUser(req: Request): Promise<AuthedUser | undefined> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) {
    return undefined;
  }
  const u = session.user;
  return { id: u.id, email: u.email, username: u.username ?? null, role: u.role ?? null };
}

/** 需登录：未携带有效会话 Cookie 返回 401，否则注入 req.user */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await resolveUser(req);
  if (!user) {
    res.status(401).json({ error: '未登录', details: '请先登录' });
    return;
  }
  req.user = user;
  next();
}

/** 仅 SUPERADMIN：用户管理类接口门控（角色不限制配置修改，只门控用户管理） */
export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await resolveUser(req);
  if (!user) {
    res.status(401).json({ error: '未登录', details: '请先登录' });
    return;
  }
  if (user.role !== SUPERADMIN_ROLE) {
    res.status(403).json({ error: '无权限', details: '仅超级管理员可操作' });
    return;
  }
  req.user = user;
  next();
}
