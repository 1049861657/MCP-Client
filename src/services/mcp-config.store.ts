/**
 * 账号级 MCP 配置 SSOT。
 * 已登录无 tombstone → 继承 userId=null 基线；有 tombstone → 读本账号覆盖。含 TTL 缓存与 lastGood 回退。
 */
import { LRUCache } from 'lru-cache';

import { McpPoolConfig } from '../config/feature-config.js';
import { prisma } from '../lib/prisma.js';
import type { MCPConfigType, MCPServer } from '../types/config.types.js';
import { McpServerAuthService } from './mcp-server-auth.service.js';
import { Logger } from '../utils/logger.js';

const MCP_TOOL_PROMPT_KEY = 'mcpToolPrompt';

function cacheKey(userId?: string): string {
  return userId ?? 'null';
}

const mcpConfigCache = new LRUCache<string, MCPConfigType>({
  max: McpPoolConfig.configCacheMaxEntries,
  ttl: McpPoolConfig.configCacheTtlMs,
});

/** DB 瞬时故障时回退最近一次成功快照（对齐 config-snapshot lastGood） */
const lastGoodMcpConfig = new Map<string, MCPConfigType>();

export type ReloadMcpScope = 'all' | { serverId: string };

async function hasUserMcpTombstone(userId: string): Promise<boolean> {
  const row = await prisma.setting.findFirst({
    where: { userId, key: MCP_TOOL_PROMPT_KEY },
  });
  return row !== null;
}

async function loadSeedServerRows(): Promise<Awaited<ReturnType<typeof prisma.mCPServer.findMany>>> {
  return prisma.mCPServer.findMany({ where: { userId: null } });
}

async function loadToolPrompt(userId?: string): Promise<string> {
  if (userId) {
    const userRow = await prisma.setting.findFirst({ where: { userId, key: MCP_TOOL_PROMPT_KEY } });
    if (userRow !== null) {
      return userRow.value !== null ? String(userRow.value) : '';
    }
    // 无 tombstone → inherit seed toolPrompt
  }
  const seedRow = await prisma.setting.findFirst({ where: { userId: null, key: MCP_TOOL_PROMPT_KEY } });
  if (!seedRow || seedRow.value === null) {
    return '';
  }
  return String(seedRow.value);
}

function mapServerRows(
  servers: Awaited<ReturnType<typeof prisma.mCPServer.findMany>>
): MCPServer[] {
  return servers.map((server) => ({
    serverId: server.serverId,
    name: server.name,
    enabled: server.enabled,
    connectionType: server.connectionType,
    command: server.command || undefined,
    args: (server.args as string[]) || undefined,
    mcpUrl: server.mcpUrl || undefined,
    headers: (server.headers as Record<string, string>) || undefined,
  }));
}

async function loadFromDb(userId?: string): Promise<MCPConfigType> {
  let rows: Awaited<ReturnType<typeof prisma.mCPServer.findMany>>;
  if (userId) {
    if (await hasUserMcpTombstone(userId)) {
      rows = await prisma.mCPServer.findMany({ where: { userId } });
    } else {
      rows = await loadSeedServerRows();
    }
  } else {
    rows = await loadSeedServerRows();
  }

  const toolPrompt = await loadToolPrompt(userId);
  return {
    servers: mapServerRows(rows),
    toolPrompt,
    enabledToolServerIds: [],
  };
}

export function invalidateMcpConfigCache(userId?: string): void {
  if (userId !== undefined) {
    mcpConfigCache.delete(cacheKey(userId));
  } else {
    mcpConfigCache.clear();
  }
}

export class McpConfigStore {
  /** 该账号是否已写入 MCP 覆盖（含空列表） */
  static async hasUserOverride(userId: string): Promise<boolean> {
    return hasUserMcpTombstone(userId);
  }

  /** 解析生效 MCP 配置 */
  static async get(userId?: string): Promise<MCPConfigType> {
    const key = cacheKey(userId);
    const hit = mcpConfigCache.get(key);
    if (hit !== undefined) {
      return hit;
    }

    try {
      const config = await loadFromDb(userId);
      mcpConfigCache.set(key, config);
      lastGoodMcpConfig.set(key, config);
      return config;
    } catch (error) {
      const fallback = lastGoodMcpConfig.get(key);
      if (fallback !== undefined) {
        Logger.error('MCP CONFIG', `读取配置失败，回退缓存 key=${key}:`, error);
        return fallback;
      }
      Logger.error('MCP CONFIG', `读取配置失败 key=${key}:`, error);
      throw error;
    }
  }

  /** 全量替换该配置桶（增删改列表 / 表单保存） */
  static async saveFull(config: MCPConfigType, userId?: string): Promise<void> {
    const resolvedUserId = userId ?? null;
    await McpConfigStore.writeToolPromptTombstone(config.toolPrompt, userId);

    await prisma.mCPServer.deleteMany({ where: { userId: resolvedUserId } });
    for (const server of config.servers) {
      await prisma.mCPServer.create({
        data: {
          userId: resolvedUserId,
          serverId: server.serverId,
          name: server.name,
          enabled: Boolean(server.enabled),
          connectionType: server.connectionType,
          command: server.command,
          args: server.args as never,
          mcpUrl: server.mcpUrl,
          headers: server.headers as never,
        },
      });
    }

    await McpServerAuthService.deleteExcept(
      config.servers.map((s) => s.serverId),
      userId
    );

    if (resolvedUserId === null) {
      invalidateMcpConfigCache();
    } else {
      invalidateMcpConfigCache(userId);
    }
  }

  /** 首次写入前从 seed 基线 fork 覆盖层（Info connect / 表单保存） */
  static async forkFromSeedIfNeeded(userId: string): Promise<void> {
    if (await hasUserMcpTombstone(userId)) {
      return;
    }
    const seedConfig = await loadFromDb(undefined);
    await McpConfigStore.saveFull(seedConfig, userId);
  }

  /** 切换单服 enabled（connect/disconnect 专用）；无覆盖时先 fork seed */
  static async setServerEnabled(userId: string, serverId: string, enabled: boolean): Promise<void> {
    await McpConfigStore.forkFromSeedIfNeeded(userId);

    const row = await prisma.mCPServer.findFirst({ where: { userId, serverId } });
    if (!row) {
      throw new Error(`MCP 服务器不存在: ${serverId}`);
    }
    await prisma.mCPServer.update({ where: { id: row.id }, data: { enabled } });
    invalidateMcpConfigCache(userId);
  }

  static async reset(userId: string): Promise<void> {
    await prisma.mCPServer.deleteMany({ where: { userId } });
    await prisma.setting.deleteMany({ where: { userId, key: MCP_TOOL_PROMPT_KEY } });
    invalidateMcpConfigCache(userId);
  }

  private static async writeToolPromptTombstone(toolPrompt: string, userId?: string): Promise<void> {
    const resolvedUserId = userId ?? null;
    const existing = await prisma.setting.findFirst({
      where: { userId: resolvedUserId, key: MCP_TOOL_PROMPT_KEY },
    });
    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: toolPrompt as never },
      });
    } else {
      await prisma.setting.create({
        data: { key: MCP_TOOL_PROMPT_KEY, value: toolPrompt as never, userId: resolvedUserId },
      });
    }
  }
}
