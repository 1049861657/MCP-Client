import type { Request, Response } from 'express';
import { ConfigChannelId } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import {
  ensureChannelDefaultProfilesAndRoutes,
  reloadConfigPlaneSnapshot,
  runConfigPlaneSeed,
} from '../config-plane/config-snapshot.js';
import { resolveChannelBindingContext } from '../services/channel-binding.service.js';
import {
  getChannelConfigEditorState,
  saveChannelConfig,
} from '../services/channel-config.service.js';
import { getDingtalkLinkStatus } from '../channels/dingtalk/dingtalk-stream-listener.js';
import { getFeishuLinkStatus } from '../channels/feishu/feishu-event-listener.js';
import type { ChannelId } from '../types/channel.types.js';
import { parseImPermissionMode } from '../config/permission.types.js';
import type { PermissionMode } from '../config/permission.types.js';
import type { AgentProfileRecord } from '../types/config-plane.types.js';
import {
  CHANNEL_DEFAULT_PROFILE_BY_CHANNEL,
  EDITABLE_IM_CHANNEL_PROFILE_IDS
} from '../types/config-plane.types.js';
import { ConfigService } from '../services/config.service.js';
import { McpReachabilityService } from '../services/mcp-reachability.service.js';
import { Logger } from '../utils/logger.js';
import { SUPERADMIN_ROLE } from '../lib/auth.js';

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
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function sendError(res: Response, status: number, error: string, details: string): void {
  res.status(status).json({ error, details });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

function parseChannel(value: unknown): ChannelId | undefined {
  if (typeof value !== 'string') return undefined;
  return VALID_CHANNELS.includes(value as ChannelId) ? (value as ChannelId) : undefined;
}

function assertSuperAdmin(req: Request, res: Response): boolean {
  if (req.user?.role !== SUPERADMIN_ROLE) {
    sendError(res, 403, '无权限', '仅超级管理员可修改渠道配置');
    return false;
  }
  return true;
}

type ProfileRowRaw = {
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
};

function mapProfileRow(row: ProfileRowRaw): AgentProfileRecord {
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
    mcpServerIds: Array.isArray(row.mcpServerIds)
      ? row.mcpServerIds.filter((id): id is string => typeof id === 'string')
      : [],
    toolPrompt: row.toolPrompt,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt
  };
}

/** 渠道配置写后失效全局快照缓存 */
async function reloadAfterMutation(
  res: Response,
  extra?: Record<string, unknown>
): Promise<void> {
  reloadConfigPlaneSnapshot();
  res.json({ success: true, ...extra });
}

export class AdminController {
  /** 列出全局渠道 Profile */
  static async listProfiles(_req: Request, res: Response): Promise<void> {
    try {
      const rows = await prisma.agentProfile.findMany({ orderBy: { profileId: 'asc' } });
      res.json(rows.map((r) => mapProfileRow(r)));
    } catch (error: unknown) {
      sendError(res, 500, '获取 Profile 列表失败', getErrorMessage(error));
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
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
    sendError(res, 403, '不支持', '渠道方案不可新建，仅可修改钉钉/飞书默认方案');
  }

  /** 更新全局渠道 Profile（仅超管） */
  static async updateProfile(req: Request, res: Response): Promise<void> {
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
    if (!assertSuperAdmin(req, res)) return;

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
      let skippedMcpServers: Array<{ id: string; name: string }> = [];
      if (mcpServerIds) {
        const enableTools =
          typeof body.enableTools === 'boolean' ? body.enableTools : existing.enableTools;
        const imChannel = (['dingtalk', 'feishu'] as const).find(
          (ch) => CHANNEL_DEFAULT_PROFILE_BY_CHANNEL[ch] === profileId
        );
        let reachabilityConfigUserId: string | null = null;
        if (imChannel) {
          const binding = await resolveChannelBindingContext({ channel: imChannel });
          reachabilityConfigUserId = binding.configUserId;
        }
        const partition = await McpReachabilityService.partitionForPersistence(
          mcpServerIds,
          reachabilityConfigUserId,
          enableTools,
        );
        data.mcpServerIds = partition.persistIds;
        skippedMcpServers = partition.skipped;
        if (skippedMcpServers.length > 0) {
          Logger.warn(
            'ADMIN',
            `Profile ${profileId} 跳过不可达 MCP: ${skippedMcpServers.map((s) => s.name).join('、')}`
          );
        }
      }
      if (typeof body.toolPrompt === 'string') data.toolPrompt = body.toolPrompt;
      if (body.toolPrompt === null) data.toolPrompt = null;

      await prisma.agentProfile.update({
        where: { profileId },
        data
      });

      Logger.info('ADMIN', `更新渠道 Profile ${profileId}`);
      await reloadAfterMutation(
        res,
        skippedMcpServers.length > 0 ? { skippedMcpServers } : undefined
      );
    } catch (error: unknown) {
      sendError(res, 500, '更新 Profile 失败', getErrorMessage(error));
    }
  }

