import { Request, Response } from 'express';
import { mcpClient, reloadMCPConfig } from '../core/client.js';
import { ErrorResponse } from '../interfaces/mcp.interfaces.js';
import fs from 'fs';
import { getMCPConfigPath } from '../utils/path-util.js';
import { MCPConfigType, MCPServer } from '../types/config.types.js';

// MCP配置文件路径
const MCP_CONFIG_PATH = getMCPConfigPath(import.meta.url);

/**
 * MCP信息控制器类
 * 提供与MCP服务器和工具相关的信息
 */
export class InfoController {
  /**
   * 获取错误消息
   */
  private static getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
  
  /**
   * 发送错误响应
   */
  private static sendErrorResponse(res: Response, status: number, error: string, details: string): void {
    const errorResponse: ErrorResponse = { error, details };
    res.status(status).json(errorResponse);
  }

  /**
   * 获取MCP服务信息
   */
  static async getInfo(req: Request, res: Response): Promise<void> {
    try {
      const info = await mcpClient.getServerInfo();
      res.json(info);
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "获取MCP信息失败", InfoController.getErrorMessage(error)
      );
    }
  }

   /**
   * 获取MCP服务信息
   */
   static async getClientInfo(req: Request, res: Response): Promise<void> {
    try {
      const info = await mcpClient.getClientInfo();
      res.json(info);
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "获取MCP信息失败", InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * 切换/连接MCP服务器
   */
  static async connectServer(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      
      if (!serverId) {
        res.status(400).json({ error: '缺少服务器ID参数' });
        return;
      }
      
      const success = await mcpClient.connect(serverId);
      
      if (success) {
        const info = await mcpClient.getServerInfo();
        res.json(info);
      } else {
        InfoController.sendErrorResponse(
          res, 400, "连接服务器失败", `无法连接到服务器: ${serverId}`
        );
      }
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "连接服务器失败", InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * 断开指定MCP服务器连接
   */
  static async disconnectServer(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      
      if (!serverId) {
        InfoController.sendErrorResponse(
          res, 400, "断开服务器连接失败", "必须指定服务器ID"
        );
        return;
      }
      
      await mcpClient.disconnect(serverId);
      
      const info = await mcpClient.getServerInfo();
      res.json(info);
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "断开服务器连接失败", InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * 强制重新加载MCP配置
   */
  static async reloadConfig(req: Request, res: Response): Promise<void> {
    try {
      const success = await reloadMCPConfig();
      
      if (success) {
        const info = await mcpClient.getServerInfo();
        res.json(info);
      } else {
        InfoController.sendErrorResponse(
          res, 500, "重新加载MCP配置失败", "无法完成配置重新加载"
        );
      }
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "重新加载MCP配置失败", InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * 读取MCP配置文件
   * @returns MCP配置对象
   */
  private static async readMCPConfig(): Promise<MCPConfigType> {
    const configContent = await fs.promises.readFile(MCP_CONFIG_PATH, 'utf-8');
    return JSON.parse(configContent);
  }

  /**
   * 保存MCP配置文件
   * @param config MCP配置对象
   */
  private static async saveMCPConfig(config: MCPConfigType): Promise<void> {
    await fs.promises.writeFile(MCP_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * 添加新MCP服务器
   */
  static async addServer(req: Request, res: Response): Promise<void> {
    try {
      const serverData: MCPServer = req.body;
      
      // 验证必要字段
      if (!serverData.id || !serverData.name || !serverData.connectionType) {
        InfoController.sendErrorResponse(
          res, 400, "服务器数据无效", "必须提供id、name和connectionType字段"
        );
        return;
      }
      
      // 验证连接类型特定的字段
      if (serverData.connectionType === 'stdio') {
        if (!serverData.command || !serverData.args || !Array.isArray(serverData.args)) {
          InfoController.sendErrorResponse(
            res, 400, "服务器数据无效", "stdio连接类型必须提供command和args数组"
          );
          return;
        }
      } else if (serverData.connectionType === 'sse') {
        if (!serverData.sseUrl) {
          InfoController.sendErrorResponse(
            res, 400, "服务器数据无效", "sse连接类型必须提供sseUrl"
          );
          return;
        }
      } else {
        InfoController.sendErrorResponse(
          res, 400, "服务器数据无效", "connectionType必须是stdio或sse"
        );
        return;
      }
      
      // 读取配置文件
      const config = await InfoController.readMCPConfig();
      
      // 检查是否已存在相同ID的服务器
      if (config.servers.some(server => server.id === serverData.id)) {
        InfoController.sendErrorResponse(
          res, 400, "服务器ID已存在", `ID为${serverData.id}的服务器已存在`
        );
        return;
      }
      
      // 添加新服务器
      config.servers.push(serverData);
      
      // 保存配置文件
      await InfoController.saveMCPConfig(config);
      
      // 强制重新加载配置
      await reloadMCPConfig();
      
      // 获取更新后的服务器信息
      const info = await mcpClient.getServerInfo();
      res.json(info);
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "添加服务器失败", InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * 更新MCP服务器配置
   */
  static async updateServer(req: Request, res: Response): Promise<void> {
    try {
      const serverId = req.params.serverId;
      const serverData: Partial<MCPServer> = req.body;
      
      if (!serverId) {
        InfoController.sendErrorResponse(res, 400, "更新服务器失败", "服务器ID不能为空");
        return;
      }
      
      // 读取配置文件
      const config = await InfoController.readMCPConfig();
      
      // 查找并更新服务器
      const serverIndex = config.servers.findIndex(server => server.id === serverId);
      if (serverIndex === -1) {
        InfoController.sendErrorResponse(
          res, 404, "服务器不存在", `ID为${serverId}的服务器不存在`
        );
        return;
      }
      
      // 保留ID不变，更新其他字段
      const updatedServer: MCPServer = {
        ...config.servers[serverIndex],
        ...serverData,
        id: serverId 
      };
      
      config.servers[serverIndex] = updatedServer;
      
      // 保存配置文件
      await InfoController.saveMCPConfig(config);
      
      // 强制重新加载配置
      await reloadMCPConfig();
      
      // 获取更新后的服务器信息
      const info = await mcpClient.getServerInfo();
      res.json(info);
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "更新服务器失败", InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * 删除MCP服务器配置
   */
  static async deleteServer(req: Request, res: Response): Promise<void> {
    try {
      const serverId = req.params.serverId;
      
      if (!serverId) {
        InfoController.sendErrorResponse(res, 400, "删除服务器失败", "服务器ID不能为空");
        return;
      }
      
      // 读取配置文件
      const config = await InfoController.readMCPConfig();
      
      // 查找服务器
      const serverIndex = config.servers.findIndex(server => server.id === serverId);
      if (serverIndex === -1) {
        InfoController.sendErrorResponse(
          res, 404, "服务器不存在", `ID为${serverId}的服务器不存在`
        );
        return;
      }
      
      // 先尝试断开连接
      try {
        await mcpClient.disconnect(serverId);
      } catch (error) {
        // 忽略断开连接失败的错误
        console.error('断开连接失败:', error);
      }
      
      // 删除服务器
      config.servers.splice(serverIndex, 1);
      
      // 保存配置文件
      await InfoController.saveMCPConfig(config);
      
      // 强制重新加载配置
      await reloadMCPConfig();
      
      // 获取更新后的服务器信息
      const updatedInfo = await mcpClient.getServerInfo();
      res.json(updatedInfo);
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "删除服务器失败", InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * 查看服务器信息（不连接）
   */
  static async viewServer(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      
      if (!serverId) {
        res.status(400).json({ error: '缺少服务器ID参数' });
        return;
      }
      
      // 切换当前选中的服务器
      const switched = mcpClient.switchCurrentServer(serverId);
      if (!switched) {
        InfoController.sendErrorResponse(
          res, 404, "服务器不存在", `ID为${serverId}的服务器不存在`
        );
        return;
      }
      
      // 获取更新后的服务器信息
      const serverInfo = await mcpClient.getServerInfo();
      
      // 如果没有找到指定的服务器（虽然切换成功，但安全检查）
      if (!serverInfo.availableServers?.find(s => s.id === serverId)) {
        InfoController.sendErrorResponse(
          res, 404, "服务器不存在", `ID为${serverId}的服务器不存在`
        );
        return;
      }
      
      res.json(serverInfo);
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "查看服务器信息失败", InfoController.getErrorMessage(error)
      );
    }
  }
} 