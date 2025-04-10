import express from 'express';
import { InfoController } from './info.controller.js';
import { OpenAIController } from './openai.controller.js';
import { ConfigController } from './config.controller.js';
import { SettingsController } from './settings.controller.js';

/**
 * 创建API路由
 */
const router = express.Router();

// OpenAI聊天路由 - 使用静态方法
router.post('/chat', OpenAIController.chat);
router.post('/chat/stream', OpenAIController.chatStream);

// 配置路由
router.get('/config/ai-providers', ConfigController.getAIProviders);
router.get('/config/features', ConfigController.getFeatureConfig);

// 设置管理路由
router.get('/settings/providers', SettingsController.getProviders);
router.post('/settings/providers', SettingsController.updateProviders);
router.get('/settings/provider-types', SettingsController.getProviderTypes);
router.post('/settings/providers/reload', SettingsController.reloadProviders);

// MCP信息路由
router.get('/info', InfoController.getInfo);

// 服务器切换路由
router.post('/server/switch/:serverId', InfoController.switchServer);
router.post('/server/disconnect', InfoController.disconnectServer);

// 工具列表路由
router.get('/tools/list', OpenAIController.getAvailableTools);

export default router; 