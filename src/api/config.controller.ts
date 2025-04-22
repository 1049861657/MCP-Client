import { Request, Response } from 'express';
import { Logger } from '../utils/logger.js';
import { FeatureConfig } from '../config/feature-config.js';
import { ConfigService } from '../services/config.service.js';

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
      res.json({
        success: true,
        config: FeatureConfig
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
      // 直接从数据库获取配置
      const config = await ConfigService.getQuickMessagesConfig();
      res.json(config);
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
      const data = req.body;
      
      // 基本验证：确保是数组
      if (!Array.isArray(data)) {
        throw new Error('数据格式无效');
      }
      
      // 直接保存到数据库
      await ConfigService.saveQuickMessagesConfig(data);
      
      // 返回成功响应
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