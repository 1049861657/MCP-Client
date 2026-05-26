import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Logger } from '../utils/logger.js';
import { aiService, providerServices, reloadAiProviders } from '../providers/ai-providers.js';
import { mcpClient } from '../core/mcp/index.js';
import { InternalMessage } from '../core/agent-harness/types.js';
import {
  resolveEnableAutoCompact,
  resolveMaxToolCallRounds,
  ToolsConfig
} from '../config/feature-config.js';
import { ConfigService } from '../services/config.service.js';

/**
 * AI Chat API 控制器
 */
export class AiController {
  /**
   * 获取服务实例
   * @param vendorId 供应商ID
   * @returns OpenAI服务实例
   */
  private static getServiceForVendor(vendorId?: string) {
    if (!vendorId) {
      // 使用默认服务
      return aiService;
    }
    
    // 查找供应商服务
    const service = providerServices[vendorId];
    if (service) {
      return service;
    }
    
    // 如果找不到，返回默认服务
    Logger.warn('API', `找不到供应商服务: ${vendorId}，使用默认服务`);
    return aiService;
  }

  /**
   * 处理聊天请求
   * @param req 请求对象
   * @param res 响应对象
   */
  static async chat(req: Request, res: Response): Promise<void> {
    try {
      // 从请求体中获取参数
      const { 
        message, 
        messages = [],
        model, 
        temperature, 
        maxTokens, 
        vendor,
        enableTools = ToolsConfig.enableMCPTools,  // 使用统一配置
        enableParamValidation = ToolsConfig.enableParamValidation,  // 使用统一配置
        enablePrompts = ToolsConfig.enablePrompts,  // 使用统一配置
        maxToolCallRounds: maxToolCallRoundsBody,
        enableAutoCompact,
        compactModel
      } = req.body;

      const maxToolCallRounds = resolveMaxToolCallRounds(maxToolCallRoundsBody);
      const requestId = randomUUID();
      const autoCompact = resolveEnableAutoCompact(enableAutoCompact);
      
      // 验证消息
      if (!message && messages.length === 0) {
        res.status(400).json({ 
          error: '缺少消息参数' 
        });
        return;
      }
      
      // 获取对应供应商的服务
      const service = AiController.getServiceForVendor(vendor);
      
      // 检查服务是否有效
      if (!service) { return;}

      // 准备消息
      let processedMessage;
      if (messages.length > 0) {
        // 使用提供的消息历史
        processedMessage = messages;
        const toolMessageCount = messages.filter((m: { role?: string }) => m.role === 'tool').length;
        Logger.info('API', `收到聊天请求, requestId: ${requestId}, 消息数量: ${messages.length}, tool消息: ${toolMessageCount}, 供应商: ${vendor || '默认'}, 工具模式: ${enableTools}, 参数校验: ${enableParamValidation}, 提示词: ${enablePrompts}, 最大工具轮次: ${maxToolCallRounds}, 自动压缩: ${autoCompact}`);
      } else {
        // 使用单条消息
        processedMessage = message;
        Logger.info('API', `收到聊天请求, 消息长度: ${message.length}, 供应商: ${vendor || '默认'}, 工具模式: ${enableTools}, 参数校验: ${enableParamValidation}, 提示词: ${enablePrompts}, 自动压缩: ${autoCompact}`);
      }
      
      // 调用OpenAI服务
      const response = await service.chat(
        processedMessage,
        model,
        temperature,
        maxTokens,
        enableTools,
        enableParamValidation,  // 传递参数校验状态
        enablePrompts,  // 传递提示词状态
        maxToolCallRounds,
        requestId,
        autoCompact,
        compactModel
      );
      
      // 返回响应
      res.json({
        success: true,
        requestId,
        content: response.content,
        model: response.model,
        tool_calls: response.tool_calls,
        usage: response.usage
      });
    } catch (error: any) {
      Logger.error('API', '处理聊天请求时出错:', error);
      res.status(500).json({ 
        error: error.message 
      });
    }
  }
  
