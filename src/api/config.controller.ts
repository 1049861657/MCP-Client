import { Request, Response } from 'express';
import { Logger } from '../utils/logger.js';
import {
  FeatureConfig,
  isHindsightMemoryConfigured,
  MemoryConfig
} from '../config/feature-config.js';
import { listSystemToolDescriptors } from '../core/agent-harness/system-tools/system-tool-registry.js';
import { ConfigService } from '../services/config.service.js';
import { QuickMessage, QuickMessagesPayload } from '../types/config.types.js';

function parseQuickMessagesBody(body: unknown): QuickMessagesPayload {
  if (!body || typeof body !== 'object') {
    throw new Error('请求体必须为 JSON 对象');
  }
  const { messages, categories } = body as { messages?: unknown; categories?: unknown };
  if (!Array.isArray(messages)) {
    throw new Error('messages 必须为数组');
  }
  if (!Array.isArray(categories)) {
    throw new Error('categories 必须为数组');
  }
  const normalizedCategories = categories.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  );
  return {
    messages: messages as QuickMessage[],
    categories: normalizedCategories,
  };
}

/**
 * 配置控制器类
 * 负责提供API配置相关的接口
 * 
 */
export class ConfigController {
  
  /**
   * 获取特性配置
   * @param req 请求对象
   * @param res 响应对象
   */
  static async getFeatureConfig(req: Request, res: Response): Promise<void> {
    try {
      Logger.info('API', '请求特性配置');
      const { memory: _memorySecret, ...publicFeatureConfig } = FeatureConfig;
      res.json({
        success: true,
        config: {
          ...publicFeatureConfig,
          memory: {
            enabled: isHindsightMemoryConfigured(),
            bankIdPrefix: MemoryConfig.bankIdPrefix
          },
          systemTools: listSystemToolDescriptors()
        }
      });
    } catch (error) {
      Logger.error('API', '获取特性配置失败:', error);
      res.status(500).json({
        error: "获取特性配置失败",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取快捷消息配置
   * @param req 请求对象
   * @param res 响应对象
   */
  static async getQuickMessages(req: Request, res: Response): Promise<void> {
    try {
      Logger.info('API', '请求快捷消息配置');
      const messages = await ConfigService.getQuickMessagesConfig();
      const categories = await ConfigService.getQuickMessageCategories(messages);
      res.json({ messages, categories } satisfies QuickMessagesPayload);
    } catch (error) {
      Logger.error('API', '获取快捷消息配置失败:', error);
      res.status(500).json({
        error: "获取快捷消息配置失败",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 保存快捷消息配置
   * @param req 请求对象
   * @param res 响应对象
   */
  static async saveQuickMessages(req: Request, res: Response): Promise<void> {
    try {
      const { messages, categories } = parseQuickMessagesBody(req.body);

      await ConfigService.saveQuickMessagesConfig(messages);
      await ConfigService.saveQuickMessageCategories(categories);
      
      res.json({ success: true, message: '配置已保存' });
    } catch (error) {
      Logger.error('API', '保存快捷消息配置失败:', error);
      res.status(500).json({
        success: false,
        error: "保存失败",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
