import { mcpClient } from '../core/mcp/index.js';
import { ConfigService } from './config.service.js';
import { Logger } from '../utils/logger.js';

export type McpReachabilityEntry = { id: string; name: string };

export type McpReachabilityResult = {
  reachableIds: string[];
  unreachable: McpReachabilityEntry[];
};

/**
 * 渠道 Profile 保存时的 MCP 可达性校验。
 * 与 Web 聊天/服务信息页的连接意图解耦：仅探测能否连通，不持久化 isActive，不调用 MCPClientManager.connect。
 */
export class McpReachabilityService {
  /**
   * 过滤出可连通的 MCP ID；未配置或探测失败的 ID 归入 unreachable。
   */
  static async filterReachableServerIds(serverIds: string[]): Promise<McpReachabilityResult> {
    const configured = await ConfigService.listConfiguredMcpServers();
    const nameById = new Map(configured.map((row) => [row.serverId, row.name]));

    const reachableIds: string[] = [];
    const unreachable: McpReachabilityEntry[] = [];

    const uniqueIds = [...new Set(serverIds)];

    await Promise.all(
      uniqueIds.map(async (serverId) => {
        const name = nameById.get(serverId);
        if (name === undefined) {
          unreachable.push({ id: serverId, name: serverId });
          return;
        }

        const ok = await McpReachabilityService.probeServerConnection(serverId);
        if (ok) {
          reachableIds.push(serverId);
        } else {
          unreachable.push({ id: serverId, name });
        }
      })
    );

    reachableIds.sort();
    return { reachableIds, unreachable };
  }

  /**
   * 探测已配置 MCP 是否可达。
   * - 已处于 Web 运行时连接：仅 ping，不断开
   * - 未连接：临时 connect，探测后 disconnect（不更新工具缓存）
   */
  static async probeServerConnection(serverId: string): Promise<boolean> {
    const connection = mcpClient.getConnection(serverId);
    if (!connection) {
      return false;
    }

    const wasConnected = connection.isConnected();

    try {
      if (wasConnected) {
        return await connection.ping();
      }

      return await connection.connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.debug('MCP REACHABILITY', `探测 ${serverId} 失败: ${message}`);
      return false;
    } finally {
      if (!wasConnected && connection.isConnected()) {
        try {
          await connection.disconnect();
        } catch (cleanupError) {
          const message =
            cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
          Logger.debug('MCP REACHABILITY', `探测后清理 ${serverId} 连接失败: ${message}`);
        }
      }
    }
  }
}
