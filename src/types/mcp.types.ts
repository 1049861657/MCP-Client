import { ConnectionType } from '../generated/prisma/client.js';

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

/** 工具参数定义 */
export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

/** MCP 资源条目（info 展示，不进对话） */
export interface McpResourceInfo {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
  serverId: string;
  serverName: string;
}

/** MCP Prompt 模板条目（info 展示，不进对话） */
export interface McpPromptInfo {
  name: string;
  description?: string;
  arguments?: McpPromptArgumentInfo[];
  serverId: string;
  serverName: string;
}

export interface McpPromptArgumentInfo {
  name: string;
  description?: string;
  required?: boolean;
}

/** 工具定义 */
export interface ToolInfo {
  name: string;
  /** 编码工具名称（防止工具重名） */
  codeName: string;
  description: string;
  parameters: ToolParameter[];
  /** 工具来源的服务器 ID */
  serverId: string;
  /** 工具来源服务器名称 */
  serverName: string;
}

import type { McpConnectionStatus } from './mcp-connection.types.js';

/** MCP 服务器连接信息 */
export interface ServerInfo {
  id: string;
  name: string;
  /** 服务器内部名称（服务器自己报告的名称） */
  internalName?: string;
  version: string;
  status: McpConnectionStatus;
  /** needs-auth 时可供浏览器打开的 OAuth 授权 URL */
  authorizationUrl?: string;
  /** 是否走 OAuth（HTTP 且无静态 headers） */
  usesOAuth?: boolean;
  connectionDetails: {
    connectionType: ConnectionType;
    command?: string;
    args?: string;
    mcpUrl?: string;
    headers?: Record<string, string>;
    displayCommand?: string;
  };
}

/** MCP 客户端信息 */
export interface ClientInfo {
  name: string;
  version: string;
}

/** 工具结果来源（Harness / Info / SSE 统一契约） */
export type ToolResultSource = 'mcp' | 'system';

/** 标准化工具结果状态 */
export type UnifiedToolResultStatus = 'success' | 'error';

/**
 * 统一 tool_result 形态（P2-04）
 * `rawPath` 对接 `ToolOutputArtifact.filePath`（大结果落盘后写入）
 */
export interface UnifiedToolResult {
  source: ToolResultSource;
  serverId?: string;
  serverName?: string;
  tool: string;
  status: UnifiedToolResultStatus;
  /** 面向 LLM / UI 的文本摘要 */
  preview: string;
  structured?: unknown;
  rawPath?: string;
  /** MCP CallToolResult.isError */
  isMcpError?: boolean;
}

/** MCP 聚合视图（多服务器工具列表） */
export interface MCPServerInfo {
  /** 当前选中的服务器 ID */
  currentServerId?: string;
  /** 当前连接的服务器信息（兼容旧版单服务器模式） */
  server: ServerInfo;
  /** 所有已连接服务器的工具列表 */
  tools: ToolInfo[];
  /** 所有可用的服务器列表 */
  availableServers?: ServerInfo[];
  /** 已连接的服务器列表 */
  connectedServers?: ServerInfo[];
  /** 每个服务器的工具映射 {serverId: ToolInfo[]} */
  serverTools?: Record<string, ToolInfo[]>;
  /** 各服务器 per-tool 启用偏好（缺省启用） */
  toolPreferences?: Record<string, Record<string, boolean>>;
  /** 各服务器 MCP resources 列表（仅 info） */
  serverResources?: Record<string, McpResourceInfo[]>;
  /** 各服务器 MCP prompts 列表（仅 info） */
  serverPrompts?: Record<string, McpPromptInfo[]>;
}
