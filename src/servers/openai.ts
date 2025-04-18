import { OpenAI as OpenAIClient } from 'openai';
import { Logger } from '../utils/logger.js';
import { ChatConfig, ToolsConfig } from '../config/feature-config.js';
import { mcpClient } from '../core/client.js';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import { AIProvider } from '../types/config.types.js';
import { OpenAINameCodec } from '../utils/openai-util.js';
import { ConfigService } from '../services/config.service.js';

// 扩展Delta接口以支持reasoning_content属性
interface ExtendedDelta {
  content?: string;
  reasoning_content?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
  [key: string]: any;
}

// 定义流式响应数据块的接口
interface ChunkResponse {
  content?: string;
  reasoning_content?: string;
  tool_call?: {
    index: number;
    id: string;
    name?: string;
  };
  tool_call_update?: {
    index: number;
    name?: string;
    completeArguments?: string;
    tool_call_id?: string;
  };
  tool_call_result?: {
    name: string;
    result: any;
    error?: boolean;
    tool_call_id?: string;
    index?: number;
    execution_time?: number;
    token_usage?: any;
  };
  special_notice?: {
    type: string;
    title: string;
    message: string;
    level: 'info' | 'warning' | 'error';
  };
  error?: string;
  [key: string]: any;
}

/**
 * OpenAI工具调用的函数定义
 */
interface OpenAIFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * OpenAI工具定义
 */
interface OpenAITool {
  type: "function";
  function: OpenAIFunctionDefinition;
}

/**
 * 工具调用封装
 */
interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, any>;
  argumentsText?: string;
  result?: any;
  meta?: {
    round?: number;
    localIndex?: number;
    globalIndex?: number;
    createdAt?: string;
    status?: 'pending' | 'completed' | 'error' | 'interrupted';
    completedAt?: string;
    errorMessage?: string;
    interruptReason?: string;
    executionTime?: number;
    tokenUsage?: any;
  };
}

/**
 * 使用量统计
 */
interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 聊天响应结果
 */
interface ChatResponse {
  content: string;
  model: string;
  tool_calls?: ToolCallInfo[];
  reasoning_content?: string;
  finish_reason?: string;
  usage: UsageInfo;
}

/**
 * 工具调用管理器 - 负责工具调用的生命周期管理
 */
class ToolCallManager {
  // 所有工具调用
  private toolCalls: ToolCallInfo[] = [];
  // 全局索引到工具调用的映射 - 用于快速查找
  private indexMap: Map<number, ToolCallInfo> = new Map();
  // 当前回合
  private currentRound: number = 0;
  // 服务提供商名称 - 用于日志
  private providerName: string;
  // 状态更新回调
  private onChunk: (chunk: ChunkResponse, done: boolean) => void;
  // 是否因达到最大调用次数而中断
  private reachedMaxRounds: boolean = false;
  
  constructor(providerName: string, onChunk: (chunk: ChunkResponse, done: boolean) => void) {
    this.providerName = providerName;
    this.onChunk = onChunk;
  }
  
  /**
   * 设置是否达到最大回合数
   * @param reached 是否达到最大回合数
   */
  setReachedMaxRounds(reached: boolean): void {
    this.reachedMaxRounds = reached;
  }
  
  /**
   * 获取是否达到最大回合数
   * @returns 是否达到最大回合数
   */
  hasReachedMaxRounds(): boolean {
    return this.reachedMaxRounds;
  }
  
