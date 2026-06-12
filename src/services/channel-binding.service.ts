import {
  resolveChannelSnapshot,
  type ConfigPlaneSnapshot,
} from '../config-plane/config-snapshot.js';
import { selectRouteRule } from '../config-plane/profile-resolver.js';
import type { ChannelId } from '../types/channel.types.js';
import type { AgentProfileRecord, RouteRuleRecord } from '../types/config-plane.types.js';
import {
  CHANNEL_DEFAULT_PROFILE_BY_CHANNEL,
  ROUTE_MATCH_ALL,
} from '../types/config-plane.types.js';
import { resolveConfigUserId } from './seed-follow.service.js';

export interface ChannelBindingContext {
  channel: ChannelId;
  wildcardRoute: RouteRuleRecord | null;
  profile: AgentProfileRecord;
  profileId: string;
  boundUserId: string | null;
  configUserId: string | null;
}

/** 渠道通配路由（matchKey=*），与运行时 Resolver 一致 */
export function getWildcardRouteRule(
  snapshot: ConfigPlaneSnapshot,
  channel: ChannelId,
): RouteRuleRecord | undefined {
  const routes = snapshot.routesByChannel.get(channel) ?? [];
  return selectRouteRule(channel, ROUTE_MATCH_ALL, routes);
}

/**
 * 管理端 / MCP 可达性共用：通配 Route → Profile → configUserId。
 * boundUserId 显式传入时用于预览草稿；否则读已保存的 wildcard.boundUserId。
 */
export async function resolveChannelBindingContext(options: {
  channel: ChannelId;
  boundUserId?: string | null;
}): Promise<ChannelBindingContext> {
  const snapshot = await resolveChannelSnapshot();
  const wildcardRoute = getWildcardRouteRule(snapshot, options.channel) ?? null;

  const profileId =
    wildcardRoute?.profileId ?? CHANNEL_DEFAULT_PROFILE_BY_CHANNEL[options.channel];
  const profile = snapshot.profiles.get(profileId);
  if (!profile) {
    throw new Error(
      `Config plane: AgentProfile "${profileId}" missing for channel "${options.channel}". ` +
        'Initialize defaults via POST /api/admin/seed.',
    );
  }

  const boundUserId =
    options.boundUserId !== undefined
      ? options.boundUserId
      : (wildcardRoute?.boundUserId ?? null);
  const configUserId = await resolveConfigUserId({ boundUserId });

  return {
    channel: options.channel,
    wildcardRoute,
    profile,
    profileId,
    boundUserId,
    configUserId,
  };
}
