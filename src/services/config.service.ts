/**
 * 配置服务
 * 负责从数据库实时读取和写入配置信息
 */
import { ProviderType } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { AIProvidersConfigType, MCPConfigType, AIProvider, QuickMessage } from '../types/config.types.js';
import { McpServerAuthService } from './mcp-server-auth.service.js';
import { Logger } from '../utils/logger.js';

const QUICK_MESSAGE_CATEGORIES_KEY = 'quickMessageCategories';

export class ConfigService {
  /**
   * 获取通用设置
   * @param key 设置键
   * @returns 设置值或null
   */
  static async getSetting(key: string): Promise<any | null> {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key }
      });
      return setting?.value || null;
    } catch (error) {
      Logger.error('ConfigService', `获取设置失败 [${key}]:`, error);
      throw error;
    }
  }

  /**
   * 保存通用设置
   * @param key 设置键
   * @param value 设置值
   * @returns 成功返回true，失败抛出异常
   */
  static async saveSetting(key: string, value: any): Promise<boolean> {
    try {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
      return true;
    } catch (error) {
      Logger.error('ConfigService', `保存设置失败 [${key}]:`, error);
      throw error;
    }
  }

  /**
   * 获取所有AI提供商
   * @returns 所有提供商配置
   */
  static async getAllProviders(): Promise<AIProvider[]> {
    try {
      const providers = await prisma.aIProvider.findMany({
        include: { models: true }
      });
      
      // 不再抛出异常，而是返回空数组
      if (providers.length === 0) {
        Logger.info('ConfigService', '数据库中没有AI提供商配置，返回空数组');
        return [];
      }
      
      return providers.map(provider => ({
        name: provider.name,
        type: provider.type as ProviderType,
        apiUrl: provider.apiUrl,
        apiKey: provider.apiKey,
        defaultModel: provider.defaultModelValue,
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

  /**
   * 获取AI提供商配置
   * @returns AI提供商配置
   */
  static async getAIProvidersConfig(): Promise<AIProvidersConfigType> {
    try {
      const providers = await this.getAllProviders();
      const defaultProviderName = await this.getSetting('defaultProvider');
      return {
        providers,
        defaultProvider: defaultProviderName
      };
    } catch (error) {
      Logger.error('ConfigService', '获取AI提供商配置失败:', error);
      throw error;
    }
  }

  /**
   * 保存AI提供商配置
   * @param config AI提供商配置
   * @returns 成功返回true，失败抛出异常
   */
  static async saveAIProvidersConfig(config: AIProvidersConfigType): Promise<boolean> {
    try {
      // 保存默认提供商设置
      await this.saveSetting('defaultProvider', config.defaultProvider);

      // 清空现有数据(级联删除会同时删除关联的AIModel)
      await prisma.aIProvider.deleteMany({});

      // 创建新数据
      for (const provider of config.providers) {
        await prisma.aIProvider.create({
          data: {
            name: provider.name,
            type: provider.type, 
            apiUrl: provider.apiUrl,
            apiKey: provider.apiKey,
            defaultModelValue: provider.defaultModel,
            models: {
              create: provider.models.map(model => ({
                value: model.value,
                label: model.label
              }))
            }
          }
        });
      }

      Logger.info('ConfigService', 'AI提供商配置已保存到数据库');
      return true;
    } catch (error) {
      Logger.error('ConfigService', '保存AI提供商配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取MCP配置
   * @returns MCP配置
   * @throws 如果没有MCP配置，则抛出异常
   */
  static async getMCPConfig(): Promise<MCPConfigType> {
    try {
      // 从MCPServer表获取服务器数据
      const servers = await prisma.mCPServer.findMany();

      // 获取工具提示（启用的 MCP 列表已迁移至 Profile / Web localStorage，运行态不再读 Setting）
      const toolPromptSetting = await this.getSetting('mcpToolPrompt');

      // 处理工具提示，确保是字符串
      let toolPromptValue: string = '';
      if (toolPromptSetting !== null) {
        toolPromptValue = String(toolPromptSetting);
      }

      // 构建返回结果
      const result: MCPConfigType = {
        servers: servers.map((server) => ({
          serverId: server.serverId,
          name: server.name,
          isActive: server.isActive,
          connectionType: server.connectionType,
          command: server.command || undefined,
          args: server.args as string[] || undefined,
          mcpUrl: server.mcpUrl || undefined,
          headers: (server.headers as Record<string, string>) || undefined
        })),
        toolPrompt: toolPromptValue,
        enabledToolServerIds: []
      };

      return result;
    } catch (error) {
      Logger.error('ConfigService', '获取MCP配置失败:', error);
      throw error;
    }
  }

  /** 全部已添加的 MCP 服务器（Admin 渠道配置用，与 isActive/连接状态解耦） */
  static async listConfiguredMcpServers(): Promise<Array<{ serverId: string; name: string }>> {
    const rows = await prisma.mCPServer.findMany({
      select: { serverId: true, name: true },
      orderBy: { name: 'asc' }
    });
    return rows;
  }

  /**
   * 保存MCP配置
   * @param config MCP配置
   * @returns 成功返回true，失败抛出异常
   */
  static async saveMCPConfig(config: MCPConfigType): Promise<boolean> {
    try {
      // 保存工具提示（MCP 启用列表见 Profile / Web localStorage）
      await this.saveSetting('mcpToolPrompt', config.toolPrompt);

      // 清空现有服务器数据
      await prisma.mCPServer.deleteMany({});

      // 创建新服务器数据
      for (const server of config.servers) {
        await prisma.mCPServer.create({
          data: {
            serverId: server.serverId,
            name: server.name,
            isActive: server.isActive || false,
            connectionType: server.connectionType, 
            command: server.command,
            args: server.args as any, // JSON类型
            mcpUrl: server.mcpUrl,
            headers: server.headers as any
          }
        });
      }

      await McpServerAuthService.deleteExcept(config.servers.map((s) => s.serverId));

      return true;
    } catch (error) {
      Logger.error('ConfigService', '保存MCP配置失败:', error);
      throw error;
    }
  }

  /**
   * 合并 Setting 中持久化的分类与消息 category 字段，保持顺序。
   * 无配置且无消息时返回空数组。
   */
  static async getQuickMessageCategories(messages: QuickMessage[]): Promise<string[]> {
    const stored = await this.getSetting(QUICK_MESSAGE_CATEGORIES_KEY);
    const fromMessages = messages
      .map((msg) => msg.category)
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
      // 直接从QuickMessage表获取数据
      const messages = await prisma.quickMessage.findMany({
        orderBy: {
          sortId: 'asc'
        }
      });

      // 转换为完整字段结构
      return messages.map((msg) => ({
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