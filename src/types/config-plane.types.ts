import type { ChannelId, ChatOptions, MemoryIdentityScope } from './channel.types.js';
import type { PermissionMode } from '../config/permission.types.js';

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

/** T4-07：guest / 未绑定 IM 默认配置归属（仅存 userId=null 行，超管在用户管理页写入） */
export const SETTING_SEED_FOLLOW_USER_ID = 'seedFollowUserId';

/** DB `AgentProfile` 行（渠道级全局配置） */
export interface AgentProfileRecord {
  profileId: string;
  displayName: string;
  vendor: string | null;
  defaultModel: string;
  temperature: number | null;
  maxTokens: number | null;
  enableTools: boolean;
  enablePrompts: boolean;
  maxToolCallRounds: number;
  permissionMode: PermissionMode;
  enableAutoCompact: boolean | null;
  compactModel: string | null;
  mcpServerIds: string[];
  toolPrompt: string | null;
  tenantId: string | null;
  updatedAt: Date;
}

/** DB `RouteRule` 行（渠道级全局路由） */
export interface RouteRuleRecord {
  id: string;
  boundUserId: string | null;
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
  /** MCP 工具 codeName 白名单；缺省在 AiProvider 中按 toolPreferences 解析 */
  enabledToolNames?: string[];
  /** System 工具 codeName 白名单；缺省为全部 */
  enabledSystemToolNames?: string[];
  toolPrompt: string;
  permissionMode: PermissionMode;
  /** P3-02-B：来自入站 body 覆盖 */
  skipMemory?: boolean;
  /** P3-02-B：retain document_id 作用域（Web=webChatSessionId，IM=sessionKey） */
  documentSessionId?: string;
  /** T4-03：已登录用户 ID（仅 Web authed；驱动轮末落库 + 压缩基线回写 + per-user 配置） */
  userId?: string;
  /**
   * T4-07：MCP/Provider 配置池键（guest/IM 跟随 seedFollow 或 boundUserId；不等于登录 userId）。
   * resolveProfile 始终写入；null = seed 全局池。
   */
  configUserId?: string | null;
  /** T4-03：服务端 ChatSession.id（仅 Web authed；落库/基线回写目标会话） */
  chatSessionId?: string;
  /** T4-05：外接记忆按身份分段作用域；Web 匿名为 `{channel:'web'}`（无 userId → 关闭记忆） */
  memoryScope?: MemoryIdentityScope;
}

/** 解析路由时的入站上下文（T2-02 Resolver 入参） */
export interface ProfileResolveContext {
  channel: ChannelId;
  sessionKey: string;
  /** retain document_id 作用域 */
  documentSessionId?: string;
  /** 群/会话 ID：`conversationId`（钉钉）或 `chatId`（飞书）；Web 可为 requestId */
  routeMatchKey: string;
  envelopeChatOptions?: ChatOptions;
  vendorFromChannelMeta?: string;
  /** T4-03：已登录用户 ID（仅 Web authed） */
  userId?: string;
  /** T4-03：服务端 ChatSession.id（仅 Web authed） */
  chatSessionId?: string;
  /** T4-05：外接记忆按身份分段作用域（据 envelope 渠道构造） */
  memoryScope?: MemoryIdentityScope;
}
