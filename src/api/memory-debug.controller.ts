import type { Request, Response } from 'express';

import {
  debugPrompt,
  debugRecall,
  debugReflect,
  formatMemoryDebugError,
  getMemoryDebugMeta,
  MemoryDebugUnavailableError
} from '../core/memory/memory-debug.js';
import type { MemoryIdentityScope } from '../types/channel.types.js';
import { Logger } from '../utils/logger.js';
import { resolveOptionalUser } from './user-auth.js';

function parseQueryBody(body: unknown): string {
  if (!body || typeof body !== 'object') {
    throw new Error('请求体必须为 JSON 对象');
  }
  const query = (body as { query?: unknown }).query;
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('query 不能为空');
  }
  return query.trim();
}

export class MemoryDebugController {
  private static async resolveMemoryScope(req: Request): Promise<MemoryIdentityScope | undefined> {
    const user = await resolveOptionalUser(req);
    return user ? { channel: 'web', userId: user.id } : undefined;
  }

  static async getMeta(req: Request, res: Response): Promise<void> {
    const scope = await MemoryDebugController.resolveMemoryScope(req);
    res.json({
      success: true,
      ...getMemoryDebugMeta(scope)
    });
  }

  static async recall(req: Request, res: Response): Promise<void> {
    try {
      const query = parseQueryBody(req.body);
      const scope = await MemoryDebugController.resolveMemoryScope(req);
      const payload = await debugRecall(query, { scope });
      res.json({ success: true, ...payload });
    } catch (error) {
      MemoryDebugController.sendError(res, 'recall', error);
    }
  }

  static async reflect(req: Request, res: Response): Promise<void> {
    try {
      const query = parseQueryBody(req.body);
      const scope = await MemoryDebugController.resolveMemoryScope(req);
      const payload = await debugReflect(query, { scope });
      res.json({ success: true, ...payload });
    } catch (error) {
      MemoryDebugController.sendError(res, 'reflect', error);
    }
  }

  static async prompt(req: Request, res: Response): Promise<void> {
    try {
      const query = parseQueryBody(req.body);
      const scope = await MemoryDebugController.resolveMemoryScope(req);
      const payload = await debugPrompt(query, { scope });
      res.json({ success: true, ...payload });
    } catch (error) {
      MemoryDebugController.sendError(res, 'prompt', error);
    }
  }

  private static sendError(res: Response, action: string, error: unknown): void {
    if (error instanceof MemoryDebugUnavailableError) {
      res.status(503).json({
        success: false,
        error: error.message
      });
      return;
    }

    const message = formatMemoryDebugError(error);
    const status =
      error instanceof Error && message.includes('不能为空') ? 400 : 502;
    Logger.warn('MEMORY', `debug ${action} failed: ${message}`);
    res.status(status).json({
      success: false,
      error: message
    });
  }
}
