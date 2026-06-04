/** MCP 单服连接状态机（stdio 无 needs-auth） */
export type McpConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'needs-auth'
  | 'failed';

export const McpConnectionStatus = {
  Disconnected: 'disconnected',
  Connecting: 'connecting',
  Connected: 'connected',
  NeedsAuth: 'needs-auth',
  Failed: 'failed',
} as const satisfies Record<string, McpConnectionStatus>;

export function isMcpConnected(status: McpConnectionStatus): boolean {
  return status === McpConnectionStatus.Connected;
}
