import type { Request, Response } from 'express';
import { ConfigChannelId } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import {
  reloadConfigPlaneSnapshot,
  runConfigPlaneSeed
} from '../config-plane/config-snapshot.js';
import type { ChannelId } from '../types/channel.types.js';
import { parseImPermissionMode } from '../config/permission.types.js';
import type { AgentProfileRecord } from '../types/config-plane.types.js';
import { EDITABLE_IM_CHANNEL_PROFILE_IDS } from '../types/config-plane.types.js';
import { McpReachabilityService } from '../services/mcp-reachability.service.js';
import { Logger } from '../utils/logger.js';
import { assertAdminAuth } from './admin-auth.js';

const VALID_CHANNELS: ChannelId[] = ['web', 'feishu', 'dingtalk'];
const EDITABLE_PROFILE_IDS = new Set<string>(EDITABLE_IM_CHANNEL_PROFILE_IDS);

function assertEditableProfileId(profileId: string, res: Response): boolean {
  if (!EDITABLE_PROFILE_IDS.has(profileId)) {
    sendError(
      res,
      403,
      '不可编辑',
      `仅允许修改渠道默认方案：${EDITABLE_IM_CHANNEL_PROFILE_IDS.join('、')}`
    );
    return false;
  }
  return true;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function routeParamToString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function sendError(res: Response, status: number, error: string, details: string): void {
  res.status(status).json({ error, details });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value.filter((item): item is string => typeof item === 'string');
  return items;
}

function parseChannel(value: unknown): ChannelId | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return VALID_CHANNELS.includes(value as ChannelId) ? (value as ChannelId) : undefined;
}

function mapProfileRow(row: {
  profileId: string;
  displayName: string;
  vendor: string | null;
  defaultModel: string;
  temperature: number | null;
  maxTokens: number | null;
  enableTools: boolean;
  enablePrompts: boolean;
  maxToolCallRounds: number;
  permissionMode: string;
  enableAutoCompact: boolean | null;
  compactModel: string | null;
  mcpServerIds: unknown;
  toolPrompt: string | null;
  tenantId: string | null;
  updatedAt: Date;
}): AgentProfileRecord {
  const mcpServerIds = Array.isArray(row.mcpServerIds)
    ? row.mcpServerIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    profileId: row.profileId,
    displayName: row.displayName,
    vendor: row.vendor,
    defaultModel: row.defaultModel,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    enableTools: row.enableTools,
    enablePrompts: row.enablePrompts,
    maxToolCallRounds: row.maxToolCallRounds,
    permissionMode: parseImPermissionMode(row.permissionMode),
    enableAutoCompact: row.enableAutoCompact,
    compactModel: row.compactModel,
    mcpServerIds,
    toolPrompt: row.toolPrompt,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt
  };
}

async function reloadAfterMutation(
  res: Response,
  extra?: Record<string, unknown>
): Promise<void> {
  await reloadConfigPlaneSnapshot();
  res.json({ success: true, ...extra });
}

