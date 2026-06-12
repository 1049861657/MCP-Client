import type { NextFunction, Request, Response } from 'express';

import { SUPERADMIN_ROLE } from '../lib/auth.js';
import { resolveSessionUser, type SessionUser } from '../lib/request-session.js';

/** @deprecated 使用 SessionUser；保留别名供存量 import */
export type AuthedUser = SessionUser;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

/**
 * 可选鉴权：解析到有效会话则返回用户，否则 undefined（不拦截）。
 * 通常已由 optionalAuth 中间件注入 req.user；此处走快速路径。
 */
export async function resolveOptionalUser(req: Request): Promise<SessionUser | undefined> {
  return resolveSessionUser(req);
}

/** 需登录：未携带有效会话 Cookie 返回 401，否则注入 req.user */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await resolveSessionUser(req);
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
  const user = await resolveSessionUser(req);
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