  static async deleteProfile(req: Request, res: Response): Promise<void> {
    sendError(res, 403, '不支持', '渠道方案不可删除');
  }

  /** @deprecated 渠道 Profile 已全局化，无 per-user 覆盖可重置 */
  static async resetProfile(_req: Request, res: Response): Promise<void> {
    sendError(res, 410, '已废弃', '渠道方案为全局配置，不支持按用户重置');
  }

  /** 列出全局渠道路由（读前补齐缺失的默认通配路由） */
  static async listRoutes(req: Request, res: Response): Promise<void> {
    try {
      const { createdProfiles, createdRoutes } = await ensureChannelDefaultProfilesAndRoutes();
      if (createdProfiles > 0 || createdRoutes > 0) {
        reloadConfigPlaneSnapshot();
      }
      const channel = parseChannel(req.query.channel);
      const channelFilter = channel ? { channel: channel as ConfigChannelId } : {};
      const rows = await prisma.routeRule.findMany({
        where: channelFilter,
        orderBy: [{ channel: 'asc' }, { priority: 'asc' }],
      });
      res.json(rows);
    } catch (error: unknown) {
      sendError(res, 500, '获取 Route 列表失败', getErrorMessage(error));
    }
  }

  static async createRoute(req: Request, res: Response): Promise<void> {
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
    if (!assertSuperAdmin(req, res)) return;
    const boundUserId =
      typeof req.body.boundUserId === 'string' ? req.body.boundUserId.trim() || null : null;

    try {
      const row = await prisma.routeRule.create({
        data: {
          boundUserId,
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
    const routeId = routeParamToString(req.params.routeId);
    if (!routeId) {
      sendError(res, 400, '参数无效', 'routeId 不能为空');
      return;
    }
    if (!isRecord(req.body)) {
      sendError(res, 400, '参数无效', '请求体无效');
      return;
    }
    if (!assertSuperAdmin(req, res)) return;
    try {
      const existing = await prisma.routeRule.findUnique({ where: { id: routeId } });
      if (!existing) {
        sendError(res, 404, '未找到', `Route ${routeId} 不存在`);
        return;
      }
      const data: Record<string, unknown> = {};
      const channel = parseChannel(req.body.channel);
      if (channel) data.channel = channel;
      if (typeof req.body.matchKey === 'string') data.matchKey = req.body.matchKey.trim();
      if (typeof req.body.profileId === 'string') data.profileId = req.body.profileId.trim();
      if (typeof req.body.priority === 'number') data.priority = Math.floor(req.body.priority);
      if (typeof req.body.enabled === 'boolean') data.enabled = req.body.enabled;
      if (typeof req.body.boundUserId === 'string') {
        // T4-06-06：仅超管可修改 boundUserId
        if (req.user?.role !== SUPERADMIN_ROLE) {
          sendError(res, 403, '无权限', '仅超级管理员可修改渠道绑定账号');
          return;
        }
        data.boundUserId = req.body.boundUserId.trim() || null;
      }
      if (req.body.boundUserId === null) {
        if (req.user?.role !== SUPERADMIN_ROLE) {
          sendError(res, 403, '无权限', '仅超级管理员可修改渠道绑定账号');
          return;
        }
        data.boundUserId = null;
      }

      await prisma.routeRule.update({ where: { id: routeId }, data });
      Logger.info('ADMIN', `更新 Route ${routeId}`);
      await reloadAfterMutation(res);
    } catch (error: unknown) {
      sendError(res, 500, '更新 Route 失败', getErrorMessage(error));
    }
  }

  static async deleteRoute(req: Request, res: Response): Promise<void> {
    const routeId = routeParamToString(req.params.routeId);
    if (!routeId) {
      sendError(res, 400, '参数无效', 'routeId 不能为空');
      return;
    }
    try {
      const existing = await prisma.routeRule.findUnique({ where: { id: routeId } });
      if (!existing) {
        sendError(res, 404, '未找到', `Route ${routeId} 不存在`);
        return;
      }
      if (!assertSuperAdmin(req, res)) return;

      await prisma.routeRule.delete({ where: { id: routeId } });
      Logger.info('ADMIN', `删除 Route ${routeId}`);
      await reloadAfterMutation(res);
    } catch (error: unknown) {
      sendError(res, 500, '删除 Route 失败', getErrorMessage(error));
    }
  }

  /** T4-07-05：IM SDK 连接态（绿/红/灰点） */
  static async getChannelStatus(req: Request, res: Response): Promise<void> {
    if (req.user?.role !== SUPERADMIN_ROLE) {
      sendError(res, 403, '无权限', '仅超级管理员可查看渠道连接态');
      return;
    }
    res.json({
      dingtalk: getDingtalkLinkStatus(),
      feishu: getFeishuLinkStatus(),
    });
  }

  /** 渠道配置编辑器：Profile 已保存值 + 绑定账号资源池 */
  static async getChannelConfig(req: Request, res: Response): Promise<void> {
    if (req.user?.role !== SUPERADMIN_ROLE) {
      sendError(res, 403, '无权限', '仅超级管理员可查看渠道配置');
      return;
    }
    const channel = parseChannel(req.query.channel);
    if (channel !== 'dingtalk' && channel !== 'feishu') {
      sendError(res, 400, '参数无效', 'channel 须为 dingtalk 或 feishu');
      return;
    }
    const boundRaw = req.query.boundUserId;
    const boundUserId =
      typeof boundRaw === 'string' && boundRaw.trim() ? boundRaw.trim() : null;

    try {
      const state = await getChannelConfigEditorState({ channel, boundUserId });
      res.json(state);
    } catch (error: unknown) {
      sendError(res, 500, '获取渠道配置失败', getErrorMessage(error));
    }
  }

  /** 保存渠道 Profile 覆盖（选项须来自绑定账号资源池） */
  static async saveChannelConfig(req: Request, res: Response): Promise<void> {
    if (!assertSuperAdmin(req, res)) return;
    if (!isRecord(req.body)) {
      sendError(res, 400, '参数无效', '请求体无效');
      return;
    }
    const channel = parseChannel(req.body.channel);
    if (channel !== 'dingtalk' && channel !== 'feishu') {
      sendError(res, 400, '参数无效', 'channel 须为 dingtalk 或 feishu');
      return;
    }
    const boundRaw = req.body.boundUserId;
    const boundUserId =
      typeof boundRaw === 'string' && boundRaw.trim() ? boundRaw.trim() : null;

    const input = {
      vendor: req.body.vendor === null ? null : typeof req.body.vendor === 'string' ? req.body.vendor : undefined,
      defaultModel: typeof req.body.defaultModel === 'string' ? req.body.defaultModel : undefined,
      temperature: typeof req.body.temperature === 'number' ? req.body.temperature : req.body.temperature === null ? null : undefined,
      maxTokens: typeof req.body.maxTokens === 'number' ? req.body.maxTokens : req.body.maxTokens === null ? null : undefined,
      enableTools: typeof req.body.enableTools === 'boolean' ? req.body.enableTools : undefined,
      enablePrompts: typeof req.body.enablePrompts === 'boolean' ? req.body.enablePrompts : undefined,
      maxToolCallRounds: typeof req.body.maxToolCallRounds === 'number' ? req.body.maxToolCallRounds : undefined,
      permissionMode:
        req.body.permissionMode === 'open'
          ? ('open' as const)
          : req.body.permissionMode === 'locked'
            ? ('locked' as const)
            : undefined,
      enableAutoCompact: typeof req.body.enableAutoCompact === 'boolean' ? req.body.enableAutoCompact : undefined,
      compactModel:
        req.body.compactModel === null
          ? null
          : typeof req.body.compactModel === 'string'
            ? req.body.compactModel
            : undefined,
      mcpServerIds: parseStringArray(req.body.mcpServerIds),
      toolPrompt:
        req.body.toolPrompt === null
          ? null
          : typeof req.body.toolPrompt === 'string'
            ? req.body.toolPrompt
            : undefined,
    };

    try {
      const result = await saveChannelConfig({ channel, boundUserId, input });
      const payload: Record<string, unknown> = { profile: result.profile };
      if (result.skippedMcpServers.length > 0) {
        payload.skippedMcpServers = result.skippedMcpServers;
      }
      await reloadAfterMutation(res, payload);
    } catch (error: unknown) {
      sendError(res, 500, '保存渠道配置失败', getErrorMessage(error));
    }
  }

  /** 手工触发 seed（空库全量写入，或补齐缺失的默认方案） */
  static async seedDefaults(req: Request, res: Response): Promise<void> {
    if (!assertSuperAdmin(req, res)) return;
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
        reloadConfigPlaneSnapshot(); // seed 变更失效全部
        res.json({ success: true, message, ...result });
        return;
      }
      res.json({ success: true, message, ...result });
    } catch (error: unknown) {
      sendError(res, 500, 'seed 失败', getErrorMessage(error));
    }
  }
}
