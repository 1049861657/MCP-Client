import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ClientCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { McpError, ErrorCode, ToolListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
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
  private static readonly CONNECT_TIMEOUT = 60000;
  // 存储当前配置的引用
  private mcpConfig: MCPConfigType | null = null;
  // 服务端在初始化时返回的 instructions（MCP 官方字段）
  private instructions: string | undefined = undefined;
  // 进行中的重连 Promise，用于防止并发重连互相干扰
  private reconnectPromise: Promise<boolean> | null = null;
  // 工具列表变更回调，由 MCPClientManager 注入
  onToolsChanged?: (serverId: string) => void;

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
      
      // 使用 Promise.race 限制连接建立时间，防止 connect() 无限挂起
      await Promise.race([
        this.client.connect(this.transport),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`连接超时（${ServerConnection.CONNECT_TIMEOUT / 1000}s）`)),
            ServerConnection.CONNECT_TIMEOUT
          )
        )
      ]);

      // 挂载 onclose 钩子：transport 断开时主动更新连接状态
      // SDK 在 connect() 后设置自己的 onclose，此处包装而非覆盖，保留 SDK 原有清理逻辑
      const sdkOnClose = this.transport.onclose;
      this.transport.onclose = () => {
        if (this.connected) {
          this.connected = false;
          this.transportClosed = true;
          Logger.warn('SERVER CONNECTION', `[${this.name}] 传输层连接已断开`);
        }
        sdkOnClose?.();
      };

      // 订阅官方 ToolListChangedNotification：服务端主动通知工具列表变更时刷新缓存
      this.client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
        Logger.info('SERVER CONNECTION', `[${this.name}] 收到工具列表变更通知，刷新缓存`);
        this.onToolsChanged?.(this.id);
      });
      
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
   * 重新连接（并发安全：多个并发调用共享同一次重连过程，避免互相干扰）
   */
  async restart(): Promise<boolean> {
    if (this.reconnectPromise) {
      Logger.debug('SERVER CONNECTION', `[${this.name}] 重连已在进行中，等待其完成`);
      return this.reconnectPromise;
    }

    this.reconnectPromise = (async () => {
      try {
        if (this.connected) {
          await this.disconnect();
        }
        return await this.connect();
      } finally {
        this.reconnectPromise = null;
      }
    })();

    return this.reconnectPromise;
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
   * 判断错误是否属于"需要重连"的连接类错误。
   *
   * 三层检测，按可靠性从高到低：
   *  1. MCP 协议层：instanceof McpError + 错误码枚举（不依赖消息字符串）
   *  2. Node.js 网络层：ErrnoException.code 枚举（不依赖消息字符串）
   *  3. Streamable HTTP 传输层：从错误消息内嵌的 JSON-RPC 响应中提取 code 字段
   *     （SDK 将服务端 JSON-RPC 错误体包进普通 Error.message，无法用 instanceof 捕获）
   */
  private isConnectionError(error: unknown): boolean {
    // 1. MCP SDK 类型化错误
    if (error instanceof McpError) {
      return (
        error.code === ErrorCode.ConnectionClosed ||  // -32000：连接关闭 / session 失效
        error.code === ErrorCode.RequestTimeout       // -32001：请求超时
      );
    }

    // 2. Node.js 底层网络错误（使用 code 枚举，与语言无关）
    if (error instanceof Error && 'code' in error) {
      const networkErrorCodes = new Set([
        'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT',
        'EPIPE', 'ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH'
      ]);
      if (networkErrorCodes.has((error as NodeJS.ErrnoException).code ?? '')) {
        return true;
      }
    }

    // 3. Streamable HTTP：SDK 将 JSON-RPC 错误体作为字符串嵌入 Error.message，
    //    提取其中的 code 字段进行数值判断，避免依赖可变的消息文本
    if (error instanceof Error) {
      const jsonMatch = error.message.match(/"code"\s*:\s*(-?\d+)/);
      if (jsonMatch) {
        const code = parseInt(jsonMatch[1], 10);
        return code === ErrorCode.ConnectionClosed || code === ErrorCode.RequestTimeout;
      }
    }

    return false;
  }

  /**
   * 调用工具（含自动重连重试）
   */
  async callTool<T>(toolName: string, args: any, options?: CallToolOptions): Promise<T> {
    // 已知断线时先重连，避免直接把错误抛给上层
    if (!this.connected || this.transportClosed) {
      Logger.info('SERVER CONNECTION', `[${this.name}] 检测到未连接，自动重连中...`);
      await this.restart();
    }

    const useProgress = options?.supportsProgress === true && typeof options?.onProgress === 'function';
    Logger.debug('SERVER CONNECTION', `callTool [${toolName}] supportsProgress=${options?.supportsProgress} hasOnProgress=${typeof options?.onProgress === 'function'} useProgress=${useProgress}`);

    // 使用 SDK 原生 onprogress 机制，确保 resetTimeoutOnProgress 正常生效。
    // 注意：不再自定义 _meta.progressToken，由 SDK 内部以 messageId（数字）管理，
    // 这样 _onprogress 能正确匹配 handler 并重置超时计时器。
    let stepStartTime = Date.now();

    const executeCall = async (): Promise<T> => {
      return await this.client.callTool(
        { name: toolName, arguments: args },
        undefined,
        {
          timeout: options?.timeout ?? 60000,
          resetTimeoutOnProgress: useProgress,
          signal: options?.signal,
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
    };

    try {
      return await executeCall();
    } catch (error) {
      // 连接断开类错误：标记状态、重连、重试一次
      if (this.isConnectionError(error)) {
        Logger.warn('SERVER CONNECTION', `[${this.name}] 工具 ${toolName} 调用失败（连接断开），自动重连后重试...`);
        this.connected = false;
        this.transportClosed = true;
        await this.restart();
        Logger.info('SERVER CONNECTION', `[${this.name}] 重连成功，重试 ${toolName}`);
        return await executeCall();
      }
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