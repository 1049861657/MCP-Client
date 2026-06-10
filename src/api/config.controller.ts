import { Request, Response } from 'express';
import { Logger } from '../utils/logger.js';
import {
  FeatureConfig,
  isHindsightMemoryConfigured,
  MemoryConfig
} from '../config/feature-config.js';
import { listSystemToolDescriptors } from '../core/agent-harness/system-tools/system-tool-registry.js';
import { ConfigService } from '../services/config.service.js';
import { QuickMessagesPayload } from '../types/config.types.js';

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
}
