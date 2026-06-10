import express from 'express';
import { InfoController } from './info.controller.js';
import { AiController } from './ai.controller.js';
import { ConfigController } from './config.controller.js';
import { AdminController } from './admin.controller.js';
import { MemoryDebugController } from './memory-debug.controller.js';
import { SettingsController } from './settings.controller.js';
import { UsersController } from './users.controller.js';
import { requireAuth, requireSuperAdmin } from './user-auth.js';

/**
 * 创建API路由
 */
const router = express.Router();

// OpenAI聊天路由 - 使用静态方法
router.post('/chat', AiController.chat);
router.post('/chat/stream', AiController.chatStream);
router.post('/chat/context-preview', AiController.contextPreview);
router.post('/chat/compact', AiController.compact);
router.post('/chat/permission-resolve', AiController.permissionResolve);

// 配置路由
router.get('/config/features', ConfigController.getFeatureConfig);

// P3-02-B-06：Hindsight 记忆调试（只读 recall / reflect / prompt 注入预览）
router.get('/memory/debug/meta', MemoryDebugController.getMeta);
router.post('/memory/debug/recall', MemoryDebugController.recall);
router.post('/memory/debug/reflect', MemoryDebugController.reflect);
router.post('/memory/debug/prompt', MemoryDebugController.prompt);
// 快捷消息：仅保留只读种子拉取（写入已本地化，见 T4-02-04）
router.get('/config/quick-messages', ConfigController.getQuickMessages);

// 设置管理路由（写操作需登录；GET 读接口匿名可用）
router.get('/settings/providers', SettingsController.getProviders);
router.post('/settings/providers', requireAuth, SettingsController.updateProviders);
router.get('/settings/provider-types', SettingsController.getProviderTypes);
router.post('/settings/providers/reload', requireAuth, SettingsController.reloadProviders);
router.get('/settings/tool-prompt', SettingsController.getToolPrompt);
router.post('/settings/tool-prompt', requireAuth, SettingsController.saveToolPrompt);
router.get('/settings/system-prompt-sections', SettingsController.getSystemPromptSections);

// MCP信息路由
router.get('/info', InfoController.getInfo);
router.get('/client-info', InfoController.getClientInfo);
// 服务器切换路由（写操作需登录）
router.post('/server/connect/:serverId', requireAuth, InfoController.connectServer);
router.post('/server/switch/:serverId', requireAuth, InfoController.switchServer);
router.post('/server/disconnect/:serverId', requireAuth, InfoController.disconnectServer);
router.get('/server/:serverId/oauth/authorize', InfoController.getOAuthAuthorizeUrl);
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

// T2 配置平面 Admin API（T4-02-02：改 Cookie 会话鉴权，整组需登录）
router.use('/admin', requireAuth);
router.post('/admin/seed', AdminController.seedDefaults);
router.get('/admin/profiles', AdminController.listProfiles);
router.get('/admin/profiles/:profileId', AdminController.getProfile);
router.post('/admin/profiles', AdminController.createProfile);
router.put('/admin/profiles/:profileId', AdminController.updateProfile);
router.delete('/admin/profiles/:profileId', AdminController.deleteProfile);
router.get('/admin/routes', AdminController.listRoutes);
router.post('/admin/routes', AdminController.createRoute);
router.put('/admin/routes/:routeId', AdminController.updateRoute);
router.delete('/admin/routes/:routeId', AdminController.deleteRoute);

// T4-02-05 用户管理（仅 SUPERADMIN）
router.use('/users', requireSuperAdmin);
router.get('/users', UsersController.listUsers);
router.post('/users/:id/role', UsersController.setRole);
router.post('/users/:id/reset-password', UsersController.resetPassword);

export default router; 