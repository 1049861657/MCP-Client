import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ServerConfig } from './config/app.config.js';
import { auth } from './lib/auth.js';
import { bootstrapUsers } from './lib/bootstrap-users.js';
import apiRoutes from './api/routes.js';
import { Logger } from './utils/logger.js';
import { ConfigService } from './services/config.service.js';
import { cleanupExpiredAgentOutputs } from './core/agent-harness/context-budget.js';
import { initConfigPlane } from './config-plane/index.js';
import { initializeProviders } from './providers/ai-providers.js';
import { startMessageBus } from './message-bus/bootstrap.js';
import { startChannels } from './channels/bootstrap.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建Express应用
const app = express();

// 动态 JSON 禁用 Express 默认 ETag（仅按 body 哈希，不含会话，易致跨用户 304）
app.set('etag', false);

// 配置中间件
app.use(cors());

// better-auth 内置端点（注册/登录/登出/get-session/change-password 等）。
// 必须在 express.json() 之前挂载：toNodeHandler 自行消费原始请求体。
app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json({ limit: ServerConfig.jsonBodyLimit }));
app.use(express.static(path.join(__dirname, '../public')));

// 配置API路由
app.use('/api', apiRoutes);

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (
    err instanceof Error &&
    (err.name === 'PayloadTooLargeError' || err.message.includes('request entity too large'))
  ) {
    res.status(413).json({ error: '请求体过大，请尝试压缩上下文后重试' });
    return;
  }
  next(err);
});

/**
 * 启动应用
 */
async function startServer() {
  try {
    // 获取服务器配置
    const serverConfig = (await ConfigService.getSetting('serverConfig') || ServerConfig) as typeof ServerConfig;

    await cleanupExpiredAgentOutputs();

    await bootstrapUsers();
    await initializeProviders();
    await initConfigPlane();

    startMessageBus();
    startChannels();
    
    // 启动服务器
    app.listen(serverConfig.port, () => {
      Logger.info('APP', `应用已启动`);
      Logger.info('APP', `Web服务器运行在 http://${serverConfig.host}:${serverConfig.port}`);
    });
  } catch (error) {
    Logger.error('APP', '启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer(); 