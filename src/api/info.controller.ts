import { Request, Response } from 'express';
import { mcpClient, reloadMCPConfig } from '../core/mcp/index.js';
import { ErrorResponse } from '../types/api.types.js';
import { ConfigService } from '../services/config.service.js';
import { McpInfoAssembler } from '../services/mcp-info-assembler.service.js';
import { ToolPreferencesService } from '../services/tool-preferences.service.js';
import { formatMcpToolResult } from '../utils/mcp-tool-result.js';
import type {
  CallServerToolBody,
  CallServerToolResponse,
  ServerToolPreferencesBody
} from '../types/tool-preferences.types.js';
import { ConnectionType } from '../generated/prisma/client.js';
import { MCPServer } from '../types/config.types.js';
/**
 * MCP信息控制器类
 * 提供与MCP服务器和工具相关的信息
 */
export class InfoController {
  /**
   * 获取错误消息
   */
  private static getErrorMessage(error: unknown): string {
    const messages: string[] = [];
    let current: unknown = error;

    while (current instanceof Error) {
      const message = current.message.trim();
      if (message !== '' && !messages.includes(message)) {
        messages.push(message);
      }
      current = current.cause;
      if (messages.length >= 3) {
        break;
      }
    }

    if (messages.length > 0) {
      return messages.join(' → ');
    }

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
   * Express 5 中路由参数类型为 string | string[]
   */
  private static routeParamToString(value: string | string[] | undefined): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    return Array.isArray(value) ? value[0] : value;
  }

