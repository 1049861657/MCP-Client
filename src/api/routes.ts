import express from 'express';
import { InfoController } from './info.controller.js';
import { AiController } from './ai.controller.js';
import { ConfigController } from './config.controller.js';
import { AdminController } from './admin.controller.js';
import { SettingsController } from './settings.controller.js';

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
router.get('/config/quick-messages', ConfigController.getQuickMessages);
router.post('/config/quick-messages/save', ConfigController.saveQuickMessages);

// 设置管理路由
router.get('/settings/providers', SettingsController.getProviders);
router.post('/settings/providers', SettingsController.updateProviders);
router.get('/settings/provider-types', SettingsController.getProviderTypes);
router.post('/settings/providers/reload', SettingsController.reloadProviders);
router.get('/settings/tool-prompt', SettingsController.getToolPrompt);
router.post('/settings/tool-prompt', SettingsController.saveToolPrompt);

// MCP信息路由
router.get('/info', InfoController.getInfo);
router.get('/client-info', InfoController.getClientInfo);
// 服务器切换路由
router.post('/server/connect/:serverId', InfoController.connectServer);
router.post('/server/switch/:serverId', InfoController.switchServer);
router.post('/server/disconnect/:serverId', InfoController.disconnectServer);

// 服务器管理路由
router.post('/server/add', InfoController.addServer);
router.put('/server/update/:serverId', InfoController.updateServer);
router.delete('/server/delete/:serverId', InfoController.deleteServer);
router.post('/server/reload-config', InfoController.reloadConfig);

// 工具列表路由
router.get('/tools/list', AiController.getAvailableTools);

// MCP服务器列表路由
router.get('/mcp/servers', AiController.getMCPServers);

// T2 配置平面 Admin API（Header: X-Admin-Token = ADMIN_API_TOKEN）
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

export default router; 