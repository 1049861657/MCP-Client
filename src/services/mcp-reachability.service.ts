import { getMcpClientForUser } from '../core/mcp/index.js';
import type { MCPClientManager } from '../core/mcp/mcp-client-manager.js';
import { ConfigService } from './config.service.js';
import { Logger } from '../utils/logger.js';

export type McpReachabilityEntry = { id: string; name: string };

export type McpReachabilityResult = {
  reachableIds: string[];
  unreachable: McpReachabilityEntry[];
};

/** 保存门禁输出：仅 persistIds 写入 Profile，skipped 返回给 UI 提示 */
export type McpPersistencePartition = {
  persistIds: string[];
  skipped: McpReachabilityEntry[];
};

/**
 * MCP 连通性探测与保存门禁（编排层）。
 * 运行时探测委托 MCPClientManager.ensureServerReachable / partitionServerIdsByReachability，
 * 与 MCP 服务页 connect、ping 共用同一连接池与 connect 路径。
 */
export class McpReachabilityService {
  /**
   * 保存前拆分：仅 persistIds 可写入 Profile。
   */
  static async partitionForPersistence(
    requestedIds: string[],
    configUserId: string | null,
    enableTools: boolean,
  ): Promise<McpPersistencePartition> {
    if (!enableTools) {
      return { persistIds: [], skipped: [] };
    }

    const uniqueIds = [...new Set(requestedIds)];
    if (uniqueIds.length === 0) {
      return { persistIds: [], skipped: [] };
    }

    const { reachableIds, unreachable } = await McpReachabilityService.filterReachableServerIds(
      uniqueIds,
      configUserId,
    );
    if (unreachable.length > 0) {
      Logger.warn(
        'MCP REACHABILITY',
        `渠道保存未写入以下 MCP（探测不可达）: ${unreachable.map((s) => s.name).join('、')}`,
      );
    }
    return { persistIds: reachableIds, skipped: unreachable };
  }

  /**
   * 按连通性拆分 ID 列表（配置校验 + 运行时探测）。
   */
  static async filterReachableServerIds(
    serverIds: string[],
    configUserId: string | null = null,
  ): Promise<McpReachabilityResult> {
    const configured = await ConfigService.listConfiguredMcpServers(configUserId ?? undefined);
    const nameById = new Map(configured.map((row) => [row.serverId, row.name]));

    const uniqueIds = [...new Set(serverIds)];
    const unknownIds: string[] = [];
    const probeIds: string[] = [];

    for (const serverId of uniqueIds) {
      if (nameById.has(serverId)) {
        probeIds.push(serverId);
      } else {
        unknownIds.push(serverId);
      }
    }

    const client = getMcpClientForUser(configUserId);
    const { reachableIds, unreachableIds } = await client.partitionServerIdsByReachability(probeIds);

    const unreachable: McpReachabilityEntry[] = [
      ...unknownIds.map((id) => ({ id, name: id })),
      ...unreachableIds.map((id) => ({ id, name: nameById.get(id) ?? id })),
    ];

    return { reachableIds, unreachable };
  }

  /**
   * 探测单服是否可达（委托 MCPClientManager，与 info 页 connect 同路径）。
   */
  static async probeServerConnection(
    serverId: string,
    configUserId: string | null = null,
    clientOverride?: MCPClientManager,
  ): Promise<boolean> {
    const client = clientOverride ?? getMcpClientForUser(configUserId);
    await client.ensureReady();
    return client.ensureServerReachable(serverId);
  }
}
