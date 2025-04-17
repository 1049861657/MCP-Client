import { ConfigService } from "../services/config.service.js";
import { Logger } from "../utils/logger.js";
import { ClientInfo, MCPServerInfo, ServerInfo, ToolInfo } from "../interfaces/mcp.interfaces.js";
import { ServerConnection } from "./server-connection.js";
import { ConnectionType} from "../../prisma/generated/index.js";
import { MCPServer } from "../types/config.types.js";
/**
 * MCP客户端管理器类
 * 负责管理多个MCP服务器连接
 */
export class MCPClientManager {
  private connections: Map<string, ServerConnection> = new Map();
  private toolServerMap: Map<string, string> = new Map(); // 工具名称到服务器ID的映射
  private currentServerId?: string; // 当前选中的服务器ID
  private mcpConfig: any = null; // 存储MCP配置信息

  constructor() {
    // 在构造函数中调用异步方法，但不等待
    this.initializeConnections().catch(error => {
      Logger.error('MCP CLIENT', '初始化连接失败:', error);
    });
  }

  /**
   * 初始化所有服务器连接并自动连接激活的服务器
   */
  private async initializeConnections(): Promise<void> {
    // 清空工具服务器映射
    this.toolServerMap.clear();
    
    try {
      // 从ConfigService获取最新MCP配置
      this.mcpConfig = await ConfigService.getMCPConfig();

      // 首先初始化所有服务器的连接对象
      this.mcpConfig.servers.forEach((serverConfig: MCPServer) => {
        try {
          const connection = new ServerConnection(serverConfig);
          this.connections.set(serverConfig.serverId, connection);
        } catch (error) {
          Logger.error('MCP CLIENT', `为服务器 ${serverConfig.name} (${serverConfig.serverId}) 创建连接对象失败:`, error);
        }
      });
      
      // 尝试连接所有激活的服务器
      let isFirstConnected = true;
      for (const serverConfig of this.mcpConfig.servers) {
        if (serverConfig.isActive) {
          const connection = this.connections.get(serverConfig.serverId);
          if (!connection) continue;
          
          try {
            Logger.info('MCP CLIENT', `尝试连接激活的服务器: ${serverConfig.name} (${serverConfig.serverId})`);
            const connected = await connection.connect();
            
            // 连接成功后获取工具列表并更新工具服务器映射
            await this.updateToolServerMap(serverConfig.serverId);
            
            // 将首个成功连接的服务器设为当前服务器
            if (connected && isFirstConnected && !this.currentServerId) {
              this.currentServerId = serverConfig.serverId;
              isFirstConnected = false;
            }
          } catch (error) {
            Logger.error('MCP CLIENT', `连接服务器 ${serverConfig.name} (${serverConfig.serverId}) 失败:`, error);
          }
        } else {
          Logger.info('MCP CLIENT', `服务器 ${serverConfig.name} (${serverConfig.serverId}) 未激活，跳过连接`);
        }
      }
      
      // 如果没有成功连接任何服务器但有可用服务器，设置第一个为当前服务器
      if (this.connections.size > 0 && !this.currentServerId) {
        const firstServerId = Array.from(this.connections.keys())[0];
        this.currentServerId = firstServerId;
      }
    } catch (error) {
      Logger.error('MCP CLIENT', '获取MCP配置失败:', error);
    }
  }

  /**
   * 更新工具服务器映射
   * @param serverId 服务器ID
   */
  private async updateToolServerMap(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (!connection || !connection.isConnected()) return;
    
    try {
      const tools = await connection.getTools();
      for (const tool of tools) {
        // 直接记录工具来源服务器，不检查重名
        this.toolServerMap.set(tool.name, serverId);
      }
    } catch (error) {
      Logger.error('MCP CLIENT', `更新工具服务器映射失败:`, error);
    }
  }

  /**
   * 检查服务器连接状态
   * @param serverId 服务器ID
   * @returns 是否连接正常
   */
  async pingServer(serverId: string): Promise<boolean> {
    const connection = this.connections.get(serverId);
    if (!connection || !connection.isConnected()) {
      return false;
    }
    
    return await connection.ping();
  }

  /**
   * 获取可用服务器列表
   */
  async getAvailableServers(): Promise<ServerInfo[]> {
    const servers: ServerInfo[] = [];
    
    for (const connection of this.connections.values()) {
      const serverInfo = await connection.getServerInfo();
      servers.push(serverInfo);
    }
    
    return servers;
  }

  /**
   * 获取已连接的服务器列表
   */
  async getConnectedServers(): Promise<ServerInfo[]> {
    const servers: ServerInfo[] = [];
    
    for (const connection of this.connections.values()) {
      if (connection.isConnected()) {
        const serverInfo = await connection.getServerInfo();
        servers.push(serverInfo);
      }
    }
    
    return servers;
  }

