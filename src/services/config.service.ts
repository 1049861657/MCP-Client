/**
 * 配置服务
 * 已登录账号（userId 为具体 id）：仅读本账号覆盖行，无覆盖即空，不继承 null 基线。
 * guest / 未传 userId：读 userId=null 全局基线；guest 可经 seedFollow 解析到指定账号 id。
 */
import { ProviderType } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { AIProvidersConfigType, MCPConfigType, AIProvider, QuickMessage } from '../types/config.types.js';
import { McpConfigStore } from './mcp-config.store.js';
import { Logger } from '../utils/logger.js';

const QUICK_MESSAGE_CATEGORIES_KEY = 'quickMessageCategories';

export class ConfigService {
  /** 读取设置：已登录无行 → null；guest/未传 userId → null 基线 */
  static async getSetting(key: string, userId?: string): Promise<unknown | null> {
    try {
      if (userId) {
        const userRow = await prisma.setting.findFirst({ where: { userId, key } });
        if (userRow !== null) {
          return userRow.value ?? null;
        }
        return null;
      }
      const seedRow = await prisma.setting.findFirst({ where: { userId: null, key } });
      return seedRow?.value ?? null;
    } catch (error) {
      Logger.error('ConfigService', `获取设置失败 [${key}]:`, error);
      throw error;
    }
  }

  /** 写入设置（userId=null → seed；已登录用户写自己的覆盖行） */
  static async saveSetting(key: string, value: unknown, userId?: string): Promise<boolean> {
    const resolvedUserId = userId ?? null;
    try {
      // Prisma compound unique input 不接受 null，用 findFirst + create/update
      const existing = await prisma.setting.findFirst({ where: { userId: resolvedUserId, key } });
      if (existing) {
        await prisma.setting.update({ where: { id: existing.id }, data: { value: value as never } });
      } else {
        await prisma.setting.create({ data: { key, value: value as never, userId: resolvedUserId } });
      }
      return true;
    } catch (error) {
      Logger.error('ConfigService', `保存设置失败 [${key}]:`, error);
      throw error;
    }
  }

  /** 删除用户覆盖行（已登录账号恢复为「未配置」空态） */
  static async resetSetting(key: string, userId: string): Promise<void> {
    await prisma.setting.deleteMany({ where: { userId, key } });
  }

  private static async hasProviderOverride(userId: string): Promise<boolean> {
    const tombstone = await prisma.setting.findFirst({
      where: { userId, key: 'defaultProvider' },
    });
    return tombstone !== null;
  }

  /** 获取所有 AI 提供商：已登录无覆盖 → []；guest/未传 userId → null 基线 */
  static async getAllProviders(userId?: string): Promise<AIProvider[]> {
    try {
      let rows: Awaited<ReturnType<typeof prisma.aIProvider.findMany<{ include: { models: true } }>>>;
      if (userId) {
        if (await ConfigService.hasProviderOverride(userId)) {
          rows = await prisma.aIProvider.findMany({ where: { userId }, include: { models: true } });
        } else {
          return [];
        }
      } else {
        rows = await prisma.aIProvider.findMany({ where: { userId: null }, include: { models: true } });
      }

      if (rows.length === 0) {
        Logger.info('ConfigService', '数据库中没有AI提供商配置，返回空数组');
        return [];
      }

      return rows.map(provider => ({
        name: provider.name,
        type: provider.type as ProviderType,
        apiUrl: provider.apiUrl,
        apiKey: provider.apiKey,
        defaultModel: provider.defaultModel,
        models: provider.models.map(model => ({
          value: model.value,
          label: model.label
        }))
      }));
    } catch (error) {
      Logger.error('ConfigService', '获取所有提供商失败:', error);
      throw error;
    }
  }

