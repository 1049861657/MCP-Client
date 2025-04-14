import { Request, Response } from 'express';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Logger } from '../utils/logger.js';
import { ProviderTypes } from '../config/app.config.js';
// 导入提供商重载功能
import { reloadProviders } from '../servers/openai.js';

// 获取当前目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取项目根目录
const projectRoot = join(__dirname, '..', '..');

// 配置文件路径 - 作为模块级变量而不是静态类属性
const PROVIDERS_CONFIG_PATH = join(projectRoot, 'config', 'ai-providers.json');

/**
 * 配置管理控制器
 */
export class SettingsController {
  /**
   * 获取AI提供商配置
   */
  static async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const configContent = readFileSync(PROVIDERS_CONFIG_PATH, 'utf-8');
      res.json(JSON.parse(configContent));
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
      
      // 保存到文件
      writeFileSync(PROVIDERS_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
      
      Logger.info('SETTINGS', '已更新AI提供商配置');
      res.json({ success: true, message: '提供商配置已更新' });
      
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