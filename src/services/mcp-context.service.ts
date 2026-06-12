import type { Request } from 'express';

import { getMcpClientForUser, MCPClientManager } from '../core/mcp/mcp-client-manager.js';
import type { ResolvedChatProfile } from '../types/config-plane.types.js';
import { resolvePrincipal, type RequestPrincipal } from './runtime-context.service.js';

export type { RequestPrincipal };
export { resolvePrincipal };

/** resolveProfile 输出必带 configUserId（含 null = seed 池）；禁止用 userId 回退 */
export type McpPoolKeySource = Pick<ResolvedChatProfile, 'configUserId'>;

/**
 * MCP / Provider 连接池键 SSOT。
 * userId 仅用于 DB 落库；configUserId 由 resolveProfile / resolveMcpConfigUserIdFromRequest 解析。
 */
export function resolveMcpPoolKey(profile: McpPoolKeySource | undefined): string | null {
  return profile?.configUserId ?? null;
}

/** 解析 MCP/Provider 配置池键（委托 resolvePrincipal SSOT） */
export async function resolveMcpConfigUserIdFromRequest(req: Request): Promise<string | null> {
  return (await resolvePrincipal(req)).configUserId;
}

/** 按请求上下文获取 MCP 客户端（LRU per-user 池 / 全局 seed 单例） */
export async function resolveMcpClientFromRequest(req: Request): Promise<MCPClientManager> {
  const configUserId = await resolveMcpConfigUserIdFromRequest(req);
  return getMcpClientForUser(configUserId);
}

/** requireAuth 路由：同步取当前登录用户的 MCP 配置桶 */
export function requireMcpConfigUserId(req: Request): string {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('MCP 写操作需要登录用户');
  }
  return userId;
}

export function mcpClientForConfigUser(configUserId: string | null): MCPClientManager {
  return getMcpClientForUser(configUserId);
}