  /** 获取 AI 提供商配置 */
  static async getAIProvidersConfig(userId?: string): Promise<AIProvidersConfigType> {
    try {
      const providers = await this.getAllProviders(userId);
      const defaultProviderName = await this.getSetting('defaultProvider', userId);
      return {
        providers,
        defaultProvider: defaultProviderName as string | null
      };
    } catch (error) {
      Logger.error('ConfigService', '获取AI提供商配置失败:', error);
      throw error;
    }
  }

  /** 保存 AI 提供商配置（替换该用户/seed 的全量行） */
  static async saveAIProvidersConfig(config: AIProvidersConfigType, userId?: string): Promise<boolean> {
    const resolvedUserId = userId ?? null;
    try {
      await this.saveSetting('defaultProvider', config.defaultProvider, userId);

      await prisma.aIProvider.deleteMany({ where: { userId: resolvedUserId } });

      for (const provider of config.providers) {
        await prisma.aIProvider.create({
          data: {
            userId: resolvedUserId,
            name: provider.name,
            type: provider.type,
            apiUrl: provider.apiUrl,
            apiKey: provider.apiKey,
            defaultModel: provider.defaultModel,
            models: {
              create: provider.models.map(model => ({
                value: model.value,
                label: model.label
              }))
            }
          }
        });
      }

      Logger.info('ConfigService', `AI提供商配置已保存 userId=${resolvedUserId}`);
      return true;
    } catch (error) {
      Logger.error('ConfigService', '保存AI提供商配置失败:', error);
      throw error;
    }
  }

  /** 删除用户 AI 提供商覆盖行（恢复未配置空态） */
  static async resetAIProvidersConfig(userId: string): Promise<void> {
    await prisma.aIProvider.deleteMany({ where: { userId } });
    await this.resetSetting('defaultProvider', userId);
  }

  /** 获取 MCP 配置（委托 McpConfigStore） */
  static async getMCPConfig(userId?: string): Promise<MCPConfigType> {
    return McpConfigStore.get(userId);
  }

  /** 全部已添加的 MCP 服务器（Admin 渠道配置用） */
  static async listConfiguredMcpServers(userId?: string): Promise<Array<{ serverId: string; name: string }>> {
    if (userId) {
      if (!(await McpConfigStore.hasUserOverride(userId))) {
        return [];
      }
      return prisma.mCPServer.findMany({
        where: { userId },
        select: { serverId: true, name: true },
        orderBy: { name: 'asc' }
      });
    }
    return prisma.mCPServer.findMany({
      where: { userId: null },
      select: { serverId: true, name: true },
      orderBy: { name: 'asc' }
    });
  }

  /** 保存 MCP 配置（委托 McpConfigStore） */
  static async saveMCPConfig(config: MCPConfigType, userId?: string): Promise<boolean> {
    await McpConfigStore.saveFull(config, userId);
    return true;
  }

  /** 删除用户 MCP 覆盖行（恢复未配置空态） */
  static async resetMCPConfig(userId: string): Promise<void> {
    await McpConfigStore.reset(userId);
  }

  static async getQuickMessageCategories(messages: QuickMessage[]): Promise<string[]> {
    const stored = await this.getSetting(QUICK_MESSAGE_CATEGORIES_KEY);
    const fromMessages = messages
      .map(msg => msg.category)
      .filter((category): category is string => typeof category === 'string' && category.trim().length > 0);
    const base = Array.isArray(stored)
      ? stored.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
    const merged = [...base];
    for (const category of fromMessages) {
      if (!merged.includes(category)) {
        merged.push(category);
      }
    }
    return merged;
  }

  static async getQuickMessagesConfig(): Promise<QuickMessage[]> {
    try {
      const messages = await prisma.quickMessage.findMany({ orderBy: { sortId: 'asc' } });
      return messages.map(msg => ({
        id: msg.id,
        sortId: msg.sortId,
        content: msg.content,
        result: msg.result,
        category: msg.category
      }));
    } catch (error) {
      Logger.error('ConfigService', '获取快捷消息配置失败:', error);
      throw error;
    }
  }
}
