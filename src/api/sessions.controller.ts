import type { Request, Response } from 'express';

import { ChatStore } from '../services/chat-store.service.js';
import { Logger } from '../utils/logger.js';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function paramToString(value: string | string[] | undefined): string {
  if (value === undefined) {
    return '';
  }
  return Array.isArray(value) ? (value[0] ?? '') : value;
}

/** 已登录会话与消息（经 requireAuth 注入 req.user；所有操作仅作用于当前用户自己的会话） */
export class SessionsController {
  static async listSessions(req: Request, res: Response): Promise<void> {
    try {
      const sessions = await ChatStore.listSessions(req.user!.id);
      res.json({ success: true, sessions });
    } catch (error: unknown) {
      Logger.error('SESSIONS', '获取会话列表失败:', error);
      res.status(500).json({ error: '获取会话列表失败', details: getErrorMessage(error) });
    }
  }

  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const title = typeof (req.body as { title?: unknown })?.title === 'string'
        ? (req.body as { title: string }).title
        : undefined;
      const session = await ChatStore.createSession(req.user!.id, title);
      res.status(201).json({ success: true, session });
    } catch (error: unknown) {
      Logger.error('SESSIONS', '创建会话失败:', error);
      res.status(500).json({ error: '创建会话失败', details: getErrorMessage(error) });
    }
  }

  static async deleteSession(req: Request, res: Response): Promise<void> {
    const sessionId = paramToString(req.params.id);
    try {
      const deleted = await ChatStore.deleteSession(req.user!.id, sessionId);
      if (!deleted) {
        res.status(404).json({ error: '未找到', details: '会话不存在或无权访问' });
        return;
      }
      res.json({ success: true });
    } catch (error: unknown) {
      Logger.error('SESSIONS', '删除会话失败:', error);
      res.status(500).json({ error: '删除会话失败', details: getErrorMessage(error) });
    }
  }

  static async getMessages(req: Request, res: Response): Promise<void> {
    const sessionId = paramToString(req.params.id);
    const cursorRaw = req.query.cursor;
    const limitRaw = req.query.limit;
    const cursor = typeof cursorRaw === 'string' && cursorRaw.length > 0 ? cursorRaw : undefined;
    const limit =
      typeof limitRaw === 'string' && Number.isInteger(Number(limitRaw)) ? Number(limitRaw) : undefined;
    try {
      const page = await ChatStore.getMessagesPage(req.user!.id, sessionId, { cursor, limit });
      if (!page) {
        res.status(404).json({ error: '未找到', details: '会话不存在或无权访问' });
        return;
      }
      res.json({ success: true, ...page });
    } catch (error: unknown) {
      Logger.error('SESSIONS', '获取会话消息失败:', error);
      res.status(500).json({ error: '获取会话消息失败', details: getErrorMessage(error) });
    }
  }
}
