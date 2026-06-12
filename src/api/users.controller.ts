import type { Request, Response } from 'express';

import { SUPERADMIN_ROLE, USER_ROLE } from '../lib/auth.js';
import { hashPassword } from '../lib/password-hasher.js';
import { prisma } from '../lib/prisma.js';
import {
  getSeedFollowState,
  setSeedFollowUserId,
} from '../services/seed-follow.service.js';
import { Logger } from '../utils/logger.js';

const CREDENTIAL_PROVIDER_ID = 'credential';

function sendError(res: Response, status: number, error: string, details: string): void {
  res.status(status).json({ error, details });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function paramToString(value: string | string[] | undefined): string {
  if (value === undefined) {
    return '';
  }
  return Array.isArray(value) ? (value[0] ?? '') : value;
}

/** 用户管理（仅 SUPERADMIN，经 requireSuperAdmin 中间件门控）。角色仅门控用户管理，不限制配置修改。 */
export class UsersController {
  static async listUsers(_req: Request, res: Response): Promise<void> {
    try {
      const rows = await prisma.user.findMany({
        select: { id: true, username: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      res.json(rows);
    } catch (error: unknown) {
      sendError(res, 500, '获取用户列表失败', getErrorMessage(error));
    }
  }

  static async setRole(req: Request, res: Response): Promise<void> {
    const userId = paramToString(req.params.id);
    const role = (req.body as { role?: unknown })?.role;
    if (role !== SUPERADMIN_ROLE && role !== USER_ROLE) {
      sendError(res, 400, '参数无效', `role 仅允许 ${SUPERADMIN_ROLE} / ${USER_ROLE}`);
      return;
    }
    try {
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) {
        sendError(res, 404, '未找到', '用户不存在');
        return;
      }
      // 降级一名 SUPERADMIN 前，确保系统仍保留至少一名（防锁死），并禁止自降
      if (target.role === SUPERADMIN_ROLE && role === USER_ROLE) {
        if (req.user?.id === userId) {
          sendError(res, 403, '禁止操作', '不可降级自己的超级管理员角色');
          return;
        }
        const superadminCount = await prisma.user.count({ where: { role: SUPERADMIN_ROLE } });
        if (superadminCount <= 1) {
          sendError(res, 403, '禁止操作', '系统须保留至少一名超级管理员');
          return;
        }
      }
      await prisma.user.update({ where: { id: userId }, data: { role } });
      Logger.info('USERS', `用户 ${userId} 角色改为 ${role}`);
      res.json({ success: true });
    } catch (error: unknown) {
      sendError(res, 500, '修改角色失败', getErrorMessage(error));
    }
  }

  static async getSeedFollow(_req: Request, res: Response): Promise<void> {
    try {
      const state = await getSeedFollowState();
      res.json(state);
    } catch (error: unknown) {
      sendError(res, 500, '获取默认配置归属失败', getErrorMessage(error));
    }
  }

  static async setSeedFollow(req: Request, res: Response): Promise<void> {
    const userId = (req.body as { userId?: unknown })?.userId;
    if (userId !== null && (typeof userId !== 'string' || !userId.trim())) {
      sendError(res, 400, '参数无效', 'userId 须为字符串或 null');
      return;
    }
    try {
      await setSeedFollowUserId(userId === null ? null : userId.trim());
      const state = await getSeedFollowState();
      res.json({ success: true, ...state });
    } catch (error: unknown) {
      sendError(res, 500, '保存默认配置归属失败', getErrorMessage(error));
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    const userId = paramToString(req.params.id);
    const password = (req.body as { password?: unknown })?.password;
    if (typeof password !== 'string' || password.length < 8) {
      sendError(res, 400, '参数无效', '密码至少 8 位');
      return;
    }
    try {
      const account = await prisma.account.findFirst({
        where: { userId, providerId: CREDENTIAL_PROVIDER_ID },
      });
      if (!account) {
        sendError(res, 404, '未找到', '该用户无密码账号');
        return;
      }
      const hashed = await hashPassword(password);
      // 重置密码并吊销其全部登录会话（强制重新登录）
      await prisma.$transaction([
        prisma.account.update({ where: { id: account.id }, data: { password: hashed } }),
        prisma.session.deleteMany({ where: { userId } }),
      ]);
      Logger.info('USERS', `重置用户 ${userId} 密码并吊销其会话`);
      res.json({ success: true });
    } catch (error: unknown) {
      sendError(res, 500, '重置密码失败', getErrorMessage(error));
    }
  }
}