  /**
   * 创建新的工具调用
   * @param index 本地索引（当前回合内的索引）
   * @param id 工具调用ID
   * @param name 工具名称
   * @returns 全局索引
   */
  createToolCall(index: number, id?: string, name: string = ''): number {
    // 生成工具调用ID（如果未提供）
    const toolCallId = id || `tool-call-round-${this.currentRound}-${Date.now()}-${index}`;
    // 计算全局索引
    const globalIndex = this.toolCalls.length;
    
    // 定义元工具列表
    const metaTools = ['listAllApis', 'getApiDetails', 'executeApi'];
    
    // 创建工具调用对象
    const toolCall: ToolCallInfo = {
      id: toolCallId,
      // 如果是元工具则不进行解码
      name: metaTools.includes(name) ? name : OpenAINameCodec.decode(name),
      arguments: {},
      meta: {
        round: this.currentRound,
        localIndex: index,
        globalIndex: globalIndex,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    };
    
    // 添加到集合和映射
    this.toolCalls.push(toolCall);
    this.indexMap.set(globalIndex, toolCall);
    
    // 通知前端新的工具调用创建
    this.onChunk({
      tool_call: {
        index: globalIndex,
        id: toolCallId,
        name: toolCall.name
      }
    }, false);
    
    Logger.info('OPENAI', `[${this.providerName}] 创建工具调用 [索引${globalIndex}], 回合${this.currentRound}, ID: ${toolCallId}`);
    
    return globalIndex;
  }
  
  /**
   * 更新工具调用参数
   * @param globalIndex 全局索引
   * @param argumentText 参数文本片段
   */
  updateToolArguments(globalIndex: number, argumentText: string): void {
    const toolCall = this.indexMap.get(globalIndex);
    if (!toolCall) {
      Logger.error('OPENAI', `[${this.providerName}] 尝试更新不存在的工具调用参数 [索引${globalIndex}]`);
      return;
    }

    // 累积参数文本
    if (!toolCall.argumentsText) {
      toolCall.argumentsText = '';
    }
    toolCall.argumentsText += argumentText;
    
    // 尝试解析参数
    const parsedArgs = this.tryParseJson(toolCall.argumentsText);
    if (parsedArgs !== null) {
      toolCall.arguments = parsedArgs;
      
      // 通知前端完整参数
      this.onChunk({
        tool_call_update: {
          index: globalIndex,
          completeArguments: JSON.stringify(parsedArgs),
          tool_call_id: toolCall.id
        }
      }, false);
    }
  }
  
  /**
   * 尝试解析JSON字符串
   * @param text JSON字符串
   * @returns 解析成功则返回解析后的对象，失败则返回null
   * @private
   */
  private tryParseJson(text: string): any | null {
    if (!text) return null;
    
    text = text.trim();
    // 基本结构检查
    const isStructureComplete = 
      (text.startsWith('{') && text.endsWith('}')) || 
      (text.startsWith('[') && text.endsWith(']'));
      
    if (!isStructureComplete) return null;
    
    // 尝试JSON解析
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }
  
  /**
   * 设置工具调用结果
   * @param globalIndex 全局索引
   * @param result 结果对象
   * @param error 是否发生错误
   * @param errorMessage 错误消息
   * @param tokenUsage Token使用情况
   */
  setToolResult(globalIndex: number, result: any, error: boolean = false, errorMessage?: string, tokenUsage?: any): void {
    const toolCall = this.indexMap.get(globalIndex);
    if (!toolCall) {
      Logger.error('OPENAI', `[${this.providerName}] 尝试设置不存在的工具调用结果 [索引${globalIndex}]`);
      return;
    }
    
    // 保存结果
    toolCall.result = result;
    
    // 更新状态
    if (toolCall.meta) {
      toolCall.meta.status = error ? 'error' : 'completed';
      toolCall.meta.completedAt = new Date().toISOString();
      if (error && errorMessage) {
        toolCall.meta.errorMessage = errorMessage;
      }
      
      // 计算执行时间
      if (toolCall.meta.createdAt) {
        try {
          const startTime = new Date(toolCall.meta.createdAt).getTime();
          const endTime = new Date(toolCall.meta.completedAt || new Date().toISOString()).getTime();
          toolCall.meta.executionTime = endTime - startTime;
        } catch (e) {
          Logger.warn('OPENAI', `[${this.providerName}] 无法计算工具调用执行时间: ${e}`);
        }
      }
      
      // 保存Token使用情况
      if (tokenUsage) {
        toolCall.meta.tokenUsage = tokenUsage;
      }
    }
    
    // 通知前端工具调用结果
    this.onChunk({
      tool_call_result: {
        name: toolCall.name,
        result: result,
        error: error,
        index: globalIndex,
        tool_call_id: toolCall.id,
        execution_time: toolCall.meta?.executionTime,
        token_usage: tokenUsage || toolCall.meta?.tokenUsage
      }
    }, false);
    
    const statusText = error ? '失败' : '成功';
    const timeInfo = `, 耗时: ${toolCall.meta?.executionTime}ms`;
    Logger.info('OPENAI', `[${this.providerName}] 工具调用 [索引${globalIndex}] ${toolCall.name} 执行${statusText}${timeInfo}`);
  }
  
  /**
   * 获取指定回合的工具调用
   * @param round 回合数
   * @returns 此回合的工具调用列表
   */
  getToolCallsByRound(round: number): ToolCallInfo[] {
    return this.toolCalls.filter(tc => tc.meta && tc.meta.round === round);
  }
  
  /**
   * 获取工具调用总数
   */
  getTotalCount(): number {
    return this.toolCalls.length;
  }
  
  /**
   * 获取当前回合数
   */
  getCurrentRound(): number {
    return this.currentRound;
  }
  
  /**
   * 设置当前回合数
   */
  setCurrentRound(round: number): void {
    this.currentRound = round;
  }
  
  /**
   * 获取所有工具调用
   */
  getAllToolCalls(): ToolCallInfo[] {
    return [...this.toolCalls];
  }
  
  /**
   * 确保所有工具调用都已处理（将未完成的调用标记为中断）
   */
  finalizeAllToolCalls(): void {
    let pendingFound = false;
    
    this.toolCalls.forEach((tc) => {
      if (tc.meta && tc.meta.status === 'pending') {
        pendingFound = true;
        tc.meta.status = 'interrupted';
        tc.meta.completedAt = new Date().toISOString();
        
        // 根据是否达到最大回合数设置不同的中断原因
        if (this.reachedMaxRounds) {
          tc.meta.interruptReason = '已达到最大工具调用次数限制';
        } else {
          tc.meta.interruptReason = '工具调用处理过程被中断';
        }
        
        // 计算执行时间
        let executionTime = undefined;
        if (tc.meta.createdAt) {
          try {
            const startTime = new Date(tc.meta.createdAt).getTime();
            const endTime = new Date(tc.meta.completedAt).getTime();
            executionTime = endTime - startTime;
            tc.meta.executionTime = executionTime;
          } catch (e) {
            Logger.warn('OPENAI', `[${this.providerName}] 无法计算工具调用执行时间: ${e}`);
          }
        }
        
        // 通知前端 - 使用globalIndex而不是数组索引
        const globalIndex = tc.meta.globalIndex || 0;
        
        // 根据中断原因设置不同的消息
        let resultMessage = {
          status: 'interrupted',
          message: this.reachedMaxRounds 
                  ? '已达到最大工具调用次数限制' 
                  : '工具调用处理过程被中断',
          details: this.reachedMaxRounds
                  ? `系统限制了最大连续工具调用次数为${this.currentRound}次，为保证系统稳定性，后续工具调用已被中断`
                  : '请求处理结束，工具调用未能完成'
        };

        this.onChunk({
          tool_call_result: {
            name: tc.name,
            result: resultMessage,
            index: globalIndex,  
            tool_call_id: tc.id,
            error: true,
            execution_time: executionTime,
            token_usage: tc.meta.tokenUsage
          }
        }, false);
        
        const timeInfo = executionTime !== undefined ? `, 耗时: ${executionTime}ms` : '';
        const reasonInfo = this.reachedMaxRounds ? '[达到最大调用次数]' : '';
        Logger.info('OPENAI', `[${this.providerName}] 标记中断的工具调用 [索引${globalIndex}]: ${tc.name}${reasonInfo}${timeInfo}`);
      }
    });
    
    if (pendingFound) {
      if (this.reachedMaxRounds) {
        Logger.info('OPENAI', `[${this.providerName}] 已完成所有处理中的工具调用状态更新（因达到最大调用次数而中断）`);
        
        // 发送特殊通知到前端，突出显示达到工具调用上限的警告
        this.onChunk({
          content: "\n\n",
          special_notice: {
            type: "max_tool_calls_reached",
            title: "🚫 工具调用次数已达上限",
            message: `系统限制了最大连续工具调用次数为${this.currentRound}次，为保证系统稳定性，后续工具调用已被中断`,
            level: "warning"
          }
        }, false);
      } else {
        Logger.info('OPENAI', `[${this.providerName}] 已完成所有处理中的工具调用状态更新（标记为中断）`);
      }
    }
  }
  
  /**
   * 是否包含有效的工具调用
   */
  hasValidToolCalls(): boolean {
    return this.toolCalls.some(tc => tc && tc.name);
  }
}

/**
 * OpenAI API客户端包装类
 */
export class OpenAI {
  // 公共属性
  public client: OpenAIClient;
  public config: AIProvider;
  public providerName: string;
  
