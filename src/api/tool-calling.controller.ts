import { Request, Response } from 'express';
import { Logger } from '../utils/logger.js';
import { mcpClient } from '../core/client.js';

/**
 * API辅助控制器类
 * 剩余工具调用的辅助功能
 */
export class ToolCallingController {
  /**
   * 调用Echo工具
   * @param req 请求对象
   * @param res 响应对象
   */
  static async callEcho(req: Request, res: Response): Promise<void> {
    try {
      // 参数获取和验证
      const { message } = req.body;
      if (!message) {
        res.status(400).json({ error: "参数'message'是必需的" });
        return;
      }

      // 确保服务器连接
      if (!(await mcpClient.connect())) {
        res.status(500).json({ error: "未能连接到MCP服务器" });
        return;
      }

      // 调用工具
      const result = await mcpClient.callTool("echo", { message });
      res.json(result);
    } catch (error: any) {
      Logger.error("TOOL", `调用Echo工具失败: ${error.message}`);
      res.status(500).json({
        error: "工具调用失败",
        message: error.message
      });
    }
  }
} 