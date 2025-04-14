import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { MCPConfig } from "../config/app.config.js";
import { Logger } from "../utils/logger.js";
import { MCPServer } from "../types/config.types.js";
import { ConnectionType } from "../types/config.types.js";
import { ServerInfo, ToolInfo } from "../interfaces/mcp.interfaces.js";

/**
 * 服务器连接类
 * 管理与单个MCP服务器的连接
 */
export class ServerConnection {
  private client: Client;
  private transport: StdioClientTransport | SSEClientTransport;
  private connected: boolean = false;
  private transportClosed: boolean = false;
  private id: string;
  private name: string;
  private version: string = "未知";
  private connectionType: ConnectionType;
  private lastPingTime?: number;
  private lastPingResult?: boolean;
  private static readonly PING_TIMEOUT = 10000;

  /**
   * 构造函数
   * @param serverConfig 服务器配置
   */
  constructor(serverConfig: MCPServer) {
    this.id = serverConfig.id;
    this.name = serverConfig.name;
    this.connectionType = serverConfig.connectionType || 'stdio';
    
    const transport = this.createClientTransport(serverConfig);
    if (!transport) {
      throw new Error(`无法为服务器 ${serverConfig.name} (${serverConfig.id}) 创建传输层`);
    }
    
    this.transport = transport;
    this.client = new Client(
      {
        name: MCPConfig.client.name,
        version: MCPConfig.client.version
      },
      {
        capabilities: MCPConfig.client.capabilities
      }
    );
  }

  /**
   * 创建客户端传输层
   */
  private createClientTransport(serverConfig: MCPServer): StdioClientTransport | SSEClientTransport | null {
    const connectionType = serverConfig.connectionType || 'stdio';
    
    if (connectionType === 'stdio') {
      if (!serverConfig.command || !serverConfig.args) {
        Logger.error('SERVER CONNECTION', `无法创建stdio连接: 缺少command或args配置`);
        return null;
      }
      return new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args
      });
    } 
    
    if (connectionType === 'sse') {
      if (!serverConfig.sseUrl) {
        Logger.error('SERVER CONNECTION', `无法创建sse连接: 缺少sseUrl配置`);
        return null;
      }
      try {
        return new SSEClientTransport(new URL(serverConfig.sseUrl));
      } catch (error) {
        Logger.error('SERVER CONNECTION', `创建SSE连接失败: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    }
    
    Logger.error('SERVER CONNECTION', `不支持的连接类型: ${connectionType}`);
    return null;
  }

  /**
   * 获取连接显示命令
   */
  getConnectionDisplayCommand(serverConfig: MCPServer): string {
    if (!serverConfig) return '';
    
    if (this.connectionType === 'stdio' && serverConfig.command) {
      return `${serverConfig.command} ${serverConfig.args?.join(' ') || ''}`;
    } else if (this.connectionType === 'sse' && serverConfig.sseUrl) {
      return serverConfig.sseUrl;
    }
    return '';
  }

  /**
   * 连接到MCP服务器
   */
  async connect(): Promise<boolean> {
    if (this.connected && !this.transportClosed) {
      return true;
    }

    try {
      if (this.transportClosed) {
        const serverConfig = MCPConfig.servers.find(s => s.id === this.id);
        if (!serverConfig) {
          throw new Error(`未找到服务器配置: ${this.id}`);
        }

        const newTransport = this.createClientTransport(serverConfig);
        if (!newTransport) {
          throw new Error(`创建传输层失败: ${this.id}`);
        }
        
        this.transport = newTransport;
        this.client = new Client(
          {
            name: MCPConfig.client.name,
            version: MCPConfig.client.version
          },
          {
            capabilities: MCPConfig.client.capabilities
          }
        );
        
        this.transportClosed = false;
      }

      Logger.info('SERVER CONNECTION', `正在连接到MCP服务器 ${this.name}...`);
      
      await this.client.connect(this.transport);
      
      const serverVersion = this.client.getServerVersion();
      if (serverVersion) {
        this.name = serverVersion.name || this.name;
        this.version = serverVersion.version || "未知";
      }
      
      this.connected = true;
      Logger.info('SERVER CONNECTION', `MCP服务器 ${this.name} 连接成功！`);
      return true;
    } catch (error) {
      this.connected = false;
      Logger.error('SERVER CONNECTION', '连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;

    if (this.transport && typeof this.transport.close === 'function') {
      await this.transport.close();
      this.transportClosed = true;
    }
    
    this.connected = false;
  }

  /**
   * 重新连接
   */
  async restart(): Promise<boolean> {
    if (this.connected) {
      await this.disconnect();
    }
    
    return await this.connect();
  }

  /**
   * 检查服务器连接状态
   * @returns 是否连接正常
   */
  async ping(): Promise<boolean> {
    if (!this.connected) {
      return false;
    }
    
    try {
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Ping超时')), ServerConnection.PING_TIMEOUT);
      });
      
      const pingPromise = this.client.ping();
      const result = await Promise.race([pingPromise, timeoutPromise]);
      
      this.lastPingTime = Date.now();
      this.lastPingResult = !!result;
      
      return !!result;
    } catch {
      this.lastPingTime = Date.now();
      this.lastPingResult = false;
      return false;
    }
  }

  /**
   * 获取服务器信息
   */
  getServerInfo(): ServerInfo {
    const serverConfig = MCPConfig.servers.find(s => s.id === this.id);
    const displayCommand = this.getConnectionDisplayCommand(serverConfig!);
    
    return {
      id: this.id,
      name: serverConfig?.name || this.id,
      internalName: this.connected ? this.name : undefined,
      version: this.version,
      status: this.connected ? '已连接' : '未连接',
      connectionDetails: {
        connectionType: this.connectionType,
        command: serverConfig?.command,
        args: serverConfig?.args?.join(' '),
        sseUrl: serverConfig?.sseUrl,
        displayCommand
      }
    };
  }

  /**
   * 获取工具列表
   */
  async getTools(): Promise<ToolInfo[]> {
    if (!this.connected) {
      return [];
    }
    
    try {
      const toolsResponse = await this.client.listTools() as any;
      
      if (!toolsResponse?.tools || !Array.isArray(toolsResponse.tools)) {
        return [];
      }
      
      return toolsResponse.tools
        .filter((tool: any) => tool !== null && tool !== undefined)
        .map((tool: any) => {
          const parameters = [];
          try {
            if (tool.inputSchema?.properties) {
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
            Logger.error('SERVER CONNECTION', `解析工具参数时出错:`, err);
          }
          
          const toolName = tool && typeof tool.name === 'string' ? tool.name : "未命名工具";
          const toolDesc = tool && typeof tool.description === 'string' ? 
            tool.description : `${toolName}工具`;
          
          return {
            name: toolName,
            description: toolDesc,
            parameters,
            serverId: this.id,
            serverName: this.name,
            originalName: toolName
          };
        });
    } catch (error) {
      Logger.error('SERVER CONNECTION', '获取工具列表失败:', error);
      return [];
    }
  }

  /**
   * 调用工具
   */
  async callTool<T>(toolName: string, args: any): Promise<T> {
    if (!this.connected) {
      await this.connect();
    }

    if (args === undefined || args === null) {
      throw new Error(`调用工具 ${toolName} 失败: 参数不能为空`);
    }
    
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (error) {
        throw new Error(`调用工具 ${toolName} 失败: 无法解析参数字符串为JSON`);
      }
    }
    
    if (typeof args !== 'object') {
      throw new Error(`调用工具 ${toolName} 失败: 参数必须是对象类型，当前类型: ${typeof args}`);
    }

    try {
      return await this.client.callTool({
        name: toolName,
        arguments: args
      }) as T;
    } catch (error) {
      Logger.error('SERVER CONNECTION', `调用工具 ${toolName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 获取服务器ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取服务器名称
   */
  getName(): string {
    return this.name;
  }
} 