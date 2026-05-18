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
 * 调用工具时可传入的运行时选项。
 * 由调用方按需在 callTool 时显式传入，不再从工具 schema 中提取。
 */
export interface CallToolOptions {
  /**
   * 请求超时时间（毫秒）。不传则使用 SDK 默认值 60s。
   * supportsProgress=true 时为单步空闲超时（每次进度通知都会重置）。
   */
  timeout?: number;
  /**
   * 调用方声明该工具本次调用会持续推送进度通知。
   * 启用后客户端自动开启 SDK 的 resetTimeoutOnProgress，并需配合 onProgress 回调使用。
   */
  supportsProgress?: boolean;
  /**
   * 进度回调。仅当 supportsProgress=true 时生效。
   * 参数：progress（当前步骤）、total（总步骤，可选）、message（本步描述，可选）、elapsed_ms（上一步耗时毫秒，可选）。
   */
  onProgress?: (progress: number, total: number | undefined, message: string | undefined, elapsed_ms?: number) => void;
  /**
   * 取消信号。调用方可通过 AbortController 在工具执行中途取消请求。
   */
  signal?: AbortSignal;
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