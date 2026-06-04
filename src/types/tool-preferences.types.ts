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
}

/** Info 页 MCP Prompt 预览（不进 Harness） */
export interface McpPromptPreviewBody {
  name: string;
  arguments?: Record<string, unknown>;
}
