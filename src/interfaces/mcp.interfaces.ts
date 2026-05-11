import { ConnectionType } from '../generated/prisma/client.js';

/**
 * Deepseek聊天请求接口
 */
export interface DeepseekChatRequest {
  message: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Deepseek聊天响应接口
 */
export interface DeepseekChatResponse {
  result: {
    content: string;
    model: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }
  }
}

/**
 * 错误响应接口
 */
export interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * 调用工具时可传入的选项
 */
export interface CallToolOptions {
  /**
   * 请求超时时间（毫秒）。不传则使用 ServerConnection.CALL_TOOL_TIMEOUT 默认值。
   */
  timeout?: number;
  /**
   * 服务端通过 x-mcp-call-options.supportsProgress 声明该工具支持进度推送。
   * 客户端在 listTools 时读取并缓存，callTool 时若 onProgress 存在则自动附加 progressToken。
   * supportsProgress=true 时自动启用 resetTimeoutOnProgress（每步超时语义）。
   */
  supportsProgress?: boolean;
  /**
   * 进度回调。仅当工具声明了 supportsProgress: true 时生效。
   * 参数：progress（当前步骤）、total（总步骤，可选）、message（本步描述，可选）。
   */
  onProgress?: (progress: number, total: number | undefined, message: string | undefined) => void;
}

/**
 * 工具参数定义
 */
export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

/**
 * 工具定义
 */
export interface ToolInfo {
  name: string;
  //编码工具名称（防止工具重名）
  codeName: string;
  description: string;
  parameters: ToolParameter[];
  //工具来源的服务器ID
  serverId: string;
  //工具来源服务器名称
  serverName: string;
  /**
   * 服务端通过 inputSchema["x-mcp-call-options"] 声明的调用选项。
   * 客户端在 listTools 时读取并缓存，callTool 时自动应用。
   */
  callOptions?: CallToolOptions;
}


/**
 * 服务器信息
 */
export interface ServerInfo {
  id: string;
  name: string;
  /**
   * 服务器内部名称（服务器自己报告的名称）
   */
  internalName?: string;
  version: string;
  status: string;
  connectionDetails: {
    connectionType: ConnectionType;
    command?: string;
    args?: string;
    mcpUrl?: string;
    headers?: Record<string, string>;
    displayCommand?: string;
  };
}

/**
 * 客户端信息
 */
export interface ClientInfo {
  name: string;
  version: string;
}

/**
 * MCP服务器信息
 */
export interface MCPServerInfo {
  /**
   * 当前选中的服务器ID
   */
  currentServerId?: string;
  /**
   * 当前连接的服务器信息（兼容旧版单服务器模式）
   */
  server: ServerInfo;
  /**
   * 所有已连接服务器的工具列表
   */
  tools: ToolInfo[];
  /**
   * 所有可用的服务器列表
   */
  availableServers?: ServerInfo[];
  /**
   * 已连接的服务器列表
   */
  connectedServers?: ServerInfo[];
  /**
   * 每个服务器的工具映射 {serverId: ToolInfo[]}
   */
  serverTools?: Record<string, ToolInfo[]>;
} 