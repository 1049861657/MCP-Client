/**
 * 配置服务
 * 负责从数据库实时读取和写入配置信息
 */
import { ProviderType} from '../../prisma/generated/index.js';
import { prisma } from '../lib/prisma.js';
import { AIProvidersConfigType, MCPConfigType, AIProvider, QuickMessage } from '../types/config.types.js';
import { Logger } from '../utils/logger.js';

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

      // 获取客户端和工具提示设置
      const clientSetting = await this.getSetting('mcpClient');
      const toolPromptSetting = await this.getSetting('mcpToolPrompt');
      const enabledToolServerIdsSetting = await this.getSetting('mcpEnabledToolServerIds');

      // 处理客户端配置，确保类型安全
      const clientConfig = clientSetting;

      // 处理工具提示，确保是字符串
      let toolPromptValue: string = '';
      if (toolPromptSetting !== null) {
        toolPromptValue = String(toolPromptSetting);
      }

      // 处理启用的工具服务器ID列表
      let enabledToolServerIds: string[] = [];
      if (enabledToolServerIdsSetting !== null) {
        enabledToolServerIds = enabledToolServerIdsSetting;
      }

      // 构建返回结果
      const result: MCPConfigType = {
        client: clientConfig,
        servers: servers.map((server) => ({
          serverId: server.serverId,
          name: server.name,
          isActive: server.isActive,
          connectionType: server.connectionType, 
          command: server.command || undefined,
          args: server.args as string[] || undefined,
          sseUrl: server.sseUrl || undefined
        })),
        toolPrompt: toolPromptValue,
        enabledToolServerIds: enabledToolServerIds
      };

      return result;
    } catch (error) {
      Logger.error('ConfigService', '获取MCP配置失败:', error);
      throw error;
    }
  }

  /**
   * 保存MCP配置
   * @param config MCP配置
   * @returns 成功返回true，失败抛出异常
   */
  static async saveMCPConfig(config: MCPConfigType): Promise<boolean> {
    try {
      // 保存客户端和工具提示设置
      await this.saveSetting('mcpClient', config.client);
      await this.saveSetting('mcpToolPrompt', config.toolPrompt);
      await this.saveSetting('mcpEnabledToolServerIds', config.enabledToolServerIds || []);

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
            sseUrl: server.sseUrl
          }
        });
      }

      return true;
    } catch (error) {
      Logger.error('ConfigService', '保存MCP配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取快捷消息配置
   * @returns 快捷消息配置
   */
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

  /**
   * 保存快捷消息配置
   * @param config 快捷消息配置
   * @returns 成功返回true，失败抛出异常
   */
  static async saveQuickMessagesConfig(config: QuickMessage[]): Promise<boolean> {
    try {
      // 清空现有数据
      await prisma.quickMessage.deleteMany({});

      // 创建新数据
      for (const msg of config) {
        await prisma.quickMessage.create({
          data: {
            sortId: msg.sortId,
            content: msg.content,
            result: msg.result,
            category: msg.category
          }
        });
      }

      Logger.info('ConfigService', '快捷消息配置已保存到数据库');
      return true;
    } catch (error) {
      Logger.error('ConfigService', '保存快捷消息配置失败:', error);
      throw error;
    }
  }
} 