import { Request, Response } from 'express';
import { AIProvidersConfig, QuickMessagesConfig, reloadConfigAndUpdate } from '../config/app.config.js';
import { Logger } from '../utils/logger.js';
import { FeatureConfig } from '../config/feature-config.js';
import fs from 'fs';
import { getQuickMessagesConfigPath } from '../utils/path-util.js';

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

  /**
   * 获取快捷消息配置
   * @param req 请求对象
   * @param res 响应对象
   */
  static async getQuickMessages(req: Request, res: Response): Promise<void> {
    try {
      Logger.info('API', '请求快捷消息配置');
      res.json(QuickMessagesConfig);
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
      
      // 配置文件路径
      const configPath = getQuickMessagesConfigPath(import.meta.url);
      
      // 写入文件
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
      
      // 重新加载快捷消息配置
      reloadConfigAndUpdate('quick-messages.json', QuickMessagesConfig)
      
      Logger.info('API', '快捷消息配置已保存');
      
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