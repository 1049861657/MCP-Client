import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ClientCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { ProgressNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { MCPClientIdentity } from "../config/app.config.js";
import { Logger } from "../utils/logger.js";
import { ConnectionType } from '../generated/prisma/client.js';
import { CallToolOptions, ServerInfo, ToolInfo } from "../interfaces/mcp.interfaces.js";
import { ConfigService } from "../services/config.service.js";
import { MCPConfigType, MCPServer } from "../types/config.types.js";
import { OpenAINameCodec } from "../utils/openai-util.js";

/**
 * 服务器连接类
 * 管理与单个MCP服务器的连接
 */
export class ServerConnection {
  private client: Client;
  private transport: StdioClientTransport | StreamableHTTPClientTransport;
  private connected: boolean = false;
  private transportClosed: boolean = false;
  private id: string;
  private name: string;
  private version: string = "未知";
  private connectionType: ConnectionType;
  private static readonly PING_TIMEOUT = 10000;
  // 存储当前配置的引用
  private mcpConfig: MCPConfigType | null = null;
  // progressToken → onProgress 回调映射，用于多并发调用时路由进度通知
  private progressHandlers: Map<string | number, (progress: number, total: number | undefined, message: string | undefined) => void> = new Map();
  private progressTokenCounter: number = 0;

  /**
   * 构造函数
   * @param serverConfig 服务器配置
   */
  constructor(serverConfig: MCPServer) {
    this.id = serverConfig.serverId;
    this.name = serverConfig.name;
    this.connectionType = serverConfig.connectionType;
    
    const transport = this.createClientTransport(serverConfig);
    if (!transport) {
      throw new Error(`无法为服务器 ${serverConfig.name} (${serverConfig.serverId}) 创建传输层`);
    }
    
    this.transport = transport;
    this.client = ServerConnection.createClient();
    
    // 在构造函数中异步初始化配置
    this.initConfig().catch(error => {
      Logger.error('SERVER CONNECTION', '初始化配置失败:', error);
    });
  }

  /**
   * 创建 MCP SDK Client 实例
   * 客户端身份（name / version / capabilities）来自代码常量 MCPClientIdentity
   */
  private static createClient(): Client {
    return new Client(
      {
        name: MCPClientIdentity.name,
        version: MCPClientIdentity.version
      },
      {
        capabilities: MCPClientIdentity.capabilities as ClientCapabilities
      }
    );
  }

  /**
   * 初始化配置
   */
  private async initConfig(): Promise<void> {
    try {
      this.mcpConfig = await ConfigService.getMCPConfig();
    } catch (error) {
      Logger.error('SERVER CONNECTION', '获取MCP配置失败:', error);
    }
  }

  /**
   * 创建客户端传输层（远程 HTTP(S) 仅 Streamable HTTP，与当前 @modelcontextprotocol/sdk 一致）
   */
  private createClientTransport(serverConfig: MCPServer): StdioClientTransport | StreamableHTTPClientTransport | null {
    const connectionType = serverConfig.connectionType;
    
    if (connectionType === ConnectionType.STDIO) {
      if (!serverConfig.command || !serverConfig.args) {
        Logger.error('SERVER CONNECTION', `无法创建stdio连接: 缺少command或args配置`);
        return null;
      }
      return new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args
      });
    } 
    
    if (connectionType === ConnectionType.HTTP) {
      if (!serverConfig.mcpUrl) {
        Logger.error('SERVER CONNECTION', `无法创建 HTTP 连接: 缺少 mcpUrl 配置`);
        return null;
      }
      try {
        const url = new URL(serverConfig.mcpUrl);
        const opts = serverConfig.headers && Object.keys(serverConfig.headers).length > 0
          ? { requestInit: { headers: serverConfig.headers } }
          : undefined;
        return new StreamableHTTPClientTransport(url, opts);
      } catch (error) {
        Logger.error('SERVER CONNECTION', `创建远程 MCP 传输失败: ${error instanceof Error ? error.message : String(error)}`);
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
    if (this.connectionType === ConnectionType.STDIO && serverConfig.command) {
      return `${serverConfig.command} ${serverConfig.args?.join(' ') || ''}`;
    } else if (this.connectionType === ConnectionType.HTTP && serverConfig.mcpUrl) {
      return serverConfig.mcpUrl;
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
      // 确保有最新配置
      if (!this.mcpConfig) {
        this.mcpConfig = await ConfigService.getMCPConfig();
      }
      
      if (this.transportClosed) {
        const serverConfig = this.mcpConfig.servers.find(s => s.serverId === this.id);
        if (!serverConfig) {
          throw new Error(`未找到服务器配置: ${this.id}`);
        }

        const newTransport = this.createClientTransport(serverConfig);
        if (!newTransport) {
          throw new Error(`创建传输层失败: ${this.id}`);
        }
        
        this.transport = newTransport;
        this.client = ServerConnection.createClient();
        
        this.transportClosed = false;
      }
      
      await this.client.connect(this.transport);
      this.setupProgressHandler();
      
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
      
      return !!result;
    } catch {
      return false;
    }
  }

  /**
   * 获取服务器信息
   */
  async getServerInfo(): Promise<ServerInfo> {
    // 确保有最新配置
    if (!this.mcpConfig) {
      this.mcpConfig = await ConfigService.getMCPConfig();
    }
    
    const serverConfig = this.mcpConfig.servers.find(s => s.serverId === this.id);
    const displayCommand = this.getConnectionDisplayCommand(serverConfig!);

    return {
      id: this.id,
      name: serverConfig?.name || this.id,
      internalName: this.connected ? this.name : undefined,
      version: this.version,
      status: this.connected ? '已连接' : '未连接',
      connectionDetails: {
        connectionType: this.connectionType,
        command: serverConfig?.command || undefined,
        args: serverConfig?.args ? serverConfig.args.join(' ') : undefined,
        mcpUrl: serverConfig?.mcpUrl || undefined,
        headers: serverConfig?.headers || undefined,
        displayCommand
      }
    };
  }

  async getTools(): Promise<ToolInfo[]> {
    if (!this.connected) {
      return [];
    }
    
    try {
      const toolsResponse = await this.client.listTools() as any;
      
      if (!toolsResponse?.tools || !Array.isArray(toolsResponse.tools)) {
        return [];
      }
      
      // Process all tools in parallel with a single map operation
      return await Promise.all(toolsResponse.tools
        .filter((tool: any) => tool !== null && tool !== undefined)
        .map(async (tool: any) => {
          const toolName = tool?.name || "未命名工具";
          const toolDesc = tool?.description || `${toolName}工具`;
          const codeName = await OpenAINameCodec.encode(toolName, this.id);
          const parameters = this.extractParameters(tool);
          const callOptions = this.extractCallOptions(tool);
          
          return {
            name: toolName,
            codeName,
            description: toolDesc,
            parameters,
            serverId: this.id,
            serverName: this.name,
            ...(callOptions && { callOptions })
          };
        }));
        
    } catch (error) {
      Logger.error('SERVER CONNECTION', `获取工具列表失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 从工具的 inputSchema["x-mcp-call-options"] 提取调用选项。
   * 服务端通过此扩展字段声明超时、进度重置等客户端调用行为。
   */
  private extractCallOptions(tool: any): CallToolOptions | undefined {
    const raw = tool?.inputSchema?.['x-mcp-call-options'];
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }
    const opts: CallToolOptions = {};
    if (typeof raw.timeout === 'number') {
      opts.timeout = raw.timeout;
    }
    if (typeof raw.supportsProgress === 'boolean') {
      opts.supportsProgress = raw.supportsProgress;
    }
    return Object.keys(opts).length > 0 ? opts : undefined;
  }
  
  private extractParameters(tool: any): any[] {
    const parameters = [];
    
    try {
      if (tool?.inputSchema?.properties) {
        const props = tool.inputSchema.properties;
        const required = Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : [];
        
        for (const key in props) {
          if (Object.prototype.hasOwnProperty.call(props, key)) {
            const schema = props[key] || {};
            parameters.push({
              name: key,
              type: schema.type,
              description: schema.description || `${key}`,
              required: required.includes(key)
            });
          }
        }
      }
    } catch (err) {
      Logger.error('SERVER CONNECTION', `解析工具参数时出错:`, err);
    }
    return parameters;
  }

  /**
   * 注册全局 progress 通知 handler。
   * Client 实例每次重建后需重新注册，通过 progressHandlers Map 路由到具体回调。
   */
  private setupProgressHandler(): void {
    this.client.setNotificationHandler(ProgressNotificationSchema, (notification) => {
      const { progressToken, progress, total, message } = notification.params;
      Logger.debug('SERVER CONNECTION', `收到 progress 通知 token=${progressToken} [${progress}/${total}] ${message ?? ''}`);
      const handler = this.progressHandlers.get(progressToken);
      if (handler) {
        handler(progress, total, message);
      } else {
        Logger.warn('SERVER CONNECTION', `收到 progress 通知但没有对应 handler，token=${progressToken}`);
      }
    });
  }

  /**
   * 调用工具
   */
  async callTool<T>(toolName: string, args: any, options?: CallToolOptions): Promise<T> {
    if (!this.connected) {
      throw new Error('服务器未连接');
    }

    // 若工具支持进度推送且调用方提供了回调，生成 progressToken 并注册 handler
    const useProgress = options?.supportsProgress === true && typeof options?.onProgress === 'function';
    Logger.debug('SERVER CONNECTION', `callTool [${toolName}] supportsProgress=${options?.supportsProgress} hasOnProgress=${typeof options?.onProgress === 'function'} useProgress=${useProgress}`);
    const progressToken: string | undefined = useProgress
      ? `${this.id}-${toolName}-${++this.progressTokenCounter}`
      : undefined;

    if (progressToken && options!.onProgress) {
      this.progressHandlers.set(progressToken, options!.onProgress);
    }

    try {
      const result = await this.client.callTool(
        {
          name: toolName,
          arguments: args,
          ...(progressToken ? { _meta: { progressToken } } : {})
        },
        undefined,
        {
          timeout: options?.timeout ?? 60000,
          resetTimeoutOnProgress: options?.supportsProgress === true
        }
      ) as T;
      return result;
    } catch (error) {
      Logger.error('SERVER CONNECTION', `调用工具 ${toolName} 失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      if (progressToken) {
        this.progressHandlers.delete(progressToken);
      }
    }
  }

  /**
   * 判断是否已连接
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