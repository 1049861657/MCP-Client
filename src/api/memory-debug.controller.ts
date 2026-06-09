import type { Request, Response } from 'express';

import {
  debugPrompt,
  debugRecall,
  debugReflect,
  formatMemoryDebugError,
  getMemoryDebugMeta,
  MemoryDebugUnavailableError
} from '../core/memory/memory-debug.js';
import { Logger } from '../utils/logger.js';

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
  static getMeta(_req: Request, res: Response): void {
    res.json({
      success: true,
      ...getMemoryDebugMeta()
    });
  }

  static async recall(req: Request, res: Response): Promise<void> {
    try {
      const query = parseQueryBody(req.body);
      const payload = await debugRecall(query);
      res.json({ success: true, ...payload });
    } catch (error) {
      MemoryDebugController.sendError(res, 'recall', error);
    }
  }

  static async reflect(req: Request, res: Response): Promise<void> {
    try {
      const query = parseQueryBody(req.body);
      const payload = await debugReflect(query);
      res.json({ success: true, ...payload });
    } catch (error) {
      MemoryDebugController.sendError(res, 'reflect', error);
    }
  }

  static async prompt(req: Request, res: Response): Promise<void> {
    try {
      const query = parseQueryBody(req.body);
      const payload = await debugPrompt(query);
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