  // 配置分组
  private chatConfig: {
    defaultTemperature: number;
    defaultMaxTokens: number;
  };
  
  private toolsConfig: {
    enableMCPTools: boolean;
    enableParamValidation: boolean;
    enablePrompts: boolean;
  };
  
  /**
   * 构造函数
   * @param providerConfig 提供商配置对象
   */
  constructor(providerConfig: AIProvider) {
    // 加载全局默认配置
    this.chatConfig = {
      defaultTemperature: ChatConfig.defaultTemperature,
      defaultMaxTokens: ChatConfig.defaultMaxTokens
    };
    
    this.toolsConfig = {
      enableMCPTools: ToolsConfig.enableMCPTools,
      enableParamValidation: ToolsConfig.enableParamValidation,
      enablePrompts: ToolsConfig.enablePrompts
    };
    
    this.config = providerConfig;
    this.providerName = providerConfig.name;
    
    // 覆盖默认值（如果提供商有指定）
    if (this.config.defaultTemperature) {
      this.chatConfig.defaultTemperature = this.config.defaultTemperature;
    }
    
    if (this.config.defaultMaxTokens) {
      this.chatConfig.defaultMaxTokens = this.config.defaultMaxTokens;
    }
    
    // 创建客户端
    this.client = new OpenAIClient({
      apiKey: this.config.apiKey,
      baseURL: this.config.apiUrl
    });
    
    Logger.info('OPENAI', `初始化API客户端: ${this.providerName}, API URL: ${this.config.apiUrl}`);
  }
  
  /**
   * 将MCP工具转换为OpenAI函数定义
   * @returns OpenAI工具定义列表
   */
  private async convertMcpToolsToOpenAIFunctions(): Promise<OpenAITool[]> {
    try {
      // 获取MCP服务器上可用的工具
      const serverInfo = await mcpClient.getServerInfo();
      const mcpTools = serverInfo.tools;
      
      if (!mcpTools || mcpTools.length === 0) {
        Logger.warn('OPENAI', '当前服务器没有可用的工具');
        return [];
      }
      
      // 获取MCP配置中的启用工具服务器ID列表
      const mcpConfig = await ConfigService.getMCPConfig();
      const enabledServerIds = mcpConfig.enabledToolServerIds || [];
      
      // 如果有指定的服务器ID列表且不为空，则过滤工具
      let filteredTools = mcpTools;
      if (enabledServerIds.length > 0) {
        // 获取服务器工具映射
        const serverToolsMap = serverInfo.serverTools || {};
        
        // 过滤只包含指定服务器的工具
        filteredTools = mcpTools.filter(tool => {
          // 查找工具所属的服务器
          for (const serverId in serverToolsMap) {
            if (enabledServerIds.includes(serverId) && 
                serverToolsMap[serverId].some(t => t.name === tool.name)) {
              return true;
            }
          }
          return false;
        });
        
        Logger.info('OPENAI', `[${this.providerName}] 已过滤工具，原有 ${mcpTools.length} 个，过滤后 ${filteredTools.length} 个`);
      }
      
      return filteredTools.map(tool => {
        // 构建参数Schema
        const properties: Record<string, any> = {};
        const required: string[] = [];
        
        // 处理工具参数
        for (const param of tool.parameters) {
          properties[param.name] = {
            type: param.type,
            description: param.description
          };
          
          if (param.required) {
            required.push(param.name);
          }
        }
        
        // 创建OpenAI函数定义
        return {
          type: "function" as const,
          name: tool.name,
          function: {
            name: OpenAINameCodec.encode(tool.name),
            description: tool.description,
            parameters: {
              type: "object",
              properties: properties,
              required: required.length > 0 ? required : undefined
            }
          }
        };
      });
    } catch (error) {
      Logger.error('OPENAI', '获取或转换MCP工具失败:', error);
      return [];
    }
  }
  