  /**
   * 处理流式聊天请求
   * @param req 请求对象
   * @param res 响应对象
   */
  static async chatStream(req: Request, res: Response): Promise<void> {
    const requestId = randomUUID();
    try {
      // 设置响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      // 通知客户端流已建立（独立的 SSE 帧：event + data + 结束空行）
      // 必须带 data 行和 \n\n，否则后续第一个 chunk 会被 SSE 解析器并入此 begin 帧
      res.write(`event: begin\ndata: ${JSON.stringify({ requestId })}\n\n`);
      // 从请求体中获取参数
      const { 
        message, 
        messages = [],
        model, 
        temperature, 
        maxTokens, 
        vendor,
        enableTools = ToolsConfig.enableMCPTools,  // 使用统一配置
        enableParamValidation = ToolsConfig.enableParamValidation,  // 使用统一配置
        enablePrompts = ToolsConfig.enablePrompts,  // 使用统一配置
        maxToolCallRounds: maxToolCallRoundsBody,
        enableAutoCompact,
        compactModel
      } = req.body;

      const maxToolCallRounds = resolveMaxToolCallRounds(maxToolCallRoundsBody);
      const autoCompact = resolveEnableAutoCompact(enableAutoCompact);
      
      // 验证消息
      if (!message && messages.length === 0) {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ requestId, error: '缺少消息参数' })}\n\n`);
        res.end();
        return;
      }
      
      // 获取对应供应商的服务
      const service = AiController.getServiceForVendor(vendor);
      
      // 检查服务是否有效
      if (!service) {return;}
      
      // 准备消息
      let processedMessage;
      if (messages.length > 0) {
        // 使用提供的消息历史
        processedMessage = messages;
        const toolMessageCount = messages.filter((m: { role?: string }) => m.role === 'tool').length;
        Logger.info('API', `收到流式聊天请求, requestId: ${requestId}, 消息数量: ${messages.length}, tool消息: ${toolMessageCount}, 供应商: ${vendor || '默认'}, 工具模式: ${enableTools}, 参数校验: ${enableParamValidation}, 提示词: ${enablePrompts}, 最大工具轮次: ${maxToolCallRounds}, 自动压缩: ${autoCompact}`);
      } else {
        // 使用单条消息
        processedMessage = message;
        Logger.info('API', `收到流式聊天请求, requestId: ${requestId}, 消息长度: ${message.length}, 供应商: ${vendor || '默认'}, 工具模式: ${enableTools}, 参数校验: ${enableParamValidation}, 提示词: ${enablePrompts}, 自动压缩: ${autoCompact}`);
      }
      
      // 记录开始时间
      const startTime = Date.now();

      // 创建 AbortController，客户端断开 SSE 连接时自动中止后端处理
      // 注意：必须监听 res（响应流）而非 req（请求流）
      // req.on('close') 会在 body-parser 读完请求体后立即触发，与客户端是否断开无关
      // res.on('close') 才代表 SSE 长连接被客户端真正关闭
      const abortController = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) {
          abortController.abort();
        }
      });
      
      // 调用OpenAI服务流式API
      service.chatStream(
        processedMessage,
        (chunk, done) => {
          if (res.writableEnded) return;
          if (done) {
            return;
          }
          if (chunk.contextCompacted) {
            const payload =
              typeof chunk.summaryContent === 'string' && chunk.summaryContent.length > 0
                ? { summaryContent: chunk.summaryContent }
                : {};
            res.write(`event: context_compacted\ndata: ${JSON.stringify(payload)}\n\n`);
            return;
          }
          res.write(`data: ${JSON.stringify({ ...chunk, requestId })}\n\n`);
        },
        model,
        temperature,
        maxTokens,
        enableTools,
        enableParamValidation,
        enablePrompts,
        abortController.signal,
        maxToolCallRounds,
        requestId,
        autoCompact,
        compactModel
      ).then(result => {
        if (res.writableEnded) return;
        // 计算总耗时
        const elapsedTime = (Date.now() - startTime) / 1000;
        
        res.write(`event: usage\n`);
        res.write(`data: ${JSON.stringify({
          requestId,
          ...result.usage,
          elapsedTime: elapsedTime.toFixed(2),
          hasReasoning: !!result.reasoning_content,
          hasTool: result.tool_calls && result.tool_calls.length > 0
        })}\n\n`);
        
        res.write(`event: done\n`);
        res.write(`data: ${JSON.stringify({
          requestId,
          finish_reason: result.finish_reason
        })}\n\n`);
        res.end();
      }).catch(error => {
        if (res.writableEnded) return;
        // 客户端主动中止（AbortError = MCP/fetch；APIUserAbortError = OpenAI SDK）
        if (error.name === 'AbortError' || error.name === 'APIUserAbortError') {
          res.end();
          return;
        }
        Logger.error('API', '流式聊天处理出错:', error);
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ requestId, error: error.message })}\n\n`);
        res.end();
      });
    } catch (error: any) {
      Logger.error('API', '处理流式聊天请求时出错:', error);
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  /**
   * 预览下次请求上下文体量（P1-01-06，无 LLM）
   */
  static async contextPreview(req: Request, res: Response): Promise<void> {
    try {
      const {
        messages = [],
        enableAutoCompact,
        contextOverride = null
      } = req.body as {
        messages?: InternalMessage[];
        enableAutoCompact?: boolean;
        contextOverride?: InternalMessage[] | null;
      };

      if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'messages 必须为数组' });
        return;
      }

      const service = AiController.getServiceForVendor(
        (req.body as { vendor?: string }).vendor
      );
      if (!service) {
        res.status(500).json({ error: '无法获取 AI 服务' });
        return;
      }

      const preview = service.previewMainModelContext(messages, {
        enableAutoCompact: resolveEnableAutoCompact(enableAutoCompact),
        contextOverride: Array.isArray(contextOverride) && contextOverride.length > 0
          ? contextOverride
          : null
      });
      res.json({ success: true, preview });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      Logger.error('API', '上下文预览失败:', error);
      res.status(500).json({ error: errMessage });
    }
  }

  /**
   * 手动压缩会话消息历史（P1-01-05）
   */
  static async compact(req: Request, res: Response): Promise<void> {
    try {
      const {
        messages = [],
        vendor,
        compactModel
      } = req.body as {
        messages?: InternalMessage[];
        vendor?: string;
        compactModel?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: '缺少 messages 参数或消息为空' });
        return;
      }

      const service = AiController.getServiceForVendor(vendor);
      if (!service) {
        res.status(500).json({ error: '无法获取 AI 服务' });
        return;
      }

      const requestId = randomUUID();
      const inputChars = messages.reduce((sum, m) => {
        const c = m.content;
        return sum + (typeof c === 'string' ? c.length : 0);
      }, 0);
      const wallStarted = Date.now();
      Logger.info(
        'API',
        `收到压缩请求 requestId=${requestId} messages=${messages.length} inputChars=${inputChars} ` +
          `vendor=${vendor || '默认'} compactModel=${compactModel ?? '(默认)'}`
      );

      const compacted = await service.compactMessages(messages, compactModel);
      const elapsedMs = Date.now() - wallStarted;
      Logger.info('API', `压缩完成 requestId=${requestId} elapsedMs=${elapsedMs}`);
      res.json({
        success: true,
        requestId,
        elapsedMs,
        messages: compacted
      });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      Logger.error('API', '压缩会话失败:', error);
      res.status(500).json({ error: errMessage });
    }
  }

  /**
   * 获取当前可用的MCP工具
   * @param req 请求对象
   * @param res 响应对象
   */
  static async getAvailableTools(req: Request, res: Response): Promise<void> {
    try {
      // 获取服务器信息，包含工具列表
      const serverInfo = await mcpClient.getServerInfo();
      
      res.json({
        success: true,
        server: serverInfo.server.name,
        tools: serverInfo.tools
      });
    } catch (error: any) {
      Logger.error('API', '获取可用工具时出错:', error);
      res.status(500).json({ 
        error: error.message 
      });
    }
  }
  
  /**
   * 获取MCP服务器列表
   * @param req 请求对象
   * @param res 响应对象
   */
  static async getMCPServers(req: Request, res: Response): Promise<void> {
    try {
      // 直接获取启用的服务器ID列表
      const enabledServerIds = await ConfigService.getSetting('mcpEnabledToolServerIds') || [];
      
      // 获取当前已连接的服务器
      const serverInfo = await mcpClient.getServerInfo();
      
      // 直接使用connectedServers，并添加isEnabled标志
      const servers = serverInfo.connectedServers?.map(server => ({
        id: server.id,
        name: server.name,
        isEnabled: enabledServerIds.includes(server.id)
      })) || [];
      
      res.json({
        success: true,
        servers,
        enabledServerIds
      });
    } catch (error: any) {
      Logger.error('API', '获取MCP服务器列表时出错:', error);
      res.status(500).json({ 
        error: error.message 
      });
    }
  }
  
  /**
   * 更新已启用的MCP服务器ID列表
   * @param req 请求对象
   * @param res 响应对象
   */
  static async updateEnabledServers(req: Request, res: Response): Promise<void> {
    try {
      const { enabledServerIds } = req.body;
      
      if (!Array.isArray(enabledServerIds)) {
        res.status(400).json({
          error: "enabledServerIds必须是数组"
        });
        return;
      }
      
      await ConfigService.saveSetting('mcpEnabledToolServerIds', enabledServerIds);
      
      res.json({
        success: true,
        message: "已成功更新MCP服务器启用状态"
      });
    } catch (error: any) {
      Logger.error('API', '更新MCP服务器启用状态时出错:', error);
      res.status(500).json({ 
        error: error.message 
      });
    }
  }
} 