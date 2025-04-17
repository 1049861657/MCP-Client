import { Request, Response } from 'express';
import { Logger } from '../utils/logger.js';
import { ProviderTypes } from '../config/app.config.js';
// 导入提供商重载功能
import { reloadProviders } from '../servers/openai.js';
import { ConfigService } from '../services/config.service.js';

/**
 * 配置管理控制器
 */
export class SettingsController {
  /**
   * 获取AI提供商配置
   */
  static async getProviders(req: Request, res: Response): Promise<void> {
    try {
      // 从数据库获取配置
      const config = await ConfigService.getAIProvidersConfig();
      if (config) {
        res.json(config);
      } else {
        // 如果数据库中没有配置，返回空配置
        res.json({ providers: [], defaultProvider: '' });
      }
    } catch (error) {
      Logger.error('SETTINGS', '获取AI提供商配置失败:', error);
      res.status(500).json({
        error: '获取配置失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取提供商类型列表
   */
  static async getProviderTypes(req: Request, res: Response): Promise<void> {
    try {
      res.json(ProviderTypes);
    } catch (error) {
      Logger.error('SETTINGS', '获取提供商类型列表失败:', error);
      res.status(500).json({
        error: '获取提供商类型失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 更新AI提供商配置
   */
  static async updateProviders(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      // 基本验证
      if (!config || !config.providers || !Array.isArray(config.providers)) {
        res.status(400).json({ error: '无效的提供商配置' });
        return;
      }
      
      // 保存到数据库
      const success = await ConfigService.saveAIProvidersConfig(config);
      
      if (success) {
        Logger.info('SETTINGS', '已更新AI提供商配置到数据库');
        res.json({ success: true, message: '提供商配置已更新' });
      } else {
        throw new Error('保存配置失败');
      }
      
    } catch (error) {
      Logger.error('SETTINGS', '更新AI提供商配置失败:', error);
      res.status(500).json({
        error: '更新配置失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 重新加载AI提供商配置（无需重启服务器）
   */
  static async reloadProviders(req: Request, res: Response): Promise<void> {
    try {
      // 从数据库获取最新配置
      const config = await ConfigService.getAIProvidersConfig();
      
      // 调用提供商服务的重载方法
      const result = await reloadProviders();
      
      res.json({ 
        success: true, 
        message: '提供商配置已重新加载并应用', 
        providers: result.providers,
        default: result.default
      });
    } catch (error) {
      Logger.error('SETTINGS', '重新加载AI提供商配置失败:', error);
      res.status(500).json({
        error: '重新加载配置失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
} 