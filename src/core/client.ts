import { MCPConfig, reloadConfigAndUpdate } from "../config/app.config.js";
import { Logger } from "../utils/logger.js";
import { ClientInfo, MCPServerInfo, ServerInfo, ToolInfo } from "../interfaces/mcp.interfaces.js";
import { ServerConnection } from "./server-connection.js";

/**
 * MCP客户端管理器类
 * 负责管理多个MCP服务器连接
 */
export class MCPClientManager {
  private connections: Map<string, ServerConnection> = new Map();
  private toolServerMap: Map<string, string> = new Map(); // 工具名称到服务器ID的映射
  private currentServerId?: string; // 当前选中的服务器ID

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
    
    // 首先初始化所有服务器的连接对象
    MCPConfig.servers.forEach(serverConfig => {
      try {
        const connection = new ServerConnection(serverConfig);
        this.connections.set(serverConfig.id, connection);
      } catch (error) {
        Logger.error('MCP CLIENT', `为服务器 ${serverConfig.name} (${serverConfig.id}) 创建连接对象失败:`, error);
      }
    });
    
    // 尝试连接所有激活的服务器
    let isFirstConnected = true;
    for (const serverConfig of MCPConfig.servers) {
      if (serverConfig.isActive !== false) {
        const connection = this.connections.get(serverConfig.id);
        if (!connection) continue;
        
        try {
          Logger.info('MCP CLIENT', `尝试连接激活的服务器: ${serverConfig.name} (${serverConfig.id})`);
          const connected = await connection.connect();
          
          // 连接成功后获取工具列表并更新工具服务器映射
          await this.updateToolServerMap(serverConfig.id);
          
          // 将首个成功连接的服务器设为当前服务器
          if (connected && isFirstConnected && !this.currentServerId) {
            this.currentServerId = serverConfig.id;
            isFirstConnected = false;
          }
        } catch (error) {
          Logger.error('MCP CLIENT', `连接服务器 ${serverConfig.name} (${serverConfig.id}) 失败:`, error);
        }
      } else {
        Logger.info('MCP CLIENT', `服务器 ${serverConfig.name} (${serverConfig.id}) 未激活，跳过连接`);
      }
    }
    
    // 如果没有成功连接任何服务器但有可用服务器，设置第一个为当前服务器
    if (this.connections.size > 0 && !this.currentServerId) {
      const firstServerId = Array.from(this.connections.keys())[0];
      this.currentServerId = firstServerId;
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
  getAvailableServers(): ServerInfo[] {
    const servers: ServerInfo[] = [];
    
    this.connections.forEach(connection => {
      servers.push(connection.getServerInfo());
    });
    
    return servers;
  }

  /**
   * 获取已连接的服务器列表
   */
  getConnectedServers(): ServerInfo[] {
    const servers: ServerInfo[] = [];
    
    this.connections.forEach(connection => {
      if (connection.isConnected()) {
        servers.push(connection.getServerInfo());
      }
    });
    
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
        currentServer = connection.getServerInfo();
      }
    }
    
    // 如果没有当前服务器，获取第一个已连接的服务器
    if (!currentServer) {
      for (const connection of this.connections.values()) {
        if (connection.isConnected()) {
          currentServer = connection.getServerInfo();
          this.currentServerId = connection.getId(); // 更新当前服务器ID
          break;
        }
      }
    }
    
