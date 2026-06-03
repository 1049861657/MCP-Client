import { pickDefined } from '../channels/envelope-mapper.js';
import {
  ChatConfig,
  ContextConfig,
  resolveEnableAutoCompact,
  resolveMaxToolCallRounds,
  ToolsConfig
} from '../config/feature-config.js';
import { resolvePermissionMode } from '../core/agent-harness/permission-gate.js';
import type { PermissionMode } from '../config/permission.types.js';
import type {
  AgentMessageEnvelopeSerialized,
  ChannelId,
  ChatOptions
} from '../types/channel.types.js';
import {
  isDingtalkInboundEnvelope,
  isFeishuInboundEnvelope,
  isWebInboundEnvelope
} from '../types/channel.types.js';
import type {
  AgentProfileRecord,
  ProfileResolveContext,
  ResolvedChatProfile,
  RouteRuleRecord
} from '../types/config-plane.types.js';
import {
  CHANNEL_DEFAULT_PROFILE_BY_CHANNEL,
  ROUTE_MATCH_ALL
} from '../types/config-plane.types.js';
import type { ConfigPlaneSnapshot } from './config-snapshot.js';
import { getConfigPlaneSnapshot } from './config-snapshot.js';

export function extractRouteMatchKey(
  envelope: AgentMessageEnvelopeSerialized
): string {
  if (isWebInboundEnvelope(envelope)) {
    return envelope.channelMeta.requestId;
  }
  if (isFeishuInboundEnvelope(envelope)) {
    return envelope.channelMeta.chatId;
  }
  if (isDingtalkInboundEnvelope(envelope)) {
    return envelope.channelMeta.conversationId;
  }
  return ROUTE_MATCH_ALL;
}

export function buildProfileResolveContext(
  envelope: AgentMessageEnvelopeSerialized
): ProfileResolveContext {
  const vendorFromChannelMeta =
    'vendor' in envelope.channelMeta && typeof envelope.channelMeta.vendor === 'string'
      ? envelope.channelMeta.vendor
      : undefined;

  return {
    channel: envelope.channel,
    sessionKey: envelope.sessionKey,
    routeMatchKey: extractRouteMatchKey(envelope),
    envelopeChatOptions: pickDefined(
      (envelope.payload.chatOptions ?? {}) as Record<string, unknown>
    ) as Partial<ChatOptions>,
    vendorFromChannelMeta
  };
}

export function selectRouteRule(
  channel: ChannelId,
  routeMatchKey: string,
  routes: RouteRuleRecord[]
): RouteRuleRecord | undefined {
  const enabled = routes.filter((rule) => rule.enabled);
  const exactMatches = enabled
    .filter((rule) => rule.matchKey === routeMatchKey)
    .sort((a, b) => a.priority - b.priority);
  if (exactMatches.length > 0) {
    return exactMatches[0];
  }

  const wildcardMatches = enabled
    .filter((rule) => rule.matchKey === ROUTE_MATCH_ALL)
    .sort((a, b) => a.priority - b.priority);
  return wildcardMatches[0];
}

function resolveProfileRecord(
  snapshot: ConfigPlaneSnapshot,
  channel: ChannelId,
  routeMatchKey: string
): AgentProfileRecord {
  const routes = snapshot.routesByChannel.get(channel) ?? [];
  const route = selectRouteRule(channel, routeMatchKey, routes);
  const profileId =
    route?.profileId ?? CHANNEL_DEFAULT_PROFILE_BY_CHANNEL[channel];
  const profile = snapshot.profiles.get(profileId);
  if (!profile) {
    throw new Error(
      `Config plane: AgentProfile "${profileId}" missing for channel "${channel}". ` +
        'Initialize defaults via POST /api/admin/seed.'
    );
  }
  return profile;
}

/** Web 入站：body 为 MCP 列表 SSOT；缺省视为未选任何 MCP */
export function resolveWebMcpServerIds(
  envelopeChatOptions?: Partial<ChatOptions>
): string[] {
  const bodyMcp = envelopeChatOptions?.mcpServerIds;
  return Array.isArray(bodyMcp) ? [...bodyMcp] : [];
}