  /**
   * 格式化消息数组
   * @param message 消息文本或消息数组
   * @param enableTools 是否启用工具调用
   * @param enablePrompts 是否启用提示词
   * @returns 格式化后的消息数组
   */
  private async formatMessages(message: string | ChatCompletionMessageParam[], enableTools: boolean = false, enablePrompts: boolean = false): Promise<ChatCompletionMessageParam[]> {
    let messages: ChatCompletionMessageParam[];
    
    // 将输入转换为标准消息数组格式
    if (typeof message === 'string') {
      Logger.info('OPENAI', `[${this.providerName}] 处理消息: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
      messages = [{ role: 'user', content: message }];
    } else {
      Logger.info('OPENAI', `[${this.providerName}] 处理消息: ${message.length} 条消息`);
      messages = [...message]; // 创建副本，避免修改原始数据
    }
    
    // 如果启用了工具调用和提示词，添加系统消息
    if (enableTools && enablePrompts) {
      // 检查是否已有系统消息
      const hasSystemMessage = messages.some(msg => msg.role === 'system');
      
      // 如果没有系统消息，添加MCP工具预设词作为系统消息
      if (!hasSystemMessage) {
        // 从数据库获取MCP配置中的工具提示
        const toolPromp = await ConfigService.getSetting('mcpToolPrompt');
          
        messages.unshift({
          role: 'system',
          content: String(toolPromp)
        });
      }
    }
    
    return messages;
  }
  
  /**
   * 使用辅助函数获取工具定义列表
   * @param enableTools 是否启用工具调用
   * @returns 工具定义列表
   */
  private async getToolDefinitions(enableTools: boolean): Promise<OpenAITool[]> {
    if (!enableTools) return [];
    
    try {
      const tools = await this.convertMcpToolsToOpenAIFunctions();
      if (tools.length > 0) {
        Logger.info('OPENAI', `[${this.providerName}] 使用 ${tools.length} 个MCP工具`);
      }
      return tools;
    } catch (error) {
      Logger.warn('OPENAI', `[${this.providerName}] 获取MCP工具失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 创建请求参数对象
   * @param messages 消息历史
   * @param model 模型名称
   * @param temperature 温度参数
   * @param maxTokens 最大生成令牌数
   * @param tools 工具定义列表
   * @param stream 是否流式输出
   * @returns 请求参数对象
   */
  private createRequestParams(
    messages: ChatCompletionMessageParam[],
    model: string,
    temperature: number,
    maxTokens: number,
    tools: OpenAITool[] = [],
    stream: boolean = false
  ) {
    const params = {
      model,
      messages,
      // temperature,
      // max_tokens: maxTokens
    };
    
    if (stream) {
      return {
        ...params,
        stream: true,
        stream_options: {
          include_usage: true
        },
        ...(tools.length > 0 ? { tools } : {})
      };
    }
    
    return {
      ...params,
      ...(tools.length > 0 ? { tools } : {})
    };
  }
  
  /**
   * 处理工具调用结果，转换为字符串
   * @param toolResult 工具调用结果
   * @returns 格式化后的字符串结果
   */
  private formatToolResult(toolResult: any): string {
    if (toolResult && toolResult.content && Array.isArray(toolResult.content)) {
      return toolResult.content
        .filter((item: any) => item.type === 'text' && typeof item.text === 'string')
        .map((item: any) => item.text)
        .join('\n');
    }
    return JSON.stringify(toolResult.content);
  }
  
  /**
   * 处理API响应中的usage信息
   * @param usage API返回的usage信息或null
   * @returns 格式化的UsageInfo对象
   */
  private formatUsage(usage: any): UsageInfo {
    return usage ? {
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0
    } : {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };
  }

  /**
   * 根据提供商名称获取客户端实例用于参数验证
   * @param providerName 提供商名称
   * @returns 客户端和模型配置
   * @private
   */
  private getClientForValidation(providerName: string): { client: OpenAIClient, model: string } {
    // 首先尝试从已初始化的服务实例中获取
    if (providerServices[providerName]) {
      const providerInstance = providerServices[providerName];
      return { 
        client: providerInstance.client, 
        model: providerInstance.config.defaultModel 
      };
    }
    
    // 如果找不到提供商，使用当前客户端
    return { client: this.client, model: this.config.defaultModel };
  }

  /**
   * 验证工具调用参数是否满足要求
   * @param toolName 工具名称
   * @param args 参数对象
   * @returns 验证结果，包含是否有效和错误消息
   */
  private async verifyToolArguments(toolName: string, args: any): Promise<{isValid: boolean, message: string}> {
    // 以下情况跳过验证:
    // 1. 参数校验被禁用
    // 2. 非executeApi工具
    if (!this.toolsConfig.enableParamValidation || 
        toolName !== "executeApi") {
      return {isValid: true, message: ''};
    }
    
    try {
      // 获取工具参数模式
      const toolResult = await mcpClient.callTool<any>('getApiDetails', { apiId: args.apiId });
      
      // 提取API详情中的parameters部分
      let apiParameters = [];
      try {
        // 查找API详情内容
        const apiDetailText = toolResult.content[0]?.text || '';
        const apiDetailMatch = apiDetailText.match(/\{[\s\S]*\}/);
        
        if (apiDetailMatch) {
          const apiDetail = JSON.parse(apiDetailMatch[0]);
          if (apiDetail && apiDetail.parameters && Array.isArray(apiDetail.parameters)) {
            // 如果args.params存在，则只提取使用到的参数
            if (args.params) {
              // 获取用户提供的参数名称
              const providedParamNames = Object.keys(args.params);
              // 筛选只包含用户提供的参数
              apiParameters = apiDetail.parameters.filter((param: any) => 
                providedParamNames.includes(param.name)
              );
            } else {
              apiParameters = apiDetail.parameters;
            }
          }
        }
      } catch (e) {
        Logger.warn('OPENAI', `解析API详情参数失败: ${e}`);
      }
      
      // 如果参数和API参数要求都为空，则直接通过验证
      if ((!args.params || Object.keys(args.params).length === 0) && 
          (!apiParameters || apiParameters.length === 0)) {
        return {isValid: true, message: ''};
      }
      
      // 构造请求AI验证参数的消息
      let messages = [
        {
          role: "system" as const,
          content: "你是一个工具参数验证助手。你的任务是验证提供的参数是否满足工具要求，请懂得灵活变通，不要死板。只回答'是'或'否'，如果是'否',简要说明原因。"
        },
        {
          role: "user" as const,
          content: `参数：${JSON.stringify(args.params)}--工具参数要求：${JSON.stringify(apiParameters)}`
        }
      ];
      if(args.apiId === "doSqlQuery") {
        messages = [
          {
            role: "system" as const,
            content: "你是一个 SQL 验证助手，任务是验证 AI生成的SQL 语句中是否合规。不合规指的是存在占位模版或明显不符合参数名含义，只回答'是'或'否'，如果是'否'，简要说明原因。"
          },
          {
            role: "user" as const,
            content: `${args.params.sql}`
          }
        ]
      }
      
      // 根据apiId选择使用的客户端和模型
      let clientToUse: OpenAIClient;
      let modelToUse: string;
      
      if (args.apiId === "doSqlQuery") {
        // SQL验证使用火山引擎
        const { client, model } = this.getClientForValidation("火山引擎");
        clientToUse = client;
        modelToUse = model;
      } else {
        // 参数验证使用Deepseek
        const { client, model } = this.getClientForValidation("Deepseek");
        clientToUse = client;
        modelToUse = model;
      }
      
      // 发送请求
      const response = await clientToUse.chat.completions.create({
        model: modelToUse,
        messages,
        temperature: 0,  // 使用低温度，让回复更确定
        max_tokens: 100  // 简短回复即可
      }) as any;
      
      const result = response.choices[0].message.content.trim();
      Logger.info('OPENAI', `参数验证结果: ${result}`);
      
      // 解析回复
      if (result.startsWith('是')) {
        return {isValid: true, message: ''};
      } else {
        // 提取错误原因
        const errorMessage = result.replace(/^否[。：:,，、\s]*/i, '').trim();
        return {isValid: false, message: errorMessage || '参数不满足要求'};
      }
    } catch (error) {
      Logger.error('OPENAI', `验证工具参数失败:`, error);
      return {isValid: true, message: ''};  // 验证失败时默认通过，确保流程不中断
    }
  }

  /**
   * 处理聊天请求
   * @param message 用户消息或消息历史
   * @param model 模型名称
   * @param temperature 温度参数
   * @param maxTokens 最大生成令牌数
   * @param enableTools 是否启用工具
   * @param enableParamValidation 是否启用参数校验
   * @param enablePrompts 是否启用提示词
   * @returns 处理结果
   */
  async chat(
    message: string | ChatCompletionMessageParam[], 
    model: string = this.config.defaultModel,
    temperature: number = this.chatConfig.defaultTemperature,
    maxTokens: number = this.chatConfig.defaultMaxTokens,
    enableTools: boolean = this.toolsConfig.enableMCPTools,  // 使用统一配置
    enableParamValidation: boolean = this.toolsConfig.enableParamValidation,  // 使用统一配置
    enablePrompts: boolean = this.toolsConfig.enablePrompts  // 使用统一配置
  ): Promise<ChatResponse> {
    try {
      // 客户端实例临时覆盖
      if (enableParamValidation !== this.toolsConfig.enableParamValidation) {
        this.toolsConfig.enableParamValidation = enableParamValidation;
      }
      
      // 格式化消息
      const messages = await this.formatMessages(message, enableTools, enablePrompts);
      
      // 使用辅助函数获取工具定义
      const openAITools = await this.getToolDefinitions(enableTools);
      
      // 创建请求参数
      const requestParams = this.createRequestParams(
        messages,
        model,
        temperature,
        maxTokens,
        openAITools
      );
      
      // 发送请求
      const response = await this.client.chat.completions.create(requestParams) as any;
      
      const assistantMessage = response.choices[0].message;
      const usage = this.formatUsage(response.usage);
      
      // 检查是否需要调用工具
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        Logger.info('OPENAI', `[${this.providerName}] 大模型请求调用工具: ${assistantMessage.tool_calls.map((t: any) => t.function.name).join(', ')}`);
        
        // 收集工具调用结果
        const toolCalls: ToolCallInfo[] = [];
        
        // 将大模型的回复添加到消息历史
        messages.push(assistantMessage as any);
        
        // 处理每个工具调用
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = OpenAINameCodec.decode(toolCall.function.name);
          const toolArgs = JSON.parse(toolCall.function.arguments);
          
          Logger.info('OPENAI', `[${this.providerName}] 调用工具: ${toolName}, 参数: ${JSON.stringify(toolArgs)}`);
          
          let toolResult: any = null;
          let resultText = '';
          
          try {
            // 验证参数是否满足要求
            const validation = await this.verifyToolArguments(toolName, toolArgs);
            
            if (!validation.isValid) {
              // 参数不满足要求，构造错误消息
              const errorMessage = `参数验证失败: ${validation.message}`;
              Logger.warn('OPENAI', errorMessage);
              
              // 将错误消息添加到消息历史
              messages.push({
                role: "tool",
                content: errorMessage,
                tool_call_id: toolCall.id
              });
              
              // 收集工具调用及其结果
              toolCalls.push({
                id: toolCall.id,
                name: toolName,
                arguments: toolArgs,
                result: errorMessage,
              });
              
              continue; // 跳过工具调用
            }
            
            // 参数验证通过，执行工具调用
            toolResult = await mcpClient.callTool<any>(toolName, toolArgs);
            
            // 使用辅助函数格式化工具结果
            resultText = this.formatToolResult(toolResult);
            
            // 将工具执行结果添加到消息历史
            messages.push({
              role: "tool",
              content: resultText,
              tool_call_id: toolCall.id
            });
            
            Logger.info('OPENAI', `[${this.providerName}] 工具${toolName}执行成功, 结果长度: ${resultText.length}`);
          } catch (error) {
            const errorMessage = `工具${toolName}执行失败: ${error instanceof Error ? error.message : String(error)}`;
            Logger.error('OPENAI', errorMessage);
            
            // 将错误消息添加到消息历史
            messages.push({
              role: "tool",
              content: errorMessage,
              tool_call_id: toolCall.id
            });
            
            resultText = errorMessage;
            
            // 收集工具调用及其结果
            toolCalls.push({
              id: toolCall.id,
              name: toolName,
              arguments: toolArgs,
              result: errorMessage,
            });
          }
          
          // 收集工具调用及其结果
          toolCalls.push({
            id: toolCall.id,
            name: toolName,
            arguments: toolArgs,
            result: resultText,
          });
        }
        
        // 再次调用大模型，处理工具执行结果
        const finalResponse = await this.client.chat.completions.create({
          model,
          messages: messages as ChatCompletionMessageParam[],
          temperature,
          max_tokens: maxTokens
        }) as any;
        
        const finalContent = finalResponse.choices[0].message.content || '';
        
        Logger.info('OPENAI', `[${this.providerName}] 收到最终回复，长度: ${finalContent.length}字符`);
        
        // 返回带工具调用信息的结果
        return {
          content: finalContent,
          model: model,
          tool_calls: toolCalls,
          usage: usage
        };
      } else {
        // 不需要调用工具，直接返回大模型回复
        const aiResponse = assistantMessage.content || '';
        
        Logger.info('OPENAI', `[${this.providerName}] 收到回复，长度: ${aiResponse.length}字符`);
        
        return {
          content: aiResponse,
          model: model,
          usage: usage
        };
      }
    } catch (error: any) {
      Logger.error('OPENAI', `[${this.providerName}] 聊天API调用失败:`, error);
      throw new Error(`${this.providerName} API错误: ${error.message}`);
    }
  }

/**
   * 处理模型的流式响应
   * @param stream 模型流式响应
   * @param round 当前回合数
   * @param toolManager 工具调用管理器
   * @param fullContent 累积的完整内容
   * @param fullReasoningContent 累积的推理内容
   * @param usage 使用量统计
   * @param finishReasonResult 完成原因
   * @param model 模型名称
   * @param onChunk 数据块回调函数
   * @returns 包含处理结果的对象
   * @private
   */
private async processModelResponse(
  stream: any,
  round: number,
  toolManager: ToolCallManager,
  fullContent: string,
  fullReasoningContent: string,
  usage: UsageInfo | null,
  finishReasonResult: string | undefined | null,
  onChunk: (chunk: ChunkResponse, done: boolean) => void
): Promise<{
  fullContent: string,
  fullReasoningContent: string,
  usage: UsageInfo | null,
  finishReasonResult: string | undefined | null,
  hasNewToolCalls: boolean,
  newToolCalls: ToolCallInfo[]
}> {
  let hasNewToolCalls = false;
  let newToolCalls: ToolCallInfo[] = [];
  let updatedContent = fullContent;
  let updatedReasoningContent = fullReasoningContent;
  let updatedUsage = usage;
  let updatedFinishReason = finishReasonResult;
  
  const roundDescription = round === 0 ? "初始" : `回合${round}`;
  
  try {
// 处理流式响应
for await (const chunk of stream) {
  // 提取delta信息
  const delta = chunk.choices?.[0]?.delta as ExtendedDelta || {};
  const content = delta.content || '';
  const reasoningContent = delta.reasoning_content || '';
  const deltaToolCalls = delta.tool_calls || [];
  const finishReason = chunk.choices?.[0]?.finish_reason;
  
  // 处理内容
  if (content) {
    updatedContent += content;
    onChunk({ content }, false);
  }
  
  if (reasoningContent) {
    updatedReasoningContent += reasoningContent;
    onChunk({ reasoning_content: reasoningContent }, false);
  }
  
  // 处理工具调用
  if (deltaToolCalls.length > 0) {
    hasNewToolCalls = true;
    
    for (const deltaToolCall of deltaToolCalls) {
      if (deltaToolCall.index !== undefined) {
        const localIndex = deltaToolCall.index;
        let globalIndex: number;
        
        // 处理现有或新工具调用
        if (round === 0) {
          // 初始回合 - 检查工具调用是否已创建
          const existingToolCalls = toolManager.getAllToolCalls();
          const existingCall = existingToolCalls.find(tc => 
            tc.meta?.round === 0 && tc.meta?.localIndex === localIndex);
          
            if (!existingCall) {
              // 创建新工具调用
              globalIndex = toolManager.createToolCall(localIndex, deltaToolCall.id, deltaToolCall.function?.name);
            } else {
              globalIndex = existingCall.meta?.globalIndex as number;
            }
          } else {
            // 后续回合 - 检查是否已存在此索引的工具调用
            if (!newToolCalls[localIndex]) {
              // 创建新工具调用
              globalIndex = toolManager.createToolCall(localIndex, deltaToolCall.id, deltaToolCall.function?.name || '');
              
              // 将新工具调用添加到集合
              newToolCalls[localIndex] = toolManager.getAllToolCalls()[globalIndex];
            } else {
              globalIndex = newToolCalls[localIndex].meta?.globalIndex as number;
            }
          }
          
          // 更新工具参数流式信息
          if (deltaToolCall.function?.arguments) {
            toolManager.updateToolArguments(globalIndex, deltaToolCall.function.arguments);
          }
        }
      }
    }

       // 检查是否完成
       if (chunk.usage || finishReason === 'stop') {
        if (chunk.usage) {
          updatedUsage = this.formatUsage(chunk.usage);
          Logger.info('OPENAI', `[${this.providerName}] ${roundDescription}: 模型回复完成,token使用信息: ${JSON.stringify(updatedUsage)}`);
        }
        
        if (finishReason === 'stop') {
          updatedFinishReason = finishReason;
          Logger.info('OPENAI', `[${this.providerName}] ${roundDescription}: 模型回复完成,完成原因: ${finishReason}`);
        }
      }
    }
    
    return {
      fullContent: updatedContent,
      fullReasoningContent: updatedReasoningContent,
      usage: updatedUsage,
      finishReasonResult: updatedFinishReason,
      hasNewToolCalls,
      newToolCalls: newToolCalls.filter(tc => tc && tc.name)
    };
  } catch (error) {
    Logger.error('OPENAI', `[${this.providerName}] ${roundDescription}: 处理模型响应失败: ${error instanceof Error ? error.message : String(error)}`);
    onChunk({ error: `处理模型响应失败: ${error instanceof Error ? error.message : String(error)}` }, false);
    
    return {
      fullContent: updatedContent,
      fullReasoningContent: updatedReasoningContent,
      usage: updatedUsage,
      finishReasonResult: updatedFinishReason,
      hasNewToolCalls: false,
      newToolCalls: []
    };
  }
}
  /**
   * 处理流式聊天请求
   * @param message 用户消息或消息历史
   * @param onChunk 数据块处理回调
   * @param model 模型名称
   * @param temperature 温度参数
   * @param maxTokens 最大生成令牌数
   * @param enableTools 是否启用工具
   * @param enableParamValidation 是否启用参数校验
   * @param enablePrompts 是否启用提示词
   * @returns 处理结果
   */
  async chatStream(
    message: string | ChatCompletionMessageParam[],
    onChunk: (chunk: ChunkResponse, done: boolean) => void,
    model: string = this.config.defaultModel,
    temperature: number = this.chatConfig.defaultTemperature,
    maxTokens: number = this.chatConfig.defaultMaxTokens,
    enableTools: boolean = this.toolsConfig.enableMCPTools,  // 使用统一配置
    enableParamValidation: boolean = this.toolsConfig.enableParamValidation,  // 使用统一配置
    enablePrompts: boolean = this.toolsConfig.enablePrompts  // 使用统一配置
  ): Promise<ChatResponse> {
    try {
      // 客户端实例临时覆盖
      if (enableParamValidation !== this.toolsConfig.enableParamValidation) {
        this.toolsConfig.enableParamValidation = enableParamValidation;
      }
      
      // 格式化消息
      const messages = await this.formatMessages(message, enableTools, enablePrompts);
      
      // 使用辅助函数获取工具定义
      const openAITools = await this.getToolDefinitions(enableTools);
      
      // 创建请求参数
      const requestParams = this.createRequestParams(
        messages,
        model,
        temperature,
        maxTokens,
        openAITools,
        true // 启用流式输出
      );
      
      // 创建工具调用管理器
      const toolManager = new ToolCallManager(this.providerName, onChunk);
      
      // 最大工具调用次数限制，防止无限循环
      const MAX_TOOL_CALL_ROUNDS = 10;
      
      // 跟踪变量
      let fullContent = '';
      let fullReasoningContent = '';
      let usage: UsageInfo | null = null;
      let finishReasonResult: string | undefined | null = null;
      
      // 创建处理工具调用的函数
      const processToolCalls = async (toolCalls: ToolCallInfo[]): Promise<boolean> => {
        if (toolCalls.length === 0) return false;
        
        const round = toolManager.getCurrentRound();
        Logger.info('OPENAI', `[${this.providerName}] 回合${round}: 处理 ${toolCalls.length} 个工具调用`);
        
        // 将大模型的回复添加到消息历史
        messages.push({
          role: "assistant",
          tool_calls: toolCalls.map(t => ({
            id: t.id,
            function: {
              name: t.name,
              arguments: JSON.stringify(t.arguments)
            },
            type: "function"
          }))
        });
        
        // 处理每个工具调用
        for (const toolCall of toolCalls) {
          const globalIndex = toolCall.meta?.globalIndex as number;
          
          try {
            // 验证参数是否满足要求
            const validation = await this.verifyToolArguments(toolCall.name, toolCall.arguments);
            
            if (!validation.isValid) {
              // 参数不满足要求，构造错误消息
              const errorMessage = `参数验证失败: ${validation.message}`;
              Logger.warn('OPENAI', errorMessage);
              
              // 将错误消息添加到消息历史
              messages.push({
                role: "tool",
                content: errorMessage,
                tool_call_id: toolCall.id
              });
              
              // 更新工具调用错误
              toolManager.setToolResult(globalIndex, errorMessage, true, errorMessage);
              
              continue; // 跳过工具调用
            }
            
            // 参数验证通过，执行工具调用
            const toolResult = await mcpClient.callTool<any>(toolCall.name, toolCall.arguments);
            // 使用辅助函数格式化工具结果
            const resultText = this.formatToolResult(toolResult);
            // 将工具执行结果添加到消息历史
            messages.push({
              role: "tool",
              content: resultText,
              tool_call_id: toolCall.id
            });

            toolManager.setToolResult(globalIndex, resultText, false, undefined, usage);
            
          } catch (error) {
            const errorMessage = `工具${toolCall.name}执行失败: ${error instanceof Error ? error.message : String(error)}`;
            
            // 将错误消息添加到消息历史
            messages.push({
              role: "tool",
              content: errorMessage,
              tool_call_id: toolCall.id
            });
            
            // 更新工具调用错误
            toolManager.setToolResult(globalIndex, errorMessage, true, errorMessage);
          }
        }
        
        // 发送下一轮请求，获取模型继续回复
        try {
          Logger.info('OPENAI', `[${this.providerName}] 回合${round}: 工具调用完成，获取模型回复`);
          
          // 创建下一次请求参数 - 保留工具定义以支持后续工具调用
          const nextRequestParams = this.createRequestParams(
            messages as ChatCompletionMessageParam[],
            model,
            temperature,
            maxTokens,
            openAITools,
            true // 启用流式输出
          );
          
          // 发送请求
          const nextStream = await this.client.chat.completions.create(nextRequestParams);
          
          // 使用通用函数处理流式响应
          const result = await this.processModelResponse(
            nextStream,
            round,
            toolManager,
            fullContent,
            fullReasoningContent,
            usage,
            finishReasonResult,
            onChunk
          );
          
          // 更新全局状态
          fullContent = result.fullContent;
          fullReasoningContent = result.fullReasoningContent;
          usage = result.usage;
          finishReasonResult = result.finishReasonResult;
          
          // 返回是否有新工具调用
          return result.hasNewToolCalls && result.newToolCalls.length > 0;
          
        } catch (error) {
          Logger.error('OPENAI', `[${this.providerName}] 回合${round}: 获取模型回复失败: ${error instanceof Error ? error.message : String(error)}`);
          onChunk({ error: `获取模型回复失败: ${error instanceof Error ? error.message : String(error)}` }, false);
        }
        
        return false;
      };
      
      // 开始流式请求
      const stream = await this.client.chat.completions.create(requestParams);
      
      // 使用通用函数处理初始流式响应
      const initialResult = await this.processModelResponse(
        stream,
        0,
        toolManager,
        fullContent,
        fullReasoningContent,
        usage,
        finishReasonResult,
        onChunk
      );
      
      // 更新状态
      fullContent = initialResult.fullContent;
      fullReasoningContent = initialResult.fullReasoningContent;
      usage = initialResult.usage;
      finishReasonResult = initialResult.finishReasonResult;
      
      // 处理工具调用循环
      if (toolManager.hasValidToolCalls()) {
        toolManager.setCurrentRound(1); // 设置为第1回合
        Logger.info('OPENAI', `[${this.providerName}] 开始工具调用处理循环`);
        
        let initialToolCalls = toolManager.getToolCallsByRound(0);
        let hasMore = await processToolCalls(initialToolCalls);
        
        // 循环处理工具调用，直到没有新的工具调用或达到最大次数限制
        while (hasMore && toolManager.getCurrentRound() < MAX_TOOL_CALL_ROUNDS) {
          // 增加回合数
          toolManager.setCurrentRound(toolManager.getCurrentRound() + 1);
          const round = toolManager.getCurrentRound();
          
          // 检查是否达到最大回合数
          if (round >= MAX_TOOL_CALL_ROUNDS) {
            Logger.warn('OPENAI', `[${this.providerName}] 已达到最大工具调用回合数 ${MAX_TOOL_CALL_ROUNDS}，停止后续调用`);
            onChunk({ content: "\n\n[系统: 已达到最大工具调用次数限制，后续工具调用已被中断]" }, false);
            // 设置达到最大回合数标志
            toolManager.setReachedMaxRounds(true);
            break;
          }
          
          // 获取当前回合的工具调用
          const roundToolCalls = toolManager.getToolCallsByRound(round - 1);
          hasMore = await processToolCalls(roundToolCalls);
        }
        
        // 确保工具全部结束
        toolManager.finalizeAllToolCalls();
      }
      
      Logger.info('OPENAI', `[${this.providerName}] 发送流式完成标志`);
      onChunk({}, true);
      
      // 返回最终结果
      return {
        content: fullContent,
        reasoning_content: fullReasoningContent,
        tool_calls: toolManager.getAllToolCalls(),
        model: model,
        finish_reason: finishReasonResult || undefined,
        usage: usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      };
    } catch (error: any) {
      Logger.error('OPENAI', `[${this.providerName}] 流式聊天API调用失败:`, error);
      throw new Error(`${this.providerName} API流式错误: ${error.message}`);
    }
  }
}

// 为每个提供商创建服务实例映射
const providerServices: { [key: string]: OpenAI } = {};

// 默认服务实例
let openaiService: OpenAI | undefined;

// 初始化标志
let isInitialized = false;

/**
 * 异步初始化所有AI提供商服务
 * 从数据库加载配置并创建服务实例
 */
export async function initializeProviders(): Promise<void> {
  try {
    // 从数据库获取AI提供商配置
    const config = await ConfigService.getAIProvidersConfig();
    
    // 处理没有提供商的情况
    if (!config || !config.providers || config.providers.length === 0) {
      Logger.info('OPENAI', '数据库中没有提供商配置，需要先添加提供商');
      isInitialized = true; // 标记为已初始化，避免重复初始化
      return; // 提前返回，不抛出异常
    }
    
    // 创建所有服务提供商的实例
    for (const provider of config.providers) {
      providerServices[provider.name] = new OpenAI(provider);
      Logger.info('OPENAI', `已初始化提供商实例: ${provider.name}`);
    }
    
    // 设置默认服务实例
    const defaultProviderName = config.defaultProvider;
    if (defaultProviderName && providerServices[defaultProviderName]) {
      openaiService = providerServices[defaultProviderName];
      Logger.info('OPENAI', `使用默认提供商实例: ${defaultProviderName}`);
    } else if (config.providers.length > 0) {
      // 如果没有找到默认提供商，使用第一个
      openaiService = providerServices[config.providers[0].name];
      Logger.info('OPENAI', `默认提供商未指定，使用第一个提供商: ${config.providers[0].name}`);
    }
    
    isInitialized = true;
    Logger.info('OPENAI', '所有AI提供商服务初始化完成');
  } catch (error) {
    Logger.error('OPENAI', '初始化AI提供商服务失败:', error);
    // 设置初始化标志为true，防止反复重试导致的错误堆积
    isInitialized = true;
  }
}

/**
 * 获取提供商服务实例
 * 如果还未初始化，则先初始化
 * @param providerName 提供商名称
 * @returns 提供商服务实例的Promise
 * @throws Error 如果提供商不存在或初始化失败
 */
export async function getProviderService(providerName?: string): Promise<OpenAI> {
  if (!isInitialized) {
    await initializeProviders();
  }
  
  if (providerName && providerServices[providerName]) {
    return providerServices[providerName];
  }
  
  if (!openaiService) {
    throw new Error('无法获取有效的AI提供商服务，请先添加至少一个提供商');
  }
  
  return openaiService;
}

/**
 * 获取默认提供商服务实例
 * @returns 默认提供商服务实例的Promise
 * @throws Error 如果无法获取默认服务
 */
export async function getDefaultService(): Promise<OpenAI> {
  if (!isInitialized) {
    await initializeProviders();
  }
  
  if (!openaiService) {
    throw new Error('无法获取默认AI提供商服务，请先添加至少一个提供商');
  }
  
  return openaiService;
}

/**
 * 重新加载所有AI提供商配置
 * 在数据库配置变更后调用，无需重启服务器
 * @returns 提供商信息对象，包含所有提供商名称和默认提供商
 */
export async function reloadProviders(): Promise<{providers: string[], default: string}> {
  Logger.info('OPENAI', '开始重新加载AI提供商配置');
  
  try {
    // 从数据库获取最新配置
    const config = await ConfigService.getAIProvidersConfig();
    
    // 处理没有提供商的情况
    if (!config || !config.providers || config.providers.length === 0) {
      Logger.info('OPENAI', '数据库中没有提供商配置，返回空结果');
      // 清空当前提供商服务
      Object.keys(providerServices).forEach(key => {
        delete providerServices[key];
      });
      openaiService = undefined;
      
      return {
        providers: [],
        default: ''
      };
    }
    
    // 清空当前提供商服务
    Object.keys(providerServices).forEach(key => {
      delete providerServices[key];
    });
    
    // 重新创建提供商实例
    for (const provider of config.providers) {
      providerServices[provider.name] = new OpenAI(provider);
      Logger.info('OPENAI', `已重新加载提供商实例: ${provider.name}`);
    }
    
    // 更新默认服务实例
    if (config.defaultProvider && providerServices[config.defaultProvider]) {
      openaiService = providerServices[config.defaultProvider];
      Logger.info('OPENAI', `已将默认提供商更新为: ${config.defaultProvider}`);
    } else if (config.providers.length > 0) {
      openaiService = providerServices[config.providers[0].name];
      Logger.info('OPENAI', `默认提供商未指定或无效，使用第一个提供商: ${config.providers[0].name}`);
    } else {
      openaiService = undefined;
      Logger.info('OPENAI', '没有可用的提供商，默认服务实例被设置为undefined');
    }
    
    return {
      providers: Object.keys(providerServices),
      default: config.defaultProvider || (config.providers.length > 0 ? config.providers[0].name : '')
    };
  } catch (error) {
    Logger.error('OPENAI', '重新加载AI提供商配置失败:', error);
    throw error;
  }
}

// 自动初始化提供商服务
initializeProviders().catch(error => {
  Logger.error('OPENAI', '自动初始化AI提供商服务失败:', error);
});

export { openaiService, providerServices }; 