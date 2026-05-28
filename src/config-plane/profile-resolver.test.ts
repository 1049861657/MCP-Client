import assert from 'node:assert/strict';
import test from 'node:test';
import type { AgentMessageEnvelopeSerialized } from '../types/channel.types.js';
import type { AgentProfileRecord, RouteRuleRecord } from '../types/config-plane.types.js';
import {
  CONFIG_PROFILE_DINGTALK_DEFAULT,
  CONFIG_PROFILE_WEB_DEFAULT,
  ROUTE_MATCH_ALL
} from '../types/config-plane.types.js';
import type { ConfigPlaneSnapshot } from './config-snapshot.js';
import {
  buildProfileResolveContext,
  resolveProfileFromContext,
  selectRouteRule
} from './profile-resolver.js';

function baseProfile(
  profileId: string,
  overrides: Partial<AgentProfileRecord> = {}
): AgentProfileRecord {
  return {
    profileId,
    displayName: profileId,
    vendor: 'openai-vendor',
    defaultModel: 'model-a',
    temperature: 0.7,
    maxTokens: 2048,
    enableTools: true,
    enablePrompts: true,
    enableParamValidation: false,
    maxToolCallRounds: 25,
    enableAutoCompact: false,
    compactModel: null,
    mcpServerIds: ['srv-1'],
    toolPrompt: 'prompt-a',
    tenantId: null,
    updatedAt: new Date(),
    ...overrides
  };
}

function buildSnapshot(
  profiles: AgentProfileRecord[],
  routes: RouteRuleRecord[]
): ConfigPlaneSnapshot {
  const profileMap = new Map(profiles.map((p) => [p.profileId, p]));
  const routesByChannel = new Map<
    AgentMessageEnvelopeSerialized['channel'],
    RouteRuleRecord[]
  >();
  for (const route of routes) {
    const list = routesByChannel.get(route.channel) ?? [];
    list.push(route);
    routesByChannel.set(route.channel, list);
  }
  for (const list of routesByChannel.values()) {
    list.sort((a, b) => a.priority - b.priority);
  }
  return { version: 1, profiles: profileMap, routesByChannel };
}

function dingtalkEnvelope(
  conversationId: string,
  chatOptions?: { enableTools?: boolean }
): AgentMessageEnvelopeSerialized {
  return {
    id: 'req-1',
    source: 'dingtalk:im',
    type: 'agent.message.inbound',
    time: new Date().toISOString(),
    channel: 'dingtalk',
    sessionKey: `dingtalk:${conversationId}`,
    channelMeta: {
      requestId: 'req-1',
      msgId: 'msg-1',
      conversationId,
      sessionWebhook: 'https://example.com/hook',
      sessionWebhookExpiredTime: Date.now() + 60_000
    },
    payload: {
      messages: [{ role: 'user', content: 'hi' }],
      chatOptions
    },
    trace: { traceId: 'req-1', idempotencyKey: 'msg-1' }
  };
}

test('selectRouteRule 精确 matchKey 优先于通配 *', () => {
  const routes: RouteRuleRecord[] = [
    {
      id: 'r-wild',
      channel: 'dingtalk',
      matchKey: ROUTE_MATCH_ALL,
      profileId: CONFIG_PROFILE_DINGTALK_DEFAULT,
      priority: 100,
      enabled: true,
      tenantId: null
    },
    {
      id: 'r-exact',
      channel: 'dingtalk',
      matchKey: 'conv-vip',
      profileId: CONFIG_PROFILE_DINGTALK_DEFAULT,
      priority: 10,
      enabled: true,
      tenantId: null
    }
  ];

  const picked = selectRouteRule('dingtalk', 'conv-vip', routes);
  assert.equal(picked?.profileId, CONFIG_PROFILE_DINGTALK_DEFAULT);
});