function mergeLayer(
  base: Partial<ChatOptions> & {
    profileId: string;
    mcpServerIds: string[];
    enabledToolNames?: string[];
    toolPrompt: string;
    vendor?: string;
    permissionMode: PermissionMode;
  },
  layer: Partial<ChatOptions>,
  channel: ChannelId
): void {
  if (layer.model !== undefined) {
    base.model = layer.model;
  }
  if (layer.temperature !== undefined) {
    base.temperature = layer.temperature;
  }
  if (layer.maxTokens !== undefined) {
    base.maxTokens = layer.maxTokens;
  }
  if (layer.enableTools !== undefined) {
    base.enableTools = layer.enableTools;
  }
  if (layer.enableParamValidation !== undefined) {
    base.enableParamValidation = layer.enableParamValidation;
  }
  if (layer.enablePrompts !== undefined) {
    base.enablePrompts = layer.enablePrompts;
  }
  if (layer.maxToolCallRounds !== undefined) {
    base.maxToolCallRounds = layer.maxToolCallRounds;
  }
  if (layer.enableAutoCompact !== undefined) {
    base.enableAutoCompact = layer.enableAutoCompact;
  }
  if (layer.compactModel !== undefined) {
    base.compactModel = layer.compactModel;
  }
  if (channel !== 'web' && layer.mcpServerIds !== undefined) {
    base.mcpServerIds = [...layer.mcpServerIds];
  }
  if (layer.enabledToolNames !== undefined) {
    if (channel !== 'web') {
      throw new Error('非 Web 渠道不得在入站消息中覆盖 enabledToolNames');
    }
    base.enabledToolNames = [...layer.enabledToolNames];
  }
  if (layer.permissionMode !== undefined) {
    if (channel !== 'web') {
      throw new Error('非 Web 渠道不得在入站消息中覆盖 permissionMode');
    }
    base.permissionMode = layer.permissionMode;
  }
}

/** 将指定 Profile 与入站覆盖链合并为 ResolvedChatProfile */
function resolveProfileFromProfileRecord(
  ctx: ProfileResolveContext,
  profile: AgentProfileRecord
): ResolvedChatProfile {
  const merged: Partial<ChatOptions> & {
    profileId: string;
    mcpServerIds: string[];
    enabledToolNames?: string[];
    toolPrompt: string;
    vendor?: string;
    permissionMode: PermissionMode;
  } = {
    profileId: profile.profileId,
    model: profile.defaultModel,
    temperature: profile.temperature ?? ChatConfig.defaultTemperature,
    maxTokens: profile.maxTokens ?? ChatConfig.defaultMaxTokens,
    enableTools: profile.enableTools,
    enableParamValidation: profile.enableParamValidation,
    enablePrompts: profile.enablePrompts,
    maxToolCallRounds: profile.maxToolCallRounds,
    permissionMode: profile.permissionMode,
    enableAutoCompact: profile.enableAutoCompact ?? ContextConfig.enableAutoCompact,
    compactModel: profile.compactModel ?? undefined,
    mcpServerIds:
      ctx.channel === 'web'
        ? resolveWebMcpServerIds(ctx.envelopeChatOptions)
        : [...profile.mcpServerIds],
    toolPrompt: profile.toolPrompt ?? '',
    vendor: profile.vendor ?? ctx.vendorFromChannelMeta
  };

  mergeLayer(merged, ctx.envelopeChatOptions ?? {}, ctx.channel);

  return {
    profileId: merged.profileId,
    vendor: merged.vendor,
    model: merged.model ?? profile.defaultModel,
    temperature: merged.temperature ?? ChatConfig.defaultTemperature,
    maxTokens: merged.maxTokens ?? ChatConfig.defaultMaxTokens,
    enableTools: merged.enableTools ?? ToolsConfig.enableMCPTools,
    enableParamValidation:
      merged.enableParamValidation ?? ToolsConfig.enableParamValidation,
    enablePrompts: merged.enablePrompts ?? ToolsConfig.enablePrompts,
    maxToolCallRounds: resolveMaxToolCallRounds(merged.maxToolCallRounds),
    enableAutoCompact: resolveEnableAutoCompact(merged.enableAutoCompact),
    compactModel: merged.compactModel,
    mcpServerIds: merged.mcpServerIds,
    enabledToolNames: merged.enabledToolNames,
    toolPrompt: merged.toolPrompt,
    permissionMode: resolvePermissionMode(ctx.channel, merged.permissionMode)
  };
}

export function resolveProfileFromContext(
  ctx: ProfileResolveContext,
  snapshot: ConfigPlaneSnapshot
): ResolvedChatProfile {
  const profile = resolveProfileRecord(snapshot, ctx.channel, ctx.routeMatchKey);
  return resolveProfileFromProfileRecord(ctx, profile);
}

export function resolveProfile(
  envelope: AgentMessageEnvelopeSerialized
): ResolvedChatProfile {
  const ctx = buildProfileResolveContext(envelope);
  const snapshot = getConfigPlaneSnapshot();
  return resolveProfileFromContext(ctx, snapshot);
}
