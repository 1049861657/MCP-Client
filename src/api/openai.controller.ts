import { Request, Response } from 'express';
import { Logger } from '../utils/logger.js';
import { openaiService, providerServices, reloadProviders } from '../servers/openai.js';
import { mcpClient } from '../core/client.js';
import { ToolsConfig } from '../config/feature-config.js';

/**
 * OpenAI API控制器
 * 处理OpenAI相关的API请求
 */
export class OpenAIController {
  /**
   * 获取服务实例
   * @param vendorId 供应商ID
   * @returns OpenAI服务实例
   */
  private static getServiceForVendor(vendorId?: string) {
    if (!vendorId) {
      // 使用默认服务
      return openaiService;
    }
    
    // 查找供应商服务
    const service = providerServices[vendorId];
    if (service) {
      return service;
    }
    
    // 如果找不到，返回默认服务
    Logger.warn('API', `找不到供应商服务: ${vendorId}，使用默认服务`);
    return openaiService;
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
        enableParamValidation = ToolsConfig.enableParamValidation  // 使用统一配置
      } = req.body;
      
      // 验证消息
      if (!message && messages.length === 0) {
        res.status(400).json({ 
          error: '缺少消息参数' 
        });
        return;
      }

      // 如果启用了工具调用，确保MCP服务器已连接
      if (enableTools) {
        if (!(await mcpClient.connect())) {
          res.status(500).json({ 
            error: '无法连接到MCP服务器' 
          });
          return;
        }
      }
      
      // 获取对应供应商的服务
      const service = OpenAIController.getServiceForVendor(vendor);

      // 准备消息
      let processedMessage;
      if (messages.length > 0) {
        // 使用提供的消息历史
        processedMessage = messages;
        Logger.info('API', `收到聊天请求, 消息数量: ${messages.length}, 供应商: ${vendor || '默认'}, 工具模式: ${enableTools}, 参数校验: ${enableParamValidation}`);
      } else {
        // 使用单条消息
        processedMessage = message;
        Logger.info('API', `收到聊天请求, 消息长度: ${message.length}, 供应商: ${vendor || '默认'}, 工具模式: ${enableTools}, 参数校验: ${enableParamValidation}`);
      }
      
      // 调用OpenAI服务
      const response = await service.chat(
        processedMessage,
        model,
        temperature,
        maxTokens,
        enableTools,
        enableParamValidation  // 传递参数校验状态
      );
      
      // 返回响应
      res.json({
        success: true,
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
    try {
      // 设置响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // 从请求体中获取参数
      const { 
        message, 
        messages = [],
        model, 
        temperature, 
        maxTokens, 
        vendor,
        enableTools = ToolsConfig.enableMCPTools,  // 使用统一配置
        enableParamValidation = ToolsConfig.enableParamValidation  // 使用统一配置
      } = req.body;
      
      // 验证消息
      if (!message && messages.length === 0) {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: '缺少消息参数' })}\n\n`);
        res.end();
        return;
      }
      
      // 如果启用了工具调用，确保MCP服务器已连接
      if (enableTools) {
        if (!(await mcpClient.connect())) {
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ error: '无法连接到MCP服务器' })}\n\n`);
          res.end();
          return;
        }
      }
      
      // 获取对应供应商的服务
      const service = OpenAIController.getServiceForVendor(vendor);
      
      // 准备消息
      let processedMessage;
      if (messages.length > 0) {
        // 使用提供的消息历史
        processedMessage = messages;
        Logger.info('API', `收到流式聊天请求, 消息数量: ${messages.length}, 供应商: ${vendor || '默认'}, 工具模式: ${enableTools}, 参数校验: ${enableParamValidation}`);
      } else {
        // 使用单条消息
        processedMessage = message;
        Logger.info('API', `收到流式聊天请求, 消息长度: ${message.length}, 供应商: ${vendor || '默认'}, 工具模式: ${enableTools}, 参数校验: ${enableParamValidation}`);
      }
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 调用OpenAI服务流式API
      service.chatStream(
        processedMessage,
        (chunk, done) => {
          if (done) {
            // 流内容结束，但不关闭连接，等待后续的usage信息
            return;
          } else {
            // 发送数据块 - 直接发送整个chunk对象，包含content和reasoning_content
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
        },
        model,
        temperature,
        maxTokens,
        enableTools,
        enableParamValidation  // 传递参数校验状态
      ).then(result => {
        // 计算总耗时
        const elapsedTime = (Date.now() - startTime) / 1000; // 转换为秒
        
        // 流完成后，发送token使用信息和思考耗时
        res.write(`event: usage\n`);
        res.write(`data: ${JSON.stringify({
          ...result.usage,
          elapsedTime: elapsedTime.toFixed(2),
          hasReasoning: !!result.reasoning_content,
          hasTool: result.tool_calls && result.tool_calls.length > 0
        })}\n\n`);
        
        // 发送完成事件，包含finish_reason
        res.write(`event: done\n`);
        res.write(`data: ${JSON.stringify({
          finish_reason: result.finish_reason
        })}\n\n`);
        
        // 最后发送DONE信号并关闭连接
        res.write(`data: [DONE]\n\n`);
        res.end();
      }).catch(error => {
        // 错误处理
        Logger.error('API', '流式聊天处理出错:', error);
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
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
   * 获取当前可用的MCP工具
   * @param req 请求对象
   * @param res 响应对象
   */
  static async getAvailableTools(req: Request, res: Response): Promise<void> {
    try {
      // 确保MCP服务器已连接
      if (!(await mcpClient.connect())) {
        res.status(500).json({ 
          error: '无法连接到MCP服务器' 
        });
        return;
      }
      
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
} 