test('resolveProfileFromContext 使用渠道默认 * 路由', () => {
  const snapshot = buildSnapshot(
    [baseProfile(CONFIG_PROFILE_DINGTALK_DEFAULT, { defaultModel: 'dingtalk-model' })],
    [
      {
        id: 'r1',
        channel: 'dingtalk',
        matchKey: ROUTE_MATCH_ALL,
        profileId: CONFIG_PROFILE_DINGTALK_DEFAULT,
        priority: 100,
        enabled: true,
        tenantId: null
      }
    ]
  );

  const envelope = dingtalkEnvelope('conv-normal');
  const resolved = resolveProfileFromContext(
    buildProfileResolveContext(envelope),
    snapshot
  );
  assert.equal(resolved.profileId, CONFIG_PROFILE_DINGTALK_DEFAULT);
  assert.equal(resolved.model, 'dingtalk-model');
});

test('resolveProfileFromContext 无 Route 时使用渠道默认 Profile', () => {
  const snapshot = buildSnapshot(
    [baseProfile(CONFIG_PROFILE_DINGTALK_DEFAULT, { defaultModel: 'dingtalk-fallback' })],
    []
  );

  const envelope = dingtalkEnvelope('conv-x');
  const resolved = resolveProfileFromContext(
    buildProfileResolveContext(envelope),
    snapshot
  );
  assert.equal(resolved.profileId, CONFIG_PROFILE_DINGTALK_DEFAULT);
  assert.equal(resolved.model, 'dingtalk-fallback');
});

test('resolveProfileFromContext Web 请求体 chatOptions 覆盖 Profile enableTools', () => {
  const snapshot = buildSnapshot(
    [baseProfile(CONFIG_PROFILE_WEB_DEFAULT, { enableTools: true })],
    [
      {
        id: 'r1',
        channel: 'web',
        matchKey: ROUTE_MATCH_ALL,
        profileId: CONFIG_PROFILE_WEB_DEFAULT,
        priority: 100,
        enabled: true,
        tenantId: null
      }
    ]
  );

  const envelope: AgentMessageEnvelopeSerialized = {
    id: 'req-web',
    source: 'web:api',
    type: 'agent.message.inbound',
    time: new Date().toISOString(),
    channel: 'web',
    sessionKey: 'web:req-web',
    channelMeta: { requestId: 'req-web' },
    payload: {
      messages: [{ role: 'user', content: 'hi' }],
      chatOptions: { enableTools: false }
    },
    trace: { traceId: 'req-web', idempotencyKey: 'req-web' }
  };

  const resolved = resolveProfileFromContext(
    buildProfileResolveContext(envelope),
    snapshot
  );
  assert.equal(resolved.enableTools, false);
});

test('resolveProfileFromContext Web body mcpServerIds 覆盖 Profile', () => {
  const snapshot = buildSnapshot(
    [baseProfile(CONFIG_PROFILE_WEB_DEFAULT, { mcpServerIds: ['srv-old'] })],
    [
      {
        id: 'r1',
        channel: 'web',
        matchKey: ROUTE_MATCH_ALL,
        profileId: CONFIG_PROFILE_WEB_DEFAULT,
        priority: 100,
        enabled: true,
        tenantId: null
      }
    ]
  );

  const envelope: AgentMessageEnvelopeSerialized = {
    id: 'req-web-mcp',
    source: 'web:api',
    type: 'agent.message.inbound',
    time: new Date().toISOString(),
    channel: 'web',
    sessionKey: 'web:req-web-mcp',
    channelMeta: { requestId: 'req-web-mcp' },
    payload: {
      messages: [{ role: 'user', content: 'hi' }],
      chatOptions: { mcpServerIds: ['srv-new'] }
    },
    trace: { traceId: 'req-web-mcp', idempotencyKey: 'req-web-mcp' }
  };

  const resolved = resolveProfileFromContext(
    buildProfileResolveContext(envelope),
    snapshot
  );
  assert.deepEqual(resolved.mcpServerIds, ['srv-new']);
});
