import express from 'express';
import { InfoController } from './info.controller.js';
import { AiController } from './ai.controller.js';
import { ConfigController } from './config.controller.js';
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

// 更新MCP服务器启用状态
router.post('/mcp/servers/enabled', AiController.updateEnabledServers);

export default router; 