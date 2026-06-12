import express from 'express';
import { InfoController } from './info.controller.js';
import { AiController } from './ai.controller.js';
import { ConfigController } from './config.controller.js';
import { AdminController } from './admin.controller.js';
import { MemoryDebugController } from './memory-debug.controller.js';
import { SettingsController } from './settings.controller.js';
import { SessionsController } from './sessions.controller.js';
import { UsersController } from './users.controller.js';
import {
  defaultApiCachePolicy,
  optionalAuth,
  publicApiCache,
} from './middleware/request-runtime.js';
import { requireAuth, requireSuperAdmin } from './user-auth.js';

/**
 * 创建API路由
 *
 * 缓存约定（默认拒绝，白名单放行）：
 * - router.use(defaultApiCachePolicy) → 所有 /api/* 默认 private+no-store
 * - 仅下列「全站一致、与 Cookie 无关」的 GET 显式 publicApiCache
 * - 静态资源由 express.static + Vite hash 文件名负责，不在此路由
 */
const router = express.Router();

router.use(optionalAuth);
router.use(defaultApiCachePolicy);

// OpenAI 聊天路由：guest 可用（本地 IDB 会话 + seed 配置；见 session-store / T4-03）
router.post('/chat', AiController.chat);
router.post('/chat/stream', AiController.chatStream);
router.post('/chat/context-preview', AiController.contextPreview);
router.post('/chat/compact', AiController.compact);
router.post('/chat/permission-resolve', AiController.permissionResolve);

// 配置路由（全站静态，可短缓存）
router.get('/config/features', publicApiCache(300), ConfigController.getFeatureConfig);

// P3-02-B-06：Hindsight 记忆调试（只读 recall / reflect / prompt 注入预览）
router.get('/memory/debug/meta', MemoryDebugController.getMeta);
router.post('/memory/debug/recall', MemoryDebugController.recall);
router.post('/memory/debug/reflect', MemoryDebugController.reflect);
router.post('/memory/debug/prompt', MemoryDebugController.prompt);
// 快捷消息：仅保留只读种子拉取（写入已本地化，见 T4-02-04）
router.get('/config/quick-messages', publicApiCache(300), ConfigController.getQuickMessages);

// 设置管理路由（写操作需登录；GET 读接口匿名可用）
router.get('/settings/providers', SettingsController.getProviders);
router.post('/settings/providers', requireAuth, SettingsController.updateProviders);
router.delete('/settings/providers/reset', requireAuth, SettingsController.resetProviders);
router.get('/settings/provider-types', publicApiCache(3600), SettingsController.getProviderTypes);
router.post('/settings/providers/reload', requireAuth, SettingsController.reloadProviders);
router.get('/settings/tool-prompt', SettingsController.getToolPrompt);
router.post('/settings/tool-prompt', requireAuth, SettingsController.saveToolPrompt);
router.delete('/settings/tool-prompt/reset', requireAuth, SettingsController.resetToolPrompt);
router.delete('/settings/mcp-servers/reset', requireAuth, SettingsController.resetMCPServers);
router.get('/settings/system-prompt-sections', SettingsController.getSystemPromptSections);

// MCP信息路由
router.get('/info', InfoController.getInfo);
router.get('/client-info', InfoController.getClientInfo);
// 服务器切换路由（写操作需登录）
router.post('/server/connect/:serverId', requireAuth, InfoController.connectServer);
router.post('/server/switch/:serverId', requireAuth, InfoController.switchServer);
router.post('/server/disconnect/:serverId', requireAuth, InfoController.disconnectServer);
router.get('/server/:serverId/oauth/authorize', requireAuth, InfoController.getOAuthAuthorizeUrl);
router.get('/mcp/oauth/callback', InfoController.handleOAuthCallback);

// 服务器管理路由（写操作需登录）
router.post('/server/add', requireAuth, InfoController.addServer);
router.put('/server/update/:serverId', requireAuth, InfoController.updateServer);
router.delete('/server/delete/:serverId', requireAuth, InfoController.deleteServer);
router.post('/server/reload-config', requireAuth, InfoController.reloadConfig);
router.get('/server/:serverId/tool-preferences', InfoController.getToolPreferences);
router.put('/server/:serverId/tool-preferences', requireAuth, InfoController.saveToolPreferences);
router.post('/server/:serverId/tools/call', requireAuth, InfoController.callServerTool);
router.get('/server/:serverId/mcp-resources/preview', InfoController.previewMcpResource);
router.post('/server/:serverId/mcp-prompts/preview', InfoController.previewMcpPrompt);

// 工具列表路由
router.get('/tools/list', AiController.getAvailableTools);

// MCP服务器列表路由
router.get('/mcp/servers', AiController.getMCPServers);

// T4-03 已登录会话与消息（整组需登录；仅当前用户自己的会话）
router.use('/sessions', requireAuth);
router.get('/sessions', SessionsController.listSessions);
router.post('/sessions', SessionsController.createSession);
router.delete('/sessions/:id', SessionsController.deleteSession);
router.get('/sessions/:id/messages', SessionsController.getMessages);

// T2 配置平面 Admin API（仅 SUPERADMIN）
router.use('/admin', requireSuperAdmin);
router.post('/admin/seed', AdminController.seedDefaults);
router.get('/admin/profiles', AdminController.listProfiles);
router.get('/admin/profiles/:profileId', AdminController.getProfile);
router.post('/admin/profiles', AdminController.createProfile);
router.put('/admin/profiles/:profileId', AdminController.updateProfile);
router.delete('/admin/profiles/:profileId', AdminController.deleteProfile);
router.delete('/admin/profiles/:profileId/reset', AdminController.resetProfile);
router.get('/admin/channel-status', AdminController.getChannelStatus);
router.get('/admin/channel-config', AdminController.getChannelConfig);
router.put('/admin/channel-config', AdminController.saveChannelConfig);
router.get('/admin/routes', AdminController.listRoutes);
router.post('/admin/routes', AdminController.createRoute);
router.put('/admin/routes/:routeId', AdminController.updateRoute);
router.delete('/admin/routes/:routeId', AdminController.deleteRoute);

// T4-02-05 用户管理（仅 SUPERADMIN）
router.use('/users', requireSuperAdmin);
router.get('/users', UsersController.listUsers);
router.get('/users/seed-follow', UsersController.getSeedFollow);
router.put('/users/seed-follow', UsersController.setSeedFollow);
router.post('/users/:id/role', UsersController.setRole);
router.post('/users/:id/reset-password', UsersController.resetPassword);

export default router;