export class AdminController {
  static async listProfiles(req: Request, res: Response): Promise<void> {
    if (!assertAdminAuth(req, res)) return;
    try {
      const rows = await prisma.agentProfile.findMany({ orderBy: { profileId: 'asc' } });
      res.json(rows.map(mapProfileRow));
    } catch (error: unknown) {
      sendError(res, 500, '获取 Profile 列表失败', getErrorMessage(error));
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    if (!assertAdminAuth(req, res)) return;
    const profileId = routeParamToString(req.params.profileId);
    if (!profileId) {
      sendError(res, 400, '参数无效', 'profileId 不能为空');
      return;
    }
    try {
      const row = await prisma.agentProfile.findUnique({ where: { profileId } });
      if (!row) {
        sendError(res, 404, '未找到', `Profile ${profileId} 不存在`);
        return;
      }
      res.json(mapProfileRow(row));
    } catch (error: unknown) {
      sendError(res, 500, '获取 Profile 失败', getErrorMessage(error));
    }
  }

  static async createProfile(req: Request, res: Response): Promise<void> {
    if (!assertAdminAuth(req, res)) return;
    sendError(res, 403, '不支持', '渠道方案不可新建，仅可修改钉钉/飞书默认方案');
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    if (!assertAdminAuth(req, res)) return;
    const profileId = routeParamToString(req.params.profileId);
    if (!profileId) {
      sendError(res, 400, '参数无效', 'profileId 不能为空');
      return;
    }
    if (!assertEditableProfileId(profileId, res)) return;
    if (!isRecord(req.body)) {
      sendError(res, 400, '参数无效', '请求体无效');
      return;
    }
    try {
      const existing = await prisma.agentProfile.findUnique({ where: { profileId } });
      if (!existing) {
        sendError(res, 404, '未找到', `Profile ${profileId} 不存在`);
        return;
      }

      const data: Record<string, unknown> = {};
      const body = req.body;
      if (typeof body.displayName === 'string') data.displayName = body.displayName.trim();
      if (typeof body.defaultModel === 'string') data.defaultModel = body.defaultModel.trim();
      if (typeof body.vendor === 'string') data.vendor = body.vendor;
      if (body.vendor === null) data.vendor = null;
      if (typeof body.temperature === 'number') data.temperature = body.temperature;
      if (body.temperature === null) data.temperature = null;
      if (typeof body.maxTokens === 'number') data.maxTokens = Math.floor(body.maxTokens);
      if (body.maxTokens === null) data.maxTokens = null;
      if (typeof body.enableTools === 'boolean') data.enableTools = body.enableTools;
      if (typeof body.enablePrompts === 'boolean') data.enablePrompts = body.enablePrompts;
      if (typeof body.maxToolCallRounds === 'number') {
        data.maxToolCallRounds = Math.floor(body.maxToolCallRounds);
      }
      if (body.permissionMode !== undefined) {
        data.permissionMode = parseImPermissionMode(body.permissionMode);
      }
      if (typeof body.enableAutoCompact === 'boolean') data.enableAutoCompact = body.enableAutoCompact;
      if (body.enableAutoCompact === null) data.enableAutoCompact = null;
      if (typeof body.compactModel === 'string') data.compactModel = body.compactModel;
      if (body.compactModel === null) data.compactModel = null;
      const mcpServerIds = parseStringArray(body.mcpServerIds);
      let removedMcpServers: Array<{ id: string; name: string }> = [];
      if (mcpServerIds) {
        const enableTools =
          typeof body.enableTools === 'boolean' ? body.enableTools : existing.enableTools;
        if (enableTools && mcpServerIds.length > 0) {
          const { reachableIds, unreachable } =
            await McpReachabilityService.filterReachableServerIds(mcpServerIds);
          data.mcpServerIds = reachableIds;
          removedMcpServers = unreachable;
          if (removedMcpServers.length > 0) {
            Logger.warn(
              'ADMIN',
              `Profile ${profileId} 移除不可达或未配置 MCP: ${removedMcpServers.map((s) => s.name).join('、')}`
            );
          }
        } else {
          data.mcpServerIds = mcpServerIds;
        }
      }
      if (typeof body.toolPrompt === 'string') data.toolPrompt = body.toolPrompt;
      if (body.toolPrompt === null) data.toolPrompt = null;

      await prisma.agentProfile.update({ where: { profileId }, data });
      Logger.info('ADMIN', `更新 Profile ${profileId}`);
      await reloadAfterMutation(
        res,
        removedMcpServers.length > 0 ? { removedMcpServers } : undefined
      );
    } catch (error: unknown) {
      sendError(res, 500, '更新 Profile 失败', getErrorMessage(error));
    }
  }

  static async deleteProfile(req: Request, res: Response): Promise<void> {
    if (!assertAdminAuth(req, res)) return;
    sendError(res, 403, '不支持', '渠道方案不可删除');
  }

  static async listRoutes(req: Request, res: Response): Promise<void> {
    if (!assertAdminAuth(req, res)) return;
    try {
      const channel = parseChannel(req.query.channel);
      const rows = await prisma.routeRule.findMany({
        where: channel ? { channel: channel as ConfigChannelId } : undefined,
        orderBy: [{ channel: 'asc' }, { priority: 'asc' }]
      });
      res.json(rows);
    } catch (error: unknown) {
      sendError(res, 500, '获取 Route 列表失败', getErrorMessage(error));
    }
  }

  static async createRoute(req: Request, res: Response): Promise<void> {
    if (!assertAdminAuth(req, res)) return;
    if (!isRecord(req.body)) {
      sendError(res, 400, '参数无效', '请求体无效');
      return;
    }
    const channel = parseChannel(req.body.channel);
    const matchKey = typeof req.body.matchKey === 'string' ? req.body.matchKey.trim() : '';
    const profileId =
      typeof req.body.profileId === 'string' ? req.body.profileId.trim() : '';
    if (!channel || !matchKey || !profileId) {
      sendError(res, 400, '参数无效', 'channel、matchKey、profileId 为必填');
      return;
    }
    const priority =
      typeof req.body.priority === 'number' ? Math.floor(req.body.priority) : 100;
    const enabled = typeof req.body.enabled === 'boolean' ? req.body.enabled : true;

    try {
      const row = await prisma.routeRule.create({
        data: {
          channel: channel as ConfigChannelId,
          matchKey,
          profileId,
          priority,
          enabled
        }
      });
      Logger.info('ADMIN', `创建 Route ${row.id} channel=${channel}`);
      await reloadAfterMutation(res);
    } catch (error: unknown) {
      sendError(res, 500, '创建 Route 失败', getErrorMessage(error));
    }
  }

  static async updateRoute(req: Request, res: Response): Promise<void> {
    if (!assertAdminAuth(req, res)) return;
    const routeId = routeParamToString(req.params.routeId);
    if (!routeId) {
      sendError(res, 400, '参数无效', 'routeId 不能为空');
      return;
    }
    if (!isRecord(req.body)) {
      sendError(res, 400, '参数无效', '请求体无效');
      return;
    }
    try {
      const data: Record<string, unknown> = {};
      const channel = parseChannel(req.body.channel);
      if (channel) data.channel = channel;
      if (typeof req.body.matchKey === 'string') data.matchKey = req.body.matchKey.trim();
      if (typeof req.body.profileId === 'string') data.profileId = req.body.profileId.trim();
      if (typeof req.body.priority === 'number') data.priority = Math.floor(req.body.priority);
      if (typeof req.body.enabled === 'boolean') data.enabled = req.body.enabled;

      await prisma.routeRule.update({ where: { id: routeId }, data });
      Logger.info('ADMIN', `更新 Route ${routeId}`);
      await reloadAfterMutation(res);
    } catch (error: unknown) {
      sendError(res, 500, '更新 Route 失败', getErrorMessage(error));
    }
  }

  static async deleteRoute(req: Request, res: Response): Promise<void> {
    if (!assertAdminAuth(req, res)) return;
    const routeId = routeParamToString(req.params.routeId);
    if (!routeId) {
      sendError(res, 400, '参数无效', 'routeId 不能为空');
      return;
    }
    try {
      await prisma.routeRule.delete({ where: { id: routeId } });
      Logger.info('ADMIN', `删除 Route ${routeId}`);
      await reloadAfterMutation(res);
    } catch (error: unknown) {
      sendError(res, 500, '删除 Route 失败', getErrorMessage(error));
    }
  }

  /** 手工触发 seed（空库全量写入，或补齐缺失的默认方案） */
  static async seedDefaults(req: Request, res: Response): Promise<void> {
    if (!assertAdminAuth(req, res)) return;
    try {
      const result = await runConfigPlaneSeed();
      const didWrite =
        result.seededEmpty || result.createdProfiles > 0 || result.createdRoutes > 0;
      let message = '无需初始化，默认方案已存在';
      if (result.seededEmpty) {
        message = '空库初始化完成';
      } else if (didWrite) {
        message = `已补齐 ${result.createdProfiles} 个方案、${result.createdRoutes} 条路由`;
      }
      if (didWrite) {
        await reloadConfigPlaneSnapshot();
        res.json({ success: true, message, ...result });
        return;
      }
      res.json({ success: true, message, ...result });
    } catch (error: unknown) {
      sendError(res, 500, 'seed 失败', getErrorMessage(error));
    }
  }
}