  /**
   * 获取MCP服务信息
   */
  static async getInfo(req: Request, res: Response): Promise<void> {
    try {
      const info = await McpInfoAssembler.assembleForInfoPage();
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
      const serverId = InfoController.routeParamToString(req.params.serverId);
      
      if (!serverId) {
        res.status(400).json({ error: '缺少服务器ID参数' });
        return;
      }
      
      const success = await mcpClient.connect(serverId);
      
      if (success) {
        const info = await McpInfoAssembler.assembleForInfoPage();
        res.json(info);
      } else {
        InfoController.sendErrorResponse(
          res, 400, "连接服务器失败", "连接未成功建立，请检查命令、URL 或网络后重试"
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
      const serverId = InfoController.routeParamToString(req.params.serverId);
      
      if (!serverId) {
        InfoController.sendErrorResponse(
          res, 400, "断开服务器连接失败", "必须指定服务器ID"
        );
        return;
      }
      
      await mcpClient.disconnect(serverId);
      
      const info = await McpInfoAssembler.assembleForInfoPage();
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
        const info = await McpInfoAssembler.assembleForInfoPage();
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
   * 添加新MCP服务器
   */
  static async addServer(req: Request, res: Response): Promise<void> {
    try {
      const serverData: MCPServer = req.body;
      
      // 验证必要字段
      if (!serverData.name || !serverData.connectionType) {
        InfoController.sendErrorResponse(
          res, 400, "服务器数据无效", "必须提供name和connectionType字段"
        );
        return;
      }
      
      // 验证连接类型特定的字段
      if (serverData.connectionType === ConnectionType.STDIO) {
        if (!serverData.command || !serverData.args || !Array.isArray(serverData.args)) {
          InfoController.sendErrorResponse(
            res, 400, "服务器数据无效", "stdio连接类型必须提供command和args数组"
          );
          return;
        }
      } else if (serverData.connectionType === ConnectionType.HTTP) {
        if (!serverData.mcpUrl) {
          InfoController.sendErrorResponse(
            res, 400, "服务器数据无效", "HTTP 连接类型必须提供 mcpUrl（MCP 端点）"
          );
          return;
        }
      } else {
        InfoController.sendErrorResponse(
          res, 400, "服务器数据无效", "connectionType 必须是 STDIO 或 HTTP"
        );
        return;
      }
      
      // 获取当前配置
      const config = await ConfigService.getMCPConfig();
      
      // 检查是否已存在相同ID的服务器
      if (config.servers.some(server => server.serverId === serverData.serverId)) {
        InfoController.sendErrorResponse(
          res, 400, "服务器ID已存在", `ID为${serverData.serverId}的服务器已存在`
        );
        return;
      }
      
      // 添加新服务器
      config.servers.push(serverData);
      
      // 保存配置
      await ConfigService.saveMCPConfig(config);
      
      // 强制重新加载配置
      await reloadMCPConfig();
      
      const info = await McpInfoAssembler.assembleForInfoPage();
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
      const serverId = InfoController.routeParamToString(req.params.serverId);
      const serverData: Partial<MCPServer> = req.body;
      
      if (!serverId) {
        InfoController.sendErrorResponse(res, 400, "更新服务器失败", "服务器ID不能为空");
        return;
      }
      
      // 获取当前配置
      const config = await ConfigService.getMCPConfig();
      
      // 查找并更新服务器
      const serverIndex = config.servers.findIndex(server => server.serverId === serverId);
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
        serverId: serverId 
      };
      
      // 替换数组中的对象
      config.servers[serverIndex] = updatedServer;
      
      // 保存配置
      await ConfigService.saveMCPConfig(config);
      
      // 强制重新加载配置
      await reloadMCPConfig();
      
      const info = await McpInfoAssembler.assembleForInfoPage();
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
      const serverId = InfoController.routeParamToString(req.params.serverId);
      
      if (!serverId) {
        InfoController.sendErrorResponse(res, 400, "删除服务器失败", "服务器ID不能为空");
        return;
      }
      
      // 获取当前配置
      const config = await ConfigService.getMCPConfig();
      
      // 查找要删除的服务器
      const serverIndex = config.servers.findIndex(server => server.serverId === serverId);
      if (serverIndex === -1) {
        InfoController.sendErrorResponse(
          res, 404, "服务器不存在", `ID为${serverId}的服务器不存在`
        );
        return;
      }
      
      // 安全检查 - 确保至少有一个服务器
      if (config.servers.length <= 1) {
        InfoController.sendErrorResponse(
          res, 400, "删除服务器失败", "无法删除唯一的服务器"
        );
        return;
      }
      
      // 检查是否正在连接
      const serverInfo = await mcpClient.getServerInfo();
      const isConnected = serverInfo.connectedServers?.some(server => 
        server.id === serverId
      );
      
      if (isConnected) {
        InfoController.sendErrorResponse(
          res, 400, "删除服务器失败", "无法删除正在连接的服务器"
        );
        return;
      }
      
      // 删除服务器
      config.servers.splice(serverIndex, 1);
      
      // 保存配置
      await ConfigService.saveMCPConfig(config);
      
      // 强制重新加载配置
      await reloadMCPConfig();
      
      const updateInfo = await McpInfoAssembler.assembleForInfoPage();
      res.json(updateInfo);
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "删除服务器失败", InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * 查看MCP服务器配置
   */
  static async switchServer(req: Request, res: Response): Promise<void> {
    try {
      const serverId = InfoController.routeParamToString(req.params.serverId);
      
      if (!serverId) {
        InfoController.sendErrorResponse(res, 400, "查看服务器失败", "服务器ID不能为空");
        return;
      }
      mcpClient.switchCurrentServer(serverId);
      const serverInfo = await McpInfoAssembler.assembleForInfoPage();
      res.json(serverInfo);
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, "查看服务器失败", InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * 获取指定服务器的 per-tool 启用偏好
   */
  static async getToolPreferences(req: Request, res: Response): Promise<void> {
    try {
      const serverId = InfoController.routeParamToString(req.params.serverId);
      if (!serverId) {
        InfoController.sendErrorResponse(res, 400, '缺少服务器 ID', '必须指定 serverId');
        return;
      }
      const preferences = await ToolPreferencesService.getForServer(serverId);
      res.json({ preferences });
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, '获取工具偏好失败', InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * 保存指定服务器的 per-tool 启用偏好
   */
  static async saveToolPreferences(req: Request, res: Response): Promise<void> {
    try {
      const serverId = InfoController.routeParamToString(req.params.serverId);
      if (!serverId) {
        InfoController.sendErrorResponse(res, 400, '缺少服务器 ID', '必须指定 serverId');
        return;
      }
      const body = req.body as ServerToolPreferencesBody;
      if (!body?.preferences || typeof body.preferences !== 'object') {
        InfoController.sendErrorResponse(res, 400, '请求无效', 'preferences 必须为对象');
        return;
      }
      const normalized: Record<string, boolean> = {};
      for (const [name, value] of Object.entries(body.preferences)) {
        if (typeof value === 'boolean') {
          normalized[name] = value;
        }
      }
      await ToolPreferencesService.saveForServer(serverId, normalized);
      res.json({ ok: true, preferences: normalized });
    } catch (error) {
      InfoController.sendErrorResponse(
        res, 500, '保存工具偏好失败', InfoController.getErrorMessage(error)
      );
    }
  }

  /**
   * Info 页试运行 MCP 工具（不经 Agent / LLM）
   */
  static async callServerTool(req: Request, res: Response): Promise<void> {
    const started = Date.now();
    const abortController = new AbortController();
    // 勿用 req.on('close')：请求体读完后也会触发 close，会把正常试跑误取消
    const abortIfClientGone = (): void => {
      if (!res.writableFinished) {
        abortController.abort();
      }
    };
    req.on('aborted', abortIfClientGone);
    res.on('close', abortIfClientGone);

    try {
      const serverId = InfoController.routeParamToString(req.params.serverId);
      if (!serverId) {
        InfoController.sendErrorResponse(res, 400, '缺少服务器 ID', '必须指定 serverId');
        return;
      }

      const body = req.body as CallServerToolBody;
      if (!body?.toolName || typeof body.toolName !== 'string') {
        InfoController.sendErrorResponse(res, 400, '请求无效', 'toolName 为必填项');
        return;
      }

      const args =
        body.arguments && typeof body.arguments === 'object' && !Array.isArray(body.arguments)
          ? body.arguments
          : {};

      const result = await mcpClient.callToolOnServer(
        serverId,
        body.toolName.trim(),
        args,
        { signal: abortController.signal, timeout: 300_000 }
      );

      const response: CallServerToolResponse = {
        ok: true,
        ms: Date.now() - started,
        output: formatMcpToolResult(result)
      };
      res.json(response);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || /aborted/i.test(error.message))
      ) {
        if (!res.writableEnded) {
          res.status(499).json({
            ok: false,
            ms: Date.now() - started,
            output: '已取消',
            error: '已取消'
          } satisfies CallServerToolResponse);
        }
        return;
      }
      const message = InfoController.getErrorMessage(error);
      const response: CallServerToolResponse = {
        ok: false,
        ms: Date.now() - started,
        output: message,
        error: message
      };
      res.status(500).json(response);
    }
  }
} 