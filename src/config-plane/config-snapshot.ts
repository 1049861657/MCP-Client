import type { ConfigChannelId } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { ConfigService } from '../services/config.service.js';
import {
  ChatConfig,
  ToolsConfig
} from '../config/feature-config.js';
import { Logger } from '../utils/logger.js';
import type { ChannelId } from '../types/channel.types.js';
import type { AgentProfileRecord, RouteRuleRecord } from '../types/config-plane.types.js';
import {
  CONFIG_PROFILE_DINGTALK_DEFAULT,
  CONFIG_PROFILE_FEISHU_DEFAULT,
  CONFIG_PROFILE_WEB_DEFAULT,
  ROUTE_MATCH_ALL,
  SETTING_CONFIG_PLANE_VERSION
} from '../types/config-plane.types.js';

export interface ConfigPlaneSnapshot {
  version: number;
  profiles: Map<string, AgentProfileRecord>;
  routesByChannel: Map<ChannelId, RouteRuleRecord[]>;
}

let currentSnapshot: ConfigPlaneSnapshot = {
  version: 0,
  profiles: new Map(),
  routesByChannel: new Map()
};

function parseMcpServerIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
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
  enableParamValidation: boolean;
  maxToolCallRounds: number;
  enableAutoCompact: boolean | null;
  compactModel: string | null;
  mcpServerIds: unknown;
  toolPrompt: string | null;
  tenantId: string | null;
  updatedAt: Date;
}): AgentProfileRecord {
  return {
    profileId: row.profileId,
    displayName: row.displayName,
    vendor: row.vendor,
    defaultModel: row.defaultModel,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    enableTools: row.enableTools,
    enablePrompts: row.enablePrompts,
    enableParamValidation: row.enableParamValidation,
    maxToolCallRounds: row.maxToolCallRounds,
    enableAutoCompact: row.enableAutoCompact,
    compactModel: row.compactModel,
    mcpServerIds: parseMcpServerIds(row.mcpServerIds),
    toolPrompt: row.toolPrompt,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt
  };
}

function mapRouteRow(row: {
  id: string;
  channel: ConfigChannelId;
  matchKey: string;
  profileId: string;
  priority: number;
  enabled: boolean;
  tenantId: string | null;
}): RouteRuleRecord {
  return {
    id: row.id,
    channel: row.channel as ChannelId,
    matchKey: row.matchKey,
    profileId: row.profileId,
    priority: row.priority,
    enabled: row.enabled,
    tenantId: row.tenantId
  };
}

async function readConfigPlaneVersion(): Promise<number> {
  const stored = await ConfigService.getSetting(SETTING_CONFIG_PLANE_VERSION);
  if (typeof stored === 'number' && Number.isFinite(stored)) {
    return Math.floor(stored);
  }
  return 0;
}

async function loadSnapshotFromDb(): Promise<ConfigPlaneSnapshot> {
  const [profileRows, routeRows, version] = await Promise.all([
    prisma.agentProfile.findMany(),
    prisma.routeRule.findMany(),
    readConfigPlaneVersion()
  ]);

  const profiles = new Map<string, AgentProfileRecord>();
  for (const row of profileRows) {
    profiles.set(row.profileId, mapProfileRow(row));
  }

  const routesByChannel = new Map<ChannelId, RouteRuleRecord[]>();
  for (const row of routeRows) {
    const channel = row.channel as ChannelId;
    const list = routesByChannel.get(channel) ?? [];
    list.push(mapRouteRow(row));
    routesByChannel.set(channel, list);
  }

  for (const list of routesByChannel.values()) {
    list.sort((a, b) => a.priority - b.priority);
  }

  return { version, profiles, routesByChannel };
}

async function resolveSeedDefaultModel(): Promise<{ vendor: string | null; defaultModel: string }> {
  const providersConfig = await ConfigService.getAIProvidersConfig();
  const providers = providersConfig.providers ?? [];
  if (providers.length === 0) {
    return { vendor: null, defaultModel: 'default' };
  }

  const preferredName =
    providersConfig.defaultProvider?.trim() || providers[0].name;
  const provider =
    providers.find((item) => item.name === preferredName) ?? providers[0];

  return {
    vendor: provider.name,
    defaultModel: provider.defaultModel
  };
}

async function buildSeedProfileData(
  profileId: string,
  displayName: string
): Promise<AgentProfileRecord> {
  const { vendor, defaultModel } = await resolveSeedDefaultModel();
  const enabledIds = await ConfigService.getSetting('mcpEnabledToolServerIds');
  const toolPromptRaw = await ConfigService.getSetting('mcpToolPrompt');
  const mcpServerIds = Array.isArray(enabledIds)
    ? enabledIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    profileId,
    displayName,
    vendor,
    defaultModel,
    temperature: ChatConfig.defaultTemperature,
    maxTokens: ChatConfig.defaultMaxTokens,
    enableTools: ToolsConfig.enableMCPTools,
    enablePrompts: false,
    enableParamValidation: ToolsConfig.enableParamValidation,
    maxToolCallRounds: ToolsConfig.maxToolCallRounds,
    enableAutoCompact: true,
    compactModel: null,
    mcpServerIds,
    toolPrompt: toolPromptRaw != null ? String(toolPromptRaw) : null,
    tenantId: null,
    updatedAt: new Date()
  };
}

const CHANNEL_SEED_PROFILES = [
  { profileId: CONFIG_PROFILE_WEB_DEFAULT, displayName: 'Web 默认' },
  { profileId: CONFIG_PROFILE_FEISHU_DEFAULT, displayName: '飞书默认' },
  { profileId: CONFIG_PROFILE_DINGTALK_DEFAULT, displayName: '钉钉默认' }
] as const;

const CHANNEL_SEED_ROUTES: Array<{ channel: ConfigChannelId; profileId: string }> = [
  { channel: 'web', profileId: CONFIG_PROFILE_WEB_DEFAULT },
  { channel: 'feishu', profileId: CONFIG_PROFILE_FEISHU_DEFAULT },
  { channel: 'dingtalk', profileId: CONFIG_PROFILE_DINGTALK_DEFAULT }
];

export interface ConfigPlaneSeedResult {
  seededEmpty: boolean;
  createdProfiles: number;
  createdRoutes: number;
}

async function createSeedProfile(profileId: string, displayName: string): Promise<void> {
  const profile = await buildSeedProfileData(profileId, displayName);
  await prisma.agentProfile.create({
    data: {
      profileId: profile.profileId,
      displayName: profile.displayName,
      vendor: profile.vendor,
      defaultModel: profile.defaultModel,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
      enableTools: profile.enableTools,
      enablePrompts: profile.enablePrompts,
      enableParamValidation: profile.enableParamValidation,
      maxToolCallRounds: profile.maxToolCallRounds,
      enableAutoCompact: profile.enableAutoCompact,
      compactModel: profile.compactModel,
      mcpServerIds: profile.mcpServerIds,
      toolPrompt: profile.toolPrompt,
      tenantId: profile.tenantId
    }
  });
}

/** 补齐缺失的渠道默认 Profile / Route（含 Web 运行时默认；管理端仅编辑 IM） */
export async function ensureChannelDefaultProfilesAndRoutes(): Promise<{
  createdProfiles: number;
  createdRoutes: number;
}> {
  let createdProfiles = 0;
  let createdRoutes = 0;

  for (const item of CHANNEL_SEED_PROFILES) {
    const existing = await prisma.agentProfile.findUnique({ where: { profileId: item.profileId } });
    if (existing) continue;
    await createSeedProfile(item.profileId, item.displayName);
    createdProfiles += 1;
  }

  for (const route of CHANNEL_SEED_ROUTES) {
    const existing = await prisma.routeRule.findFirst({
      where: { channel: route.channel, matchKey: ROUTE_MATCH_ALL, profileId: route.profileId }
    });
    if (existing) continue;
    await prisma.routeRule.create({
      data: {
        channel: route.channel,
        matchKey: ROUTE_MATCH_ALL,
        profileId: route.profileId,
        priority: 100,
        enabled: true
      }
    });
    createdRoutes += 1;
  }

  if (createdProfiles > 0 || createdRoutes > 0) {
    Logger.info(
      'CONFIG',
      `补齐渠道默认配置 profiles=${createdProfiles} routes=${createdRoutes}`
    );
  }

  return { createdProfiles, createdRoutes };
}

/** 空库时写入默认 Profile/Route（T2-05-03；启动时 initConfigPlane 已调用） */
export async function seedConfigPlaneIfEmpty(): Promise<boolean> {
  const count = await prisma.agentProfile.count();
  if (count > 0) {
    return false;
  }

  for (const item of CHANNEL_SEED_PROFILES) {
    await createSeedProfile(item.profileId, item.displayName);
  }

  for (const route of CHANNEL_SEED_ROUTES) {
    await prisma.routeRule.create({
      data: {
        channel: route.channel,
        matchKey: ROUTE_MATCH_ALL,
        profileId: route.profileId,
        priority: 100,
        enabled: true
      }
    });
  }

  Logger.info('CONFIG', 'Config plane seeded default AgentProfile and RouteRule rows');
  return true;
}

/** 管理端 seed：空库全量写入，或仅补齐缺失的渠道默认方案 */
export async function runConfigPlaneSeed(): Promise<ConfigPlaneSeedResult> {
  const seededEmpty = await seedConfigPlaneIfEmpty();
  const { createdProfiles, createdRoutes } = seededEmpty
    ? { createdProfiles: 0, createdRoutes: 0 }
    : await ensureChannelDefaultProfilesAndRoutes();
  return { seededEmpty, createdProfiles, createdRoutes };
}

/** 进程启动：seed（若空）→ 加载内存快照 */
export async function initConfigPlane(): Promise<void> {
  await seedConfigPlaneIfEmpty();
  currentSnapshot = await loadSnapshotFromDb();
  Logger.info(
    'CONFIG',
    `Config plane loaded version=${currentSnapshot.version} profiles=${currentSnapshot.profiles.size}`
  );
}

/** 管理端保存后调用：重载 DB 并递增 version */
export async function bumpConfigPlaneVersion(): Promise<number> {
  const nextVersion = (await readConfigPlaneVersion()) + 1;
  await ConfigService.saveSetting(SETTING_CONFIG_PLANE_VERSION, nextVersion);
  currentSnapshot = await loadSnapshotFromDb();
  Logger.info('CONFIG', `Config plane bumped to version=${currentSnapshot.version}`);
  return currentSnapshot.version;
}

/** 获取当前内存快照（同步，供 Resolver 热路径使用） */
export function getConfigPlaneSnapshot(): ConfigPlaneSnapshot {
  return currentSnapshot;
}
