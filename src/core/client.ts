import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPConfig } from "../config/app.config.js";
import { Logger } from "../utils/logger.js";
import { MCPServerInfo, ServerInfo } from "../interfaces/mcp.interfaces.js";

/**
 * MCP服务器连接管理
 */
interface ServerConnection {
  id: string;
  client: Client;
  transport: StdioClientTransport;
  connected: boolean;
  transportClosed: boolean;
  name: string;
  version: string;
  lastPingTime?: number;
  lastPingResult?: boolean;
}

/**
 * MCP客户端类
 * 负责与MCP服务器的通信
 */
export class MCPClient {
  private connections: Map<string, ServerConnection> = new Map();
  private currentServerId: string = MCPConfig.defaultServerId;
  
  // Ping超时时间 (默认10秒)
  private static readonly PING_TIMEOUT = 10000;

  /**
   * 构造函数
   */
  constructor() {
    // 初始化所有服务器连接
    MCPConfig.servers.forEach(serverConfig => {
      // 创建传输层
      const transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args
      });

      // 创建客户端实例
      const client = new Client(
        {
          name: MCPConfig.client.name,
          version: MCPConfig.client.version
        },
        {
          capabilities: MCPConfig.client.capabilities
        }
      );

      // 存储连接信息
      this.connections.set(serverConfig.id, {
        id: serverConfig.id,
        client,
        transport,
        connected: false,
        transportClosed: false,
        name: serverConfig.name,
        version: "未知"
      });
    });
  }

  /**
   * 获取当前连接
   */
  private getCurrentConnection(): ServerConnection | undefined {
    return this.connections.get(this.currentServerId);
  }

  /**
   * 切换服务器
   * @param serverId 服务器ID
   */
  async switchServer(serverId: string): Promise<boolean> {
    if (!this.connections.has(serverId)) {
      Logger.error('MCP CLIENT', `切换服务器失败: 未知的服务器ID: ${serverId}`);
      return false;
    }

    this.currentServerId = serverId;
    Logger.info('MCP CLIENT', `已切换到服务器: ${serverId}`);
    
    // 不自动连接，只返回成功状态
    // 连接操作将由外部控制
    return true;
  }

  /**
   * 检查服务器连接状态
   * @param serverId 服务器ID
   * @returns 是否连接正常
   */
  async pingServer(serverId?: string): Promise<boolean> {
    const connection = serverId ? this.connections.get(serverId) : this.getCurrentConnection();
    if (!connection) {
      Logger.error('MCP CLIENT', `Ping失败: 未找到服务器`);
      return false;
    }
    
    if (!connection.connected) {
      Logger.info('MCP CLIENT', `Ping失败: 服务器未连接`);
      return false;
    }
    
    try {
      // 设置超时
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Ping超时')), MCPClient.PING_TIMEOUT);
      });
      
      // 执行ping
      const pingPromise = connection.client.ping();
      const result = await Promise.race([pingPromise, timeoutPromise]);
      
      // 更新最后ping时间和结果
      connection.lastPingTime = Date.now();
      connection.lastPingResult = !!result;
      
      Logger.info('MCP CLIENT', `Ping ${connection.name}: ${result ? '成功' : '失败'}`);
      return !!result;
    } catch (error) {
      Logger.error('MCP CLIENT', `Ping ${connection.name} 失败:`, error);
      connection.lastPingTime = Date.now();
      connection.lastPingResult = false;
      return false;
    }
  }

  /**
   * 连接到当前MCP服务器
   */
  async connect(): Promise<boolean> {
    const connection = this.getCurrentConnection();
    if (!connection) {
      throw new Error(`未找到服务器配置: ${this.currentServerId}`);
    }

    if (connection.connected) {
      // 已连接但检查连接状态
      const isConnected = await this.pingServer();
      if (isConnected) {
        return true; // 连接有效，直接返回
      }
      // 连接无效，尝试重新连接
      Logger.info('MCP CLIENT', `检测到连接已断开，尝试重新连接: ${connection.name}`);
    }

    try {
      // 如果传输层被关闭过，需要重新初始化
      if (connection.transportClosed) {
        // 获取服务器配置
        const serverConfig = MCPConfig.servers.find(s => s.id === connection.id);
        if (!serverConfig) {
          throw new Error(`未找到服务器配置: ${connection.id}`);
        }

        // 重新创建传输层
        connection.transport = new StdioClientTransport({
          command: serverConfig.command,
          args: serverConfig.args
        });
        
        // 重新创建客户端实例
        connection.client = new Client(
          {
            name: MCPConfig.client.name,
            version: MCPConfig.client.version
          },
          {
            capabilities: MCPConfig.client.capabilities
          }
        );
        
        // 重置传输层状态
        connection.transportClosed = false;
        
        Logger.info('MCP CLIENT', `已重新初始化服务器连接: ${connection.name}`);
      }

      Logger.info('MCP CLIENT', `正在连接到MCP服务器 ${connection.name}...`);
      await connection.client.connect(connection.transport);
      
      // 在连接后尝试获取服务器版本信息
      const serverVersion = connection.client.getServerVersion();
      if (serverVersion) {
        connection.name = serverVersion.name || connection.name;
        connection.version = serverVersion.version || "未知";
        Logger.info('MCP CLIENT', `服务器信息: ${connection.name} v${connection.version}`);
      }
      
      connection.connected = true;
      Logger.info('MCP CLIENT', `MCP服务器 ${connection.name} 连接成功！`);
      return true;
    } catch (error) {
      // 确保连接标记为断开状态
      connection.connected = false;
      Logger.error('MCP CLIENT', '连接失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有可用服务器信息
   */
  getAvailableServers(): ServerInfo[] {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      name: conn.name,
      version: conn.version,
      status: conn.connected ? "已连接" : "未连接",
      connectionDetails: {
        command: MCPConfig.servers.find(s => s.id === conn.id)?.command || "",
        args: MCPConfig.servers.find(s => s.id === conn.id)?.args.join(' ') || ""
      }
    }));
  }

  /**
   * 获取服务器和工具信息
   * @returns MCP服务器信息
   */
  async getServerInfo(): Promise<MCPServerInfo> {
    const connection = this.getCurrentConnection();
    
    // 准备默认返回数据（确保数据结构完整）
    const info: MCPServerInfo = {
      server: {
        id: connection?.id || this.currentServerId,
        name: connection?.name || "未知服务器",
        version: connection?.version || "未知",
        status: connection?.connected ? "已连接" : "未连接",
        connectionDetails: {
          command: MCPConfig.servers.find(s => s.id === this.currentServerId)?.command || "",
          args: MCPConfig.servers.find(s => s.id === this.currentServerId)?.args.join(' ') || ""
        }
      },
      client: {
        name: MCPConfig.client.name,
        version: MCPConfig.client.version
      },
      tools: [],
      availableServers: this.getAvailableServers(),
      currentServerId: this.currentServerId
    };

    // 如果服务器已断开连接，直接返回信息，不自动尝试连接
    if (!connection || !connection.connected) {
      Logger.info('MCP CLIENT', '服务器未连接，返回离线信息');
      return info;
    }
    
    // 如果已连接，尝试从服务器获取工具信息
    if (connection && connection.connected) {
      try {
        // 先进行ping检查确认连接状态
        const pingResult = await this.pingServer();
        if (!pingResult) {
          // 连接已断开，尝试重新连接
          await this.connect();
        }
        
        // 使用SDK提供的listTools方法获取工具列表
        const toolsResponse = await connection.client.listTools() as any;
        
        // 安全地获取工具数量
        const toolsCount = toolsResponse?.tools?.length || 0;
        Logger.info('MCP CLIENT', `获取工具列表成功，包含 ${toolsCount} 个工具`);
        
        if (toolsResponse && toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
          // 将SDK返回的工具信息转换为我们的接口格式
          info.tools = toolsResponse.tools
            .filter((tool: any) => tool !== null && tool !== undefined)
            .map((tool: any) => {
              // 安全地从inputSchema的properties中提取参数信息
              const parameters = [];
              try {
                if (tool.inputSchema && tool.inputSchema.properties) {
                  const props = tool.inputSchema.properties;
                  const required = Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : [];
                  
                  for (const key in props) {
                    if (Object.prototype.hasOwnProperty.call(props, key)) {
                      const schema = props[key] || {};
                      parameters.push({
                        name: key,
                        type: schema.type || 'unknown',
                        description: schema.description || `${key}`,
                        required: required.includes(key)
                      });
                    }
                  }
                }
              } catch (err) {
                Logger.error('MCP CLIENT', `解析工具参数时出错:`, err);
              }
              
              // 确保name和description有值
              const toolName = tool && typeof tool.name === 'string' ? tool.name : "未命名工具";
              const toolDesc = tool && typeof tool.description === 'string' ? 
                tool.description : `${toolName}工具`;
              
              return {
                name: toolName,
                description: toolDesc,
                parameters
              };
            });
        }
      } catch (error) {
        Logger.error('MCP CLIENT', '获取工具列表失败:', error);
      }
    }

    return info;
  }

  /**
   * 调用指定的工具
   * @param toolName 工具名称
   * @param args 工具参数
   * @returns 工具调用结果
   */
  async callTool<T>(toolName: string, args: any): Promise<T> {
    const connection = this.getCurrentConnection();
    if (!connection) {
      throw new Error(`未找到服务器配置: ${this.currentServerId}`);
    }

    if (!connection.connected) {
      await this.connect();
    }

    // 增强的参数验证逻辑
    if (args === undefined || args === null) {
      Logger.error('MCP CLIENT', `调用工具 ${toolName} 失败: 参数不能为空`);
      throw new Error(`调用工具 ${toolName} 失败: 参数不能为空`);
    }
    
    // 如果参数是字符串，尝试解析为JSON对象
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (error) {
        Logger.error('MCP CLIENT', `调用工具 ${toolName} 失败: 无法解析参数字符串为JSON`, error);
        throw new Error(`调用工具 ${toolName} 失败: 无法解析参数字符串为JSON - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // 确保参数是对象类型
    if (typeof args !== 'object') {
      Logger.error('MCP CLIENT', `调用工具 ${toolName} 失败: 参数必须是对象类型，当前类型: ${typeof args}`);
      throw new Error(`调用工具 ${toolName} 失败: 参数必须是对象类型，当前类型: ${typeof args}`);
    }

    Logger.info('MCP CLIENT', `调用工具 ${toolName}，参数: ${JSON.stringify(args)}`);
    
    try {
      // 先进行ping检查确认连接状态
      const pingResult = await this.pingServer();
      if (!pingResult) {
        // 连接已断开，尝试重新连接
        await this.connect();
      }
      
      // 调用工具
      const result = await connection.client.callTool({
        name: toolName,
        arguments: args
      });
      
      return result as T;
    } catch (error) {
      Logger.error('MCP CLIENT', `调用工具 ${toolName} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 断开当前连接
   */
  async disconnect(): Promise<void> {
    const connection = this.getCurrentConnection();
    if (!connection || !connection.connected) return;

    try {
      // 调用SDK提供的close方法关闭transport
      if (connection.transport && typeof connection.transport.close === 'function') {
        await connection.transport.close();
        // 标记传输层已关闭
        connection.transportClosed = true;
      }
      
      connection.connected = false;
      Logger.info('MCP CLIENT', `已与MCP服务器 ${connection.name} 断开连接`);
    } catch (error) {
      Logger.error('MCP CLIENT', '断开连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开并重新连接当前服务器
   */
  async restart(): Promise<boolean> {
    const connection = this.getCurrentConnection();
    if (!connection) {
      throw new Error(`未找到服务器配置: ${this.currentServerId}`);
    }

    try {
      // 如果已连接，先断开
      if (connection.connected) {
        await this.disconnect();
      }
      
      // 重新连接
      return await this.connect();
    } catch (error) {
      Logger.error('MCP CLIENT', '重启服务器连接失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const mcpClient = new MCPClient(); 