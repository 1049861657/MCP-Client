import { ConnectionType } from "../../prisma/generated/index.js";

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
    sseUrl?: string;
    displayCommand?: string; // 用于UI显示的连接命令
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