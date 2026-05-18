import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ClientCapabilities } from "@modelcontextprotocol/sdk/types.js";
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
  // 服务端在初始化时返回的 instructions（MCP 官方字段）
  private instructions: string | undefined = undefined;

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
      
      const serverVersion = this.client.getServerVersion();
      if (serverVersion) {
        this.name = serverVersion.name || this.name;
        this.version = serverVersion.version || "未知";
      }

      // 缓存服务端 instructions（MCP 官方字段，初始化握手时由服务端返回）
      this.instructions = this.client.getInstructions() ?? undefined;
      if (this.instructions) {
        Logger.debug('SERVER CONNECTION', `服务器 ${this.name} 返回 instructions（${this.instructions.length} 字符）`);
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
      
      return await Promise.all(toolsResponse.tools
        .filter((tool: any) => tool !== null && tool !== undefined)
        .map(async (tool: any) => {
          const toolName = tool?.name || "未命名工具";
          const toolDesc = tool?.description || `${toolName}工具`;
          const codeName = OpenAINameCodec.encode(toolName, this.id);
          const parameters = this.extractParameters(tool);
          
          return {
            name: toolName,
            codeName,
            description: toolDesc,
            parameters,
            serverId: this.id,
            serverName: this.name
          };
        }));
        
    } catch (error) {
      Logger.error('SERVER CONNECTION', `获取工具列表失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
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
   * 调用工具
   */
  async callTool<T>(toolName: string, args: any, options?: CallToolOptions): Promise<T> {
    if (!this.connected) {
      throw new Error('服务器未连接');
    }

    const useProgress = options?.supportsProgress === true && typeof options?.onProgress === 'function';
    Logger.debug('SERVER CONNECTION', `callTool [${toolName}] supportsProgress=${options?.supportsProgress} hasOnProgress=${typeof options?.onProgress === 'function'} useProgress=${useProgress}`);

    // 使用 SDK 原生 onprogress 机制，确保 resetTimeoutOnProgress 正常生效。
    // 注意：不再自定义 _meta.progressToken，由 SDK 内部以 messageId（数字）管理，
    // 这样 _onprogress 能正确匹配 handler 并重置超时计时器。
    let stepStartTime = Date.now();

    try {
      const result = await this.client.callTool(
        { name: toolName, arguments: args },
        undefined,
        {
          timeout: options?.timeout ?? 60000,
          resetTimeoutOnProgress: useProgress,
          ...(useProgress ? {
            onprogress: (progressData: { progress: number; total?: number; message?: string }) => {
              const now = Date.now();
              const elapsed_ms = now - stepStartTime;
              stepStartTime = now;
              Logger.debug('SERVER CONNECTION', `收到 progress 通知 [${progressData.progress}/${progressData.total}] ${progressData.message ?? ''}`);
              options!.onProgress!(progressData.progress, progressData.total, progressData.message, elapsed_ms);
            }
          } : {})
        }
      ) as T;
      return result;
    } catch (error) {
      Logger.error('SERVER CONNECTION', `调用工具 ${toolName} 失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取服务端在初始化时返回的 instructions（MCP 官方字段）
   * 连接成功后才有值，未连接或服务端未设置时返回 undefined
   */
  getInstructions(): string | undefined {
    return this.instructions;
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