import { Request, Response } from 'express';
import { AIProvidersConfig } from '../config/app.config.js';
import { Logger } from '../utils/logger.js';
import { FeatureConfig } from '../config/feature-config.js';

/**
 * 配置控制器类
 * 负责提供API配置相关的接口
 */
export class ConfigController {
  /**
   * 获取AI供应商配置
   * @param req 请求对象
   * @param res 响应对象
   */
  static async getAIProviders(req: Request, res: Response): Promise<void> {
    try {
      Logger.info('API', '请求AI供应商配置');
      res.json(AIProvidersConfig);
    } catch (error) {
      Logger.error('API', '获取AI供应商配置失败:', error);
      res.status(500).json({
        error: "获取配置失败",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
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
} 