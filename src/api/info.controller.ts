import { Request, Response } from 'express';
import { mcpClient } from '../core/client.js';
import { ErrorResponse } from '../interfaces/mcp.interfaces.js';

/**
 * MCP信息控制器类
 * 提供与MCP服务器和工具相关的信息
 */
export class InfoController {
  /**
   * 获取MCP服务信息
   */
  static async getInfo(req: Request, res: Response): Promise<void> {
    try {
      console.log(`[API] 收到获取MCP信息请求`);
      
      // 获取MCP服务器信息，因为是异步方法，需要await
      const info = await mcpClient.getServerInfo();
      
      console.log("[API] 返回MCP信息:", JSON.stringify(info));
      res.json(info);
    } catch (error) {
      console.error("[API] 获取MCP信息出错:", error instanceof Error ? error.message : String(error));
      
      const errorResponse: ErrorResponse = { 
        error: "获取MCP信息失败", 
        details: error instanceof Error ? error.message : String(error) 
      };
      res.status(500).json(errorResponse);
    }
  }

  /**
   * 切换MCP服务器
   */
  static async switchServer(req: Request, res: Response): Promise<void> {
    try {
      const serverId = req.params.serverId;
      const forceConnect = req.query.connect === 'true'; // 可选参数：是否强制连接
      
      if (!serverId) {
        res.status(400).json({ error: '服务器ID不能为空' });
        return;
      }
      
      console.log(`[API] 收到切换MCP服务器请求，目标服务器ID: ${serverId}, 强制连接: ${forceConnect}`);
      
      // 调用客户端切换服务器
      const success = await mcpClient.switchServer(serverId);
      
      if (success) {
        // 如果请求中指定了要连接，则尝试连接
        if (forceConnect) {
          try {
            console.log(`[API] 尝试连接服务器: ${serverId}`);
            await mcpClient.connect();
            console.log(`[API] 连接服务器成功`);
          } catch (error) {
            console.error("[API] 连接新选择的服务器失败:", error);
            // 连接失败不影响切换操作
          }
        } else {
          console.log(`[API] 仅切换服务器，不连接`);
        }
        
        // 获取切换后的服务器信息
        const info = await mcpClient.getServerInfo();
        console.log(`[API] 服务器切换成功，返回新服务器信息`);
        res.json(info);
      } else {
        const errorResponse: ErrorResponse = { 
          error: "切换服务器失败", 
          details: `无法切换到服务器: ${serverId}` 
        };
        res.status(400).json(errorResponse);
      }
    } catch (error) {
      console.error("[API] 切换服务器出错:", error instanceof Error ? error.message : String(error));
      
      const errorResponse: ErrorResponse = { 
        error: "切换服务器失败", 
        details: error instanceof Error ? error.message : String(error) 
      };
      res.status(500).json(errorResponse);
    }
  }

  /**
   * 断开当前MCP服务器连接
   */
  static async disconnectServer(req: Request, res: Response): Promise<void> {
    try {
      console.log(`[API] 收到断开MCP服务器连接请求`);
      
      // 调用客户端断开连接方法
      await mcpClient.disconnect();
      
      // 获取服务器信息（这里会返回断开状态，无需尝试重连）
      const info = await mcpClient.getServerInfo();
      
      // 确保信息中显示服务器已断开连接
      if (info.server) {
        info.server.status = '未连接';
      }
      
      console.log(`[API] 服务器断开连接成功，返回更新后的服务器信息:`, JSON.stringify(info.server));
      res.json(info);
    } catch (error) {
      console.error("[API] 断开服务器连接出错:", error instanceof Error ? error.message : String(error));
      
      const errorResponse: ErrorResponse = { 
        error: "断开服务器连接失败", 
        details: error instanceof Error ? error.message : String(error) 
      };
      res.status(500).json(errorResponse);
    }
  }
} 