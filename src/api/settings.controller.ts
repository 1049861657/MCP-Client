import { Request, Response } from 'express';
import { Logger } from '../utils/logger.js';
import { ProviderTypes } from '../config/app.config.js';
import { reloadAiProviders, invalidateProviderCache } from '../providers/ai-providers.js';
import { reloadMCPConfig } from '../core/mcp/index.js';
import { ConfigService } from '../services/config.service.js';
import { resolvePrincipal } from '../services/runtime-context.service.js';
import { ToolsConfig } from '../config/feature-config.js';
import {
  buildAssembledSystemPreview,
  buildSystemPromptSectionPreviews,
  type PromptPipelineOptions
} from '../core/agent-harness/prompt-pipeline.js';

export class SettingsController {
  /** 获取 AI 提供商配置（已登录无覆盖 → 空；guest 可走 seedFollow / null 基线） */
  static async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const { configUserId } = await resolvePrincipal(req);
      const config = await ConfigService.getAIProvidersConfig(configUserId ?? undefined);
      res.json(config ?? { providers: [], defaultProvider: '' });
    } catch (error) {
      Logger.error('SETTINGS', '获取AI提供商配置失败:', error);
      res.status(500).json({
        error: '获取配置失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

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

  /** 更新 AI 提供商配置（写入当前用户覆盖行） */
  static async updateProviders(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      if (!config || !config.providers || !Array.isArray(config.providers)) {
        res.status(400).json({ error: '无效的提供商配置' });
        return;
      }
      const userId = req.user!.id;
      const success = await ConfigService.saveAIProvidersConfig(config, userId);
      if (success) {
        // T4-06-04: 失效该用户的 Provider bucket 缓存
        invalidateProviderCache(userId);
        Logger.info('SETTINGS', `已更新AI提供商配置 userId=${userId}`);
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

  /** 恢复 AI 提供商为未配置空态（删除用户覆盖行） */
  static async resetProviders(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '未登录' });
      return;
    }
    try {
      await ConfigService.resetAIProvidersConfig(userId);
      // T4-06-04: 失效该用户的 Provider bucket 缓存
      invalidateProviderCache(userId);
      Logger.info('SETTINGS', `已重置AI提供商配置 userId=${userId}`);
      res.json({ success: true, message: '已恢复为默认提供商配置' });
    } catch (error) {
      Logger.error('SETTINGS', '重置AI提供商配置失败:', error);
      res.status(500).json({ error: '重置失败', details: error instanceof Error ? error.message : String(error) });
    }
  }

  /** 恢复 MCP 服务器列表为默认（删除用户覆盖行） */
  static async resetMCPServers(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '未登录' });
      return;
    }
    try {
      await ConfigService.resetMCPConfig(userId);
      await reloadMCPConfig(userId, 'all');
      Logger.info('SETTINGS', `已重置MCP服务器配置 userId=${userId}`);
      res.json({ success: true, message: '已恢复为默认MCP服务器配置' });
    } catch (error) {
      Logger.error('SETTINGS', '重置MCP服务器配置失败:', error);
      res.status(500).json({ error: '重置失败', details: error instanceof Error ? error.message : String(error) });
    }
  }

  static async reloadProviders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const result = await reloadAiProviders(userId);
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

  /** 获取工具提示词（已登录无覆盖 → 空） */
  static async getToolPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { configUserId } = await resolvePrincipal(req);
      const prompt = await ConfigService.getSetting('mcpToolPrompt', configUserId ?? undefined);
      res.json({ success: true, prompt });
    } catch (error: unknown) {
      Logger.error('API', '获取工具提示词失败:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  /** 保存工具提示词（写入当前用户覆盖行） */
  static async saveToolPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { prompt } = req.body;
      if (typeof prompt !== 'string') {
        res.status(400).json({ error: '提示词必须是字符串' });
        return;
      }
      const userId = req.user?.id;
      await ConfigService.saveSetting('mcpToolPrompt', prompt, userId);
      Logger.info('SETTINGS', `工具提示词保存成功 userId=${userId}`);
      res.json({ success: true, message: '工具提示词保存成功' });
    } catch (error: unknown) {
      Logger.error('API', '保存工具提示词失败:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  /** 恢复工具提示词为默认（删除用户覆盖行） */
  static async resetToolPrompt(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '未登录' });
      return;
    }
    try {
      await ConfigService.resetSetting('mcpToolPrompt', userId);
      res.json({ success: true, message: '已恢复为默认工具提示词' });
    } catch (error: unknown) {
      Logger.error('SETTINGS', '重置工具提示词失败:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  /** System Prompt 分段预览（P1-04-04） */
  static async getSystemPromptSections(req: Request, res: Response): Promise<void> {
    try {
      const { configUserId } = await resolvePrincipal(req);
      const enableTools = req.query.enableTools !== 'false';
      const enablePrompts =
        req.query.enablePrompts !== 'false' && ToolsConfig.enablePrompts;
      const mcpServerIdsRaw = req.query.mcpServerIds;
      const mcpServerIds =
        typeof mcpServerIdsRaw === 'string' && mcpServerIdsRaw.length > 0
          ? mcpServerIdsRaw.split(',').map(s => s.trim()).filter(Boolean)
          : undefined;
      const toolPromptOverride =
        typeof req.query.toolPrompt === 'string'
          ? req.query.toolPrompt
          : undefined;
      const storedToolPrompt = String(
        (await ConfigService.getSetting('mcpToolPrompt', configUserId ?? undefined)) ?? ''
      );

      const options: PromptPipelineOptions = {
        enableTools,
        enablePrompts,
        toolPromptOverride,
        includeMemory: false,
        resolvedProfile:
          mcpServerIds && mcpServerIds.length > 0
            ? {
                profileId: 'preview',
                enableTools: true,
                enablePrompts,
                maxToolCallRounds: ToolsConfig.maxToolCallRounds,
                enableAutoCompact: false,
                model: '',
                temperature: 0,
                maxTokens: 0,
                mcpServerIds,
                toolPrompt: toolPromptOverride ?? storedToolPrompt,
                permissionMode: 'open',
                configUserId: configUserId ?? null
              }
            : undefined
      };

      const [sections, assembled] = await Promise.all([
        buildSystemPromptSectionPreviews(options),
        buildAssembledSystemPreview(options)
      ]);
      res.json({ success: true, sections, assembled });
    } catch (error: unknown) {
      Logger.error('SETTINGS', '获取 System Prompt 分段预览失败:', error);
      res.status(500).json({
        error: '获取分段预览失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
