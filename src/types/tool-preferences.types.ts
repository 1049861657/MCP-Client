import type { UnifiedToolResult } from './mcp.types.js';

/** serverId → 工具原名 → 是否启用（缺省视为启用） */
export type McpToolPreferencesStore = Record<string, Record<string, boolean>>;

export interface ServerToolPreferencesBody {
  /** 工具原名 → 是否启用 */
  preferences: Record<string, boolean>;
}

export interface CallServerToolBody {
  /** MCP 工具原名或 codeName */
  toolName: string;
  arguments?: Record<string, unknown>;
}

export interface CallServerToolResponse {
  ok: boolean;
  ms: number;
  output: string;
  error?: string;
  /** P2-04：标准化结果（Info 试跑 structured 展示） */
  unified?: UnifiedToolResult;
}

/** Info 页 MCP Prompt 预览（不进 Harness） */
export interface McpPromptPreviewBody {
  name: string;
  arguments?: Record<string, unknown>;
}
