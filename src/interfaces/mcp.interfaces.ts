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
  description: string;
  parameters: ToolParameter[];
}

/**
 * MCP服务器配置
 */
export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
}

/**
 * 服务器信息
 */
export interface ServerInfo {
  id: string;
  name: string;
  version: string;
  status: string;
  connectionDetails: {
    command: string;
    args: string;
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
  server: ServerInfo;
  client: ClientInfo;
  tools: ToolInfo[];
  availableServers?: ServerInfo[];
  currentServerId?: string;
} 