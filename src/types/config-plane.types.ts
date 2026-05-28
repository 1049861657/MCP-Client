import type { ChannelId, ChatOptions } from './channel.types.js';

/** @deprecated 历史 seed 残留；Resolver 已改为按渠道默认方案解析，不再兜底到此 ID */
export const CONFIG_PROFILE_GLOBAL_DEFAULT = 'global-default';
export const CONFIG_PROFILE_WEB_DEFAULT = 'web-default';
export const CONFIG_PROFILE_FEISHU_DEFAULT = 'feishu-default';
export const CONFIG_PROFILE_DINGTALK_DEFAULT = 'dingtalk-default';

/** 管理端可编辑的 IM 渠道默认方案（Web 由聊天页/seed 维护，不在此编辑） */
export const EDITABLE_IM_CHANNEL_PROFILE_IDS = [
  CONFIG_PROFILE_DINGTALK_DEFAULT,
  CONFIG_PROFILE_FEISHU_DEFAULT
] as const;

export type EditableImChannelProfileId = (typeof EDITABLE_IM_CHANNEL_PROFILE_IDS)[number];

export type ChannelDefaultProfileId =
  | EditableImChannelProfileId
  | typeof CONFIG_PROFILE_WEB_DEFAULT;

/** 无 Route 命中时使用的渠道默认 Profile（须已 seed） */
export const CHANNEL_DEFAULT_PROFILE_BY_CHANNEL: Record<ChannelId, ChannelDefaultProfileId> =
  {
    dingtalk: CONFIG_PROFILE_DINGTALK_DEFAULT,
    feishu: CONFIG_PROFILE_FEISHU_DEFAULT,
    web: CONFIG_PROFILE_WEB_DEFAULT
  };

/** 路由通配：渠道默认规则 */
export const ROUTE_MATCH_ALL = '*';

/** Setting 键：渠道连接占位（T2 ChannelBinding，凭证仍走 .env） */
export const SETTING_CHANNEL_BINDINGS = 'channelBindings';

/** Setting 键：配置平面版本号（Resolver 快照刷新） */
export const SETTING_CONFIG_PLANE_VERSION = 'configPlaneVersion';

/** DB `AgentProfile` 行（与 Prisma 模型对齐） */
export interface AgentProfileRecord {
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
  mcpServerIds: string[];
  toolPrompt: string | null;
  tenantId: string | null;
  updatedAt: Date;
}

/** DB `RouteRule` 行（与 Prisma 模型对齐） */
export interface RouteRuleRecord {
  id: string;
  channel: ChannelId;
  matchKey: string;
  profileId: string;
  priority: number;
  enabled: boolean;
  tenantId: string | null;
}

/**
 * Resolver 输出：Inbound Worker / AiProvider 唯一能力入参。
 * 字段在 `ChatOptions` 基础上补全必填，并增加 Profile 元数据。
 */
export interface ResolvedChatProfile extends Required<
  Pick<
    ChatOptions,
    | 'enableTools'
    | 'enableParamValidation'
    | 'enablePrompts'
    | 'maxToolCallRounds'
    | 'enableAutoCompact'
  >
> {
  profileId: string;
  vendor?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  compactModel?: string;
  mcpServerIds: string[];
  toolPrompt: string;
}

/** 解析路由时的入站上下文（T2-02 Resolver 入参） */
export interface ProfileResolveContext {
  channel: ChannelId;
  sessionKey: string;
  /** 群/会话 ID：`conversationId`（钉钉）或 `chatId`（飞书）；Web 可为 requestId */
  routeMatchKey: string;
  envelopeChatOptions?: ChatOptions;
  vendorFromChannelMeta?: string;
}
