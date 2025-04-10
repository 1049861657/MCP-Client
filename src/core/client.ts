import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { MCPConfig } from "../config/app.config.js";
import { Logger } from "../utils/logger.js";
import { MCPServerInfo, ServerInfo } from "../interfaces/mcp.interfaces.js";
import { ConnectionType } from "../types/config.types.js";

/**
 * MCP服务器连接管理
 */
interface ServerConnection {
  id: string;
  client: Client;
  transport: StdioClientTransport | SSEClientTransport;
  connected: boolean;
  transportClosed: boolean;
  name: string;
  version: string;
  connectionType: ConnectionType;
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
      // 获取连接类型，默认为stdio
      const connectionType = serverConfig.connectionType || 'stdio';
      
      // 创建传输层
      let transport;
      if (connectionType === 'stdio') {
        if (serverConfig.command && serverConfig.args) {
          transport = new StdioClientTransport({
            command: serverConfig.command,
            args: serverConfig.args
          });
        } else {
          Logger.error('MCP CLIENT', `无法创建stdio连接: 缺少command或args配置`);
          return; // 跳过这个服务器
        }
      } else if (connectionType === 'sse') {
        if (!serverConfig.sseUrl) {
          Logger.error('MCP CLIENT', `无法创建sse连接: 缺少sseUrl配置`);
          return; // 跳过这个服务器
        }
        try {
          // 使用SDK提供的SSEClientTransport
          transport = new SSEClientTransport(new URL(serverConfig.sseUrl));
        } catch (error) {
          Logger.error('MCP CLIENT', `创建SSE连接失败: ${error instanceof Error ? error.message : String(error)}`);
          return; // 跳过这个服务器
        }
      } else {
        Logger.error('MCP CLIENT', `不支持的连接类型: ${connectionType}`);
        return; // 跳过这个服务器
      }

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
        version: "未知",
        connectionType: connectionType
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
    if (!connection || !connection.connected) {
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
      
      return !!result;
    } catch (error) {
      connection.lastPingTime = Date.now();
      connection.lastPingResult = false;
      return false;
    }
  }

  /**
   * 获取可用服务器列表
   */
  getAvailableServers(): ServerInfo[] {
    const servers: ServerInfo[] = [];
    
    // 将connections转换为ServerInfo数组
    this.connections.forEach((connection, id) => {
      // 查找原始配置
      const serverConfig = MCPConfig.servers.find(s => s.id === id);
      
      // 获取适合UI显示的连接命令文本
      let displayCommand = '';
      if (serverConfig) {
        if (connection.connectionType === 'stdio' && serverConfig.command) {
          displayCommand = `${serverConfig.command} ${serverConfig.args?.join(' ') || ''}`;
        } else if (connection.connectionType === 'sse' && serverConfig.sseUrl) {
          displayCommand = serverConfig.sseUrl;
        }
      }
      
      servers.push({
        id,
        name: connection.name,
        version: connection.version,
        status: connection.connected ? '已连接' : '未连接',
        connectionDetails: {
          connectionType: connection.connectionType,
          command: serverConfig?.command,
          args: serverConfig?.args?.join(' '),
          sseUrl: serverConfig?.sseUrl,
          displayCommand
        }
      });
    });
    
    return servers;
  }

  /**
   * 获取服务器和工具信息
   * @returns MCP服务器信息
   */
  async getServerInfo(): Promise<MCPServerInfo> {
    const connection = this.getCurrentConnection();
    const serverConfig = MCPConfig.servers.find(s => s.id === this.currentServerId);
    
    // 获取适合UI显示的连接命令文本
    let connectionCommandText = '';
    if (serverConfig) {
      if (serverConfig.connectionType === 'stdio' && serverConfig.command) {
        connectionCommandText = `${serverConfig.command} ${serverConfig.args?.join(' ') || ''}`;
      } else if (serverConfig.connectionType === 'sse' && serverConfig.sseUrl) {
        connectionCommandText = serverConfig.sseUrl;
      }
    }
    
    // 准备默认返回数据（确保数据结构完整）
    const info: MCPServerInfo = {
      server: {
        id: connection?.id || this.currentServerId,
        name: connection?.name || "未知服务器",
        version: connection?.version || "未知",
        status: connection?.connected ? "已连接" : "未连接",
        connectionDetails: {
          connectionType: (serverConfig?.connectionType || 'stdio') as 'stdio' | 'sse',
          command: serverConfig?.command,
          args: serverConfig?.args?.join(' '),
          sseUrl: serverConfig?.sseUrl,
          displayCommand: connectionCommandText // 添加用于显示的连接命令
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

    // 如果服务器未连接，直接返回信息
    if (!connection || !connection.connected) {
      return info;
    }
    
    // 如果已连接，尝试从服务器获取工具信息
    try {
      // 使用SDK提供的listTools方法获取工具列表
      const toolsResponse = await connection.client.listTools() as any;
      
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

    // 如果未连接，先尝试连接
    if (!connection.connected) {
      await this.connect();
    }

    // 增强的参数验证逻辑
    if (args === undefined || args === null) {
      throw new Error(`调用工具 ${toolName} 失败: 参数不能为空`);
    }
    
    // 如果参数是字符串，尝试解析为JSON对象
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (error) {
        throw new Error(`调用工具 ${toolName} 失败: 无法解析参数字符串为JSON - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // 确保参数是对象类型
    if (typeof args !== 'object') {
      throw new Error(`调用工具 ${toolName} 失败: 参数必须是对象类型，当前类型: ${typeof args}`);
    }

    try {
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
    } catch (error) {
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
      throw error;
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

    // 如果已经连接，直接返回成功
    if (connection.connected && !connection.transportClosed) {
      return true;
    }

    try {
      // 如果传输层被关闭过或从未初始化，需要重新初始化
      if (connection.transportClosed) {
        // 获取服务器配置
        const serverConfig = MCPConfig.servers.find(s => s.id === connection.id);
        if (!serverConfig) {
          throw new Error(`未找到服务器配置: ${connection.id}`);
        }

        // 重新创建传输层
        if (connection.connectionType === 'stdio') {
          if (serverConfig.command && serverConfig.args) {
            connection.transport = new StdioClientTransport({
              command: serverConfig.command,
              args: serverConfig.args
            });
          } else {
            throw new Error(`无法创建stdio连接: 缺少command或args配置`);
          }
        } else if (connection.connectionType === 'sse') {
          if (serverConfig.sseUrl) {
            connection.transport = new SSEClientTransport(new URL(serverConfig.sseUrl));
          } else {
            throw new Error(`无法创建sse连接: 缺少sseUrl配置`);
          }
        } else {
          throw new Error(`不支持的连接类型: ${connection.connectionType}`);
        }
        
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
      }

      Logger.info('MCP CLIENT', `正在连接到MCP服务器 ${connection.name}...`);
      
      // 建立连接
      await connection.client.connect(connection.transport);
      
      // 在连接后尝试获取服务器版本信息
      const serverVersion = connection.client.getServerVersion();
      if (serverVersion) {
        connection.name = serverVersion.name || connection.name;
        connection.version = serverVersion.version || "未知";
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
}

// 导出单例实例
export const mcpClient = new MCPClient(); 