import { Logger } from '../../utils/logger.js';

/** 单次 MCP 工具调用审计记录（P0-06-01） */
export interface ToolCallAuditLog {
  requestId: string;
  round: number;
  toolName: string;
  codeName: string;
  serverId: string | null;
  durationMs: number;
  success: boolean;
  error?: string;
}

export function logToolCallAudit(entry: ToolCallAuditLog): void {
  Logger.audit({
    type: 'tool_call_audit',
    ...entry
  });
}