  /**
   * 获取服务器和工具信息
   * @returns MCP服务器信息
   */
  async getServerInfo(): Promise<MCPServerInfo> {
    // 选择当前服务器
    let currentServer: ServerInfo | null = null;
    
    // 如果有当前选中的服务器ID，优先使用它
    if (this.currentServerId) {
      const connection = this.connections.get(this.currentServerId);
      if (connection) {
        currentServer = await connection.getServerInfo();
      }
    }
    
    // 如果没有当前服务器，获取第一个已连接的服务器
    if (!currentServer) {
      for (const connection of this.connections.values()) {
        if (connection.isConnected()) {
          currentServer = await connection.getServerInfo();
          this.currentServerId = connection.getId(); // 更新当前服务器ID
          break;
        }
      }
    }
    
    // 如果仍然没有，使用第一个可用服务器
    if (!currentServer && this.connections.size > 0) {
      const firstConnection = Array.from(this.connections.values())[0];
      if (firstConnection) {
        currentServer = await firstConnection.getServerInfo();
        this.currentServerId = firstConnection.getId(); // 更新当前服务器ID
      }
    }
    
    // 如果仍然没有，创建一个默认的服务器信息
    if (!currentServer) {
      currentServer = {
        id: '',
        name: "未知服务器",
        version: "未知",
        status: "未连接",
        connectionDetails: {
          connectionType: ConnectionType.STDIO,
          displayCommand: ''
        }
      };
    }
    
    const allTools: ToolInfo[] = [];
    const serverTools: Record<string, ToolInfo[]> = {};
    const connectedServers: ServerInfo[] = [];
    
    // 汇总所有已连接服务器的工具
    for (const connection of this.connections.values()) {
      if (connection.isConnected()) {
        const serverInfo = await connection.getServerInfo();
        connectedServers.push(serverInfo);
        
        try {
          const tools = await connection.getTools();
          
          // 直接使用工具原始名称，不进行重名处理
          serverTools[connection.getId()] = tools;
          allTools.push(...tools);
        } catch (error) {
          Logger.error('MCP CLIENT', `获取服务器 ${connection.getName()} 的工具列表失败:`, error);
        }
      }
    }
    
    const info: MCPServerInfo = {
      server: currentServer,
      currentServerId: this.currentServerId,
      tools: allTools,
      availableServers: await this.getAvailableServers(),
      connectedServers,
      serverTools
    };

    return info;
  }

  /**
   * 获取客户端信息
   * @returns MCP客户端信息
   */
  async getClientInfo(): Promise<ClientInfo> {
    try {
      // 确保mcpConfig已加载
      if (!this.mcpConfig) {
        this.mcpConfig = await ConfigService.getMCPConfig();
      }
      
      return {
        name: this.mcpConfig.client.name,
        version: this.mcpConfig.client.version
      };
    } catch (error) {
      Logger.error('MCP CLIENT', '获取客户端信息失败:', error);
      return {
        name: 'MCP Client',
        version: '1.0.0'
      };
    }
  }

  /**
   * 根据工具名称找到对应的服务器连接
   * @param toolName 工具名称
   * @returns 服务器连接对象
   */
  private findServerForTool(toolName: string): ServerConnection | undefined {
    const serverId = this.toolServerMap.get(toolName);
    if (serverId) {
      return this.connections.get(serverId);
    }
    
    return undefined;
  }

  /**
   * 调用工具
   */
  async callTool<T>(toolName: string, args: any): Promise<T> {
    const connection = this.findServerForTool(toolName);
    if (!connection) {
      throw new Error(`找不到工具 ${toolName} 所属的服务器或所有服务器都未连接`);
    }
    
    return await connection.callTool<T>(toolName, args);
  }

  /**
   * 断开所有服务器连接
   */
  async disconnectAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const connection of this.connections.values()) {
      if (connection.isConnected()) {
        promises.push(connection.disconnect());
      }
    }
    
    await Promise.all(promises);
  }

  /**
   * 断开指定服务器连接
   */
  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (connection) {
      await connection.disconnect();
    }
  }

  /**
   * 重启所有服务器连接
   */
  async restartAll(): Promise<void> {
    // 先获取最新配置
    try {
      this.mcpConfig = await ConfigService.getMCPConfig();
      
      // 断开现有的所有连接
      await this.disconnectAll();
      
      // 清空现有的连接和工具映射
      this.connections.clear();
      this.toolServerMap.clear();
      
      // 重新初始化连接
      await this.initializeConnections();
    } catch (error) {
      Logger.error('MCP CLIENT', '重启所有服务器连接失败:', error);
      throw error;
    }
  }

  /**
   * 重启指定服务器连接
   */
  async restart(serverId: string): Promise<boolean> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return false;
    }
    
    try {
      const success = await connection.restart();
      
      if (success) {
        // 更新工具映射
        await this.updateToolServerMap(serverId);
      }
      
      return success;
    } catch (error) {
      Logger.error('MCP CLIENT', `重启服务器 ${serverId} 失败:`, error);
      return false;
    }
  }

  /**
   * 连接指定服务器
   */
  async connect(serverId: string): Promise<boolean> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return false;
    }
    
    try {
      const success = await connection.connect();
      
      if (success) {
        // 更新工具映射
        await this.updateToolServerMap(serverId);
      }
      
      return success;
    } catch (error) {
      Logger.error('MCP CLIENT', `连接服务器 ${serverId} 失败:`, error);
      return false;
    }
  }

  /**
   * 获取指定服务器的连接对象
   */
  getConnection(serverId: string): ServerConnection | undefined {
    return this.connections.get(serverId);
  }

  /**
   * 切换当前服务器
   */
  switchCurrentServer(serverId: string): boolean {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return false;
    }
    
    this.currentServerId = serverId;
    return true;
  }
}

/**
 * 重新加载MCP配置并重建连接
 */
export async function reloadMCPConfig(): Promise<boolean> {
  try {
    await mcpClient.restartAll();
    return true;
  } catch (error) {
    Logger.error('MCP CLIENT', '重新加载MCP配置失败:', error);
    return false;
  }
}

/**
 * 全局MCP客户端实例
 */
export const mcpClient = new MCPClientManager();