    // 如果仍然没有，使用第一个可用服务器
    if (!currentServer && this.connections.size > 0) {
      const firstConnection = Array.from(this.connections.values())[0];
      if (firstConnection) {
        currentServer = firstConnection.getServerInfo();
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
          connectionType: 'stdio',
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
        const serverInfo = connection.getServerInfo();
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
      availableServers: this.getAvailableServers(),
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
      return {
        name: MCPConfig.client.name,
        version: MCPConfig.client.version
      };
    }

  /**
   * 根据工具名称找到对应的服务器
   * @param toolName 工具名称
   * @returns 服务器连接对象
   */
  private findServerForTool(toolName: string): ServerConnection | undefined {
    const serverId = this.toolServerMap.get(toolName);
    if (!serverId) {
      return undefined;
    }
    return this.connections.get(serverId);
  }

  /**
   * 调用指定的工具
   * @param toolName 工具名称
   * @param args 工具参数
   * @returns 工具调用结果
   */
  async callTool<T>(toolName: string, args: any): Promise<T> {
    // 根据工具名称找到对应服务器
    const connection = this.findServerForTool(toolName);
    
    if (!connection) {
      throw new Error(`未找到可以处理工具 ${toolName} 的服务器，请确保先调用了该工具所在服务器的工具`);
    }

    if (!connection.isConnected()) {
      await connection.connect();
    }

    return await connection.callTool<T>(toolName, args);
  }
  
  /**
   * 断开所有连接
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.values()).map(connection => {
      return connection.disconnect().catch(error => {
        Logger.error('MCP CLIENT', `断开服务器 ${connection.getName()} 连接失败:`, error);
      });
    });
    
    await Promise.all(disconnectPromises);
  }

  /**
   * 断开指定服务器的连接
   * @param serverId 服务器ID
   */
  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`未找到服务器: ${serverId}`);
    }
    
    await connection.disconnect();
  }

  /**
   * 重新连接所有激活的服务器
   */
  async restartAll(): Promise<void> {
    // 先断开所有连接
    await this.disconnectAll();
    
    // 重新连接激活的服务器
    for (const serverConfig of MCPConfig.servers) {
      if (serverConfig.isActive !== false) {
        const connection = this.connections.get(serverConfig.id);
        if (!connection) continue;
        
        try {
          await connection.connect();
          await this.updateToolServerMap(serverConfig.id);
        } catch (error) {
          Logger.error('MCP CLIENT', `重新连接服务器 ${serverConfig.name} (${serverConfig.id}) 失败:`, error);
        }
      }
    }
  }

  /**
   * 重启指定服务器
   * @param serverId 服务器ID
   */
  async restart(serverId: string): Promise<boolean> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`未找到服务器: ${serverId}`);
    }

    const result = await connection.restart();
    if (result) {
      await this.updateToolServerMap(serverId);
    }
    
    return result;
  }

  /**
   * 连接到指定MCP服务器
   * @param serverId 服务器ID
   */
  async connect(serverId: string): Promise<boolean> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`未找到服务器: ${serverId}`);
    }

    const result = await connection.connect();
    if (result) {
      await this.updateToolServerMap(serverId);
    }
    
    return result;
  }

  /**
   * 获取特定服务器连接
   * @param serverId 服务器ID
   */
  getConnection(serverId: string): ServerConnection | undefined {
    return this.connections.get(serverId);
  }

  /**
   * 切换当前选中的服务器（不进行连接）
   * @param serverId 服务器ID
   * @returns 是否成功切换
   */
  switchCurrentServer(serverId: string): boolean {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return false;
    }
    
    // 仅切换选中的服务器ID，不进行连接
    this.currentServerId = serverId;
    return true;
  }
}

/**
 * 完全重新加载配置
 * 用于在配置变更后强制刷新
 */
export async function reloadMCPConfig(): Promise<boolean> {
  try {
    await mcpClient.disconnectAll();
    
    const configReloaded = reloadConfigAndUpdate('mcp-config.json', MCPConfig);
    if (!configReloaded) {
      throw new Error('重新加载配置文件失败');
    }
    
    // 保存当前选中的服务器ID
    const currentServerId = mcpClient["currentServerId"];
    
    mcpClient["connections"] = new Map();
    mcpClient["toolServerMap"] = new Map();
    
    // 初始化所有服务器连接
    MCPConfig.servers.forEach(serverConfig => {
      try {
        const connection = new ServerConnection(serverConfig);
        mcpClient["connections"].set(serverConfig.id, connection);
      } catch (error) {
        Logger.error('MCP CLIENT', `重新加载配置后创建服务器连接失败:`, error);
      }
    });
    
    // 恢复之前选择的服务器ID（如果还存在的话）
    if (currentServerId && mcpClient["connections"].has(currentServerId)) {
      mcpClient["currentServerId"] = currentServerId;
    } else if (mcpClient["connections"].size > 0) {
      // 如果之前的服务器不存在了，选择第一个可用的
      mcpClient["currentServerId"] = Array.from(mcpClient["connections"].keys())[0];
    }
    
    // 尝试连接所有激活的服务器
    for (const serverConfig of MCPConfig.servers) {
      if (serverConfig.isActive !== false) {
        try {
          // 使用不会修改currentServerId的connect方法
          await mcpClient.connect(serverConfig.id);
        } catch (error) {
          Logger.error('MCP CLIENT', `重新加载配置后连接服务器 ${serverConfig.name} (${serverConfig.id}) 失败:`, error);
        }
      }
    }
    
    return true;
  } catch (error) {
    Logger.error('MCP CLIENT', `重新加载MCP配置失败:`, error);
    return false;
  }
} 

// 导出单例实例
export const mcpClient = new MCPClientManager();

