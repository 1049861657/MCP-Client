import { OpenAI as OpenAIClient } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import {
  AgentLoopProvider,
  AgentPermissionContext,
  runAgentLoop
} from '../core/agent-harness/agent-loop.js';
import { ToolCallManager } from '../core/agent-harness/tool-call-manager.js';
import { normalizeMessages } from '../core/agent-harness/message-normalizer.js';
import {
  ChatResponse,
  ChunkResponse,
  ExtendedDelta,
  InternalMessage,
  ToolCallRecord,
  ModelResponseResult,
  ChatTool,
  UsageInfo
} from '../core/agent-harness/types.js';
import {
  buildMainModelContextPreview,
  compactHistory,
  type CompactSummarizeResult,
  ContextPreviewResult,
  type MainModelContextPreviewOptions
} from '../core/agent-harness/context-budget.js';
import {
  ChatConfig,
  ContextConfig,
  resolveCompactModel,
  resolveEnableAutoCompact,
  resolveSummarizeMaxTokens,
  ToolsConfig
} from '../config/feature-config.js';
import { mcpClient } from '../core/mcp/index.js';
import { ConfigService } from '../services/config.service.js';
import { ToolPolicyService } from '../services/tool-policy.service.js';
import type { ResolvedChatProfile } from '../types/config-plane.types.js';
import { AIProvider } from '../types/config.types.js';
import { Logger } from '../utils/logger.js';
import {
  applyPromptPipelineToMessages,
  type PromptPipelineOptions
} from '../core/agent-harness/prompt-pipeline.js';
import {
  getDefaultEnabledSystemToolNames,
  getSystemToolSchemas
} from '../core/agent-harness/system-tools/system-tool-registry.js';
import { logLlmToolsIfEnabled } from '../utils/llm-tools-debug.js';

/**
 * AI 提供商客户端（Provider 层：模型 I/O + 流式解析，OpenAI SDK 兼容 Chat Completions）
 */
export class AiProvider {
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
    enablePrompts: boolean;
  };

  private chatToolsCache = new Map<string, { tools: ChatTool[]; createdAt: number }>();
  private static readonly CHAT_TOOLS_CACHE_TTL_MS = 60_000;
  
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
  private async convertMcpToolsToChatFunctions(
    enabledServerIds?: string[],
    enabledToolCodeNames?: string[]
  ): Promise<ChatTool[]> {
    try {
      const serverInfo = await mcpClient.getServerInfo();
      const mcpTools = serverInfo.tools;

      if (!mcpTools || mcpTools.length === 0) {
        return [];
      }

      const filterIds =
        enabledServerIds ??
        (await ConfigService.getMCPConfig()).enabledToolServerIds ??
        [];

      if (filterIds.length === 0) {
        return [];
      }

      const enabledSet =
        enabledToolCodeNames !== undefined
          ? new Set(enabledToolCodeNames)
          : undefined;

      const serverToolsMap = serverInfo.serverTools || {};
      const filteredTools = mcpTools.filter((tool) => {
        let onServer = false;
        for (const serverId in serverToolsMap) {
          if (
            filterIds.includes(serverId) &&
            serverToolsMap[serverId].some((t) => t.codeName === tool.codeName)
          ) {
            onServer = true;
            break;
          }
        }
        if (!onServer) {
          return false;
        }
        if (enabledSet !== undefined) {
          return enabledSet.has(tool.codeName);
        }
        return true;
      });
      
      if (filteredTools.length > 0) {
        Logger.info('OPENAI', `使用 ${filteredTools.length} 个MCP工具`);
      }
      
      // 转换为OpenAI工具格式
      return Promise.all(filteredTools.map(async tool => {
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
        
        return {
          type: "function" as const,
          function: {
            name: tool.codeName,
            description: tool.description,
            parameters: {
              type: "object",
              properties: properties,
              required: required
            }
          }
        };
      }));
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
  private buildPromptPipelineOptions(
    enableMcpTools: boolean,
    enablePrompts: boolean,
    resolvedProfile?: ResolvedChatProfile
  ): PromptPipelineOptions {
    return {
      enableTools: this.hasActiveToolCapabilities(enableMcpTools, resolvedProfile),
      enablePrompts,
      resolvedProfile
    };
  }

  private hasActiveToolCapabilities(
    enableMcpTools: boolean,
    resolvedProfile?: ResolvedChatProfile
  ): boolean {
    if (enableMcpTools) {
      return true;
    }
    const names = resolvedProfile?.enabledSystemToolNames;
    if (names === undefined) {
      return getDefaultEnabledSystemToolNames().length > 0;
    }
    return names.length > 0;
  }

  private resolveSystemToolSchemas(resolvedProfile?: ResolvedChatProfile): ChatTool[] {
    return getSystemToolSchemas(resolvedProfile?.enabledSystemToolNames);
  }

  private async formatMessages(
    message: string | InternalMessage[],
    enableMcpTools: boolean = false,
    enablePrompts: boolean = false,
    resolvedProfile?: ResolvedChatProfile
  ): Promise<InternalMessage[]> {
    const messages: InternalMessage[] = typeof message === 'string'
      ? [{ role: 'user', content: message, _source: 'user' }]
      : [...message];

    return applyPromptPipelineToMessages(
      messages,
      this.buildPromptPipelineOptions(enableMcpTools, enablePrompts, resolvedProfile)
    );
  }
  
  private async resolveEnabledToolCodeNames(
    resolvedProfile?: ResolvedChatProfile
  ): Promise<string[] | undefined> {
    return ToolPolicyService.resolveEnabledCodeNamesForProfile(resolvedProfile);
  }

  /**
   * 使用辅助函数获取工具定义列表
   * @param enableMcpTools 是否启用 MCP 工具
   * @returns 工具定义列表
   */
  private async getToolDefinitions(
    enableMcpTools: boolean,
    resolvedProfile?: ResolvedChatProfile
  ): Promise<ChatTool[]> {
    const systemTools = this.resolveSystemToolSchemas(resolvedProfile);
    if (!enableMcpTools) {
      return systemTools;
    }

    try {
      const serverIds = resolvedProfile?.mcpServerIds ?? [];
      const enabledCodeNames = await this.resolveEnabledToolCodeNames(resolvedProfile);
      const cacheKey = ToolPolicyService.buildEnabledSetHash(
        serverIds,
        enabledCodeNames ?? []
      );
      const cached = this.chatToolsCache.get(cacheKey);
      if (
        cached &&
        Date.now() - cached.createdAt < AiProvider.CHAT_TOOLS_CACHE_TTL_MS
      ) {
        if (systemTools.length > 0) {
          Logger.info('OPENAI', `使用 ${systemTools.length} 个 System 内置工具（MCP 缓存命中）`);
        }
        return [...systemTools, ...cached.tools];
      }

      const mcpTools = await this.convertMcpToolsToChatFunctions(
        serverIds.length > 0 ? serverIds : undefined,
        enabledCodeNames
      );
      this.chatToolsCache.set(cacheKey, { tools: mcpTools, createdAt: Date.now() });
      if (systemTools.length > 0) {
        Logger.info('OPENAI', `使用 ${systemTools.length} 个 System 内置工具`);
      }
      return [...systemTools, ...mcpTools];
    } catch (error) {
      Logger.warn('OPENAI', `[${this.providerName}] 获取MCP工具失败: ${error instanceof Error ? error.message : String(error)}`);
      return systemTools;
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
    messages: InternalMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    tools: ChatTool[] = [],
    stream: boolean = false
  ) {
    logLlmToolsIfEnabled(model, tools);
    const params = {
      model,
      messages: normalizeMessages(messages),
      temperature,
      max_tokens: maxTokens
    };
    
    if (stream) {
      return {
        ...params,
        stream: true,
        stream_options: {
          include_usage: true
        },
        ...(tools.length > 0 ? { tools, tool_choice: 'auto' as const } : {})
      };
    }
    
    return {
      ...params,
      ...(tools.length > 0 ? { tools, tool_choice: 'auto' as const } : {})
    };
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
   * 处理聊天请求
   * @param message 用户消息或消息历史
   * @param model 模型名称
   * @param temperature 温度参数
   * @param maxTokens 最大生成令牌数
   * @param enableTools 是否启用工具
   * @param enablePrompts 是否启用提示词
   * @returns 处理结果
   */
  async chat(
    message: string | InternalMessage[],
    model: string = this.config.defaultModel,
    temperature: number = this.chatConfig.defaultTemperature,
    maxTokens: number = this.chatConfig.defaultMaxTokens,
    enableTools: boolean = this.toolsConfig.enableMCPTools,
    enablePrompts: boolean = this.toolsConfig.enablePrompts,
    maxToolCallRounds: number = ToolsConfig.maxToolCallRounds,
    requestId: string = '',
    enableAutoCompact?: boolean,
    compactModel?: string,
    permissionCtx?: AgentPermissionContext
  ): Promise<ChatResponse> {
    try {
      const messages = await this.formatMessages(message, enableTools, enablePrompts);
      const chatTools = await this.getToolDefinitions(enableTools);
      const summarizeFn = this.resolveSummarizeFn(enableAutoCompact, compactModel);

      return await runAgentLoop({
        messages,
        chatTools,
        model,
        temperature,
        maxTokens,
        maxToolCallRounds,
        stream: false,
        requestId,
        summarizeFn,
        onChunk: () => {},
        provider: this.getAgentLoopProvider(),
        permission: permissionCtx
      });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      Logger.error('OPENAI', `[${this.providerName}] 聊天API调用失败:`, error);
      throw new Error(`${this.providerName} API错误: ${errMessage}`);
    }
  }

  /**
   * 为 compactHistory 调用 LLM 生成摘要文本
   */
  private async summarizeForCompact(
    serialized: string,
    model: string,
    signal?: AbortSignal
  ): Promise<CompactSummarizeResult> {
    const maxTokens = resolveSummarizeMaxTokens(serialized.length);
    const started = Date.now();
    const response = await this.client.chat.completions.create(
      {
        model,
        messages: [{ role: 'user', content: serialized }],
        max_tokens: maxTokens,
        temperature: 0.3
      },
      { signal }
    );
    const choice = response.choices[0];
    const finishReason = choice?.finish_reason ?? null;
    const content = choice?.message?.content;
    const elapsedMs = Date.now() - started;
    Logger.info(
      'CONTEXT',
      `摘要 LLM 完成 model=${model} max_tokens=${maxTokens} finish_reason=${finishReason ?? '-'} ` +
        `promptChars=${serialized.length} outChars=${typeof content === 'string' ? content.length : 0} ` +
        `llmMs=${elapsedMs}`
    );
    if (typeof content === 'string' && content.length > 0) {
      return { text: content, finishReason };
    }
    return { text: '（摘要生成失败）', finishReason };
  }

  private resolveSummarizeFn(
    enableAutoCompact?: boolean,
    compactModel?: string,
    signal?: AbortSignal
  ): ((messages: InternalMessage[]) => Promise<InternalMessage[]>) | undefined {
    if (!resolveEnableAutoCompact(enableAutoCompact)) {
      return undefined;
    }
    const summarizeModel = resolveCompactModel(compactModel, this.config.defaultModel);
    return this.buildSummarizeFn(summarizeModel, signal);
  }

  private buildSummarizeFn(
    model: string,
    signal?: AbortSignal
  ): (messages: InternalMessage[]) => Promise<InternalMessage[]> {
    return async (messages: InternalMessage[]) =>
      compactHistory(messages, async (serialized) =>
        this.summarizeForCompact(serialized, model, signal)
      );
  }

  /**
   * 上下文预览（P1-01-06，无 LLM）
   */
  previewMainModelContext(
    messages: InternalMessage[],
    options: MainModelContextPreviewOptions
  ): ContextPreviewResult {
    return buildMainModelContextPreview(messages, options);
  }

  /**
   * 手动压缩会话消息（P1-01-05 / P1-01-09）
   */
  async compactMessages(
    messages: InternalMessage[],
    compactModel?: string,
    signal?: AbortSignal
  ): Promise<InternalMessage[]> {
    const summarizeModel = resolveCompactModel(compactModel, this.config.defaultModel);
    return compactHistory(messages, async (serialized) =>
      this.summarizeForCompact(serialized, summarizeModel, signal)
    );
  }

  /**
   * 构建 Agent Loop 所需的 Provider 适配器
   */
  private getAgentLoopProvider(): AgentLoopProvider {
    return {
      providerName: this.providerName,
      createRequestParams: (...args) => this.createRequestParams(...args),
      createCompletionStream: async (requestParams, signal) => {
        const stream = await this.client.chat.completions.create(
          requestParams as unknown as Parameters<OpenAIClient['chat']['completions']['create']>[0],
          { signal }
        );
        return stream as AsyncIterable<unknown>;
      },
      createCompletion: async (requestParams, signal) => {
        return await this.client.chat.completions.create(
          requestParams as unknown as Parameters<OpenAIClient['chat']['completions']['create']>[0],
          { signal }
        );
      },
      processModelResponse: (...args) => this.processModelResponse(...args),
      processNonStreamResponse: (...args) => this.processNonStreamResponse(...args)
    };
  }

  /**
   * 处理模型的非流式响应
   */
  private async processNonStreamResponse(
    response: unknown,
    round: number,
    toolManager: ToolCallManager,
    fullContent: string,
    fullReasoningContent: string,
    usage: UsageInfo | null,
    finishReasonResult: string | undefined | null,
    onChunk: (chunk: ChunkResponse, done: boolean) => void
  ): Promise<ModelResponseResult> {
    const resp = response as {
      choices?: Array<{
        message?: {
          content?: string | null;
          reasoning_content?: string;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason?: string;
      }>;
      usage?: unknown;
    };

    const choice = resp.choices?.[0];
    const message = choice?.message;
    let updatedContent = fullContent;
    let updatedReasoningContent = fullReasoningContent;
    let hasNewToolCalls = false;
    const newToolCalls: ToolCallRecord[] = [];

    const content = message?.content || '';
    const reasoningContent = message?.reasoning_content || '';

    if (content) {
      updatedContent += content;
      onChunk({ content }, false);
    }

    if (reasoningContent) {
      updatedReasoningContent += reasoningContent;
      onChunk({ reasoning_content: reasoningContent }, false);
    }

    const apiToolCalls = message?.tool_calls ?? [];
    if (apiToolCalls.length > 0) {
      hasNewToolCalls = true;

      for (let localIndex = 0; localIndex < apiToolCalls.length; localIndex++) {
        const apiToolCall = apiToolCalls[localIndex];
        let globalIndex: number;

        if (round === 0) {
          globalIndex = await toolManager.createToolCall(
            localIndex,
            apiToolCall.id,
            apiToolCall.function.name
          );
        } else if (!newToolCalls[localIndex]) {
          globalIndex = await toolManager.createToolCall(
            localIndex,
            apiToolCall.id,
            apiToolCall.function.name
          );
          newToolCalls[localIndex] = toolManager.getAllToolCalls()[globalIndex];
        } else {
          globalIndex = newToolCalls[localIndex].meta?.globalIndex as number;
        }

        toolManager.updateToolArguments(globalIndex, apiToolCall.function.arguments);
      }
    }

    return {
      fullContent: updatedContent,
      fullReasoningContent: updatedReasoningContent,
      usage: resp.usage ? this.formatUsage(resp.usage) : usage,
      finishReasonResult: choice?.finish_reason ?? finishReasonResult,
      hasNewToolCalls,
      newToolCalls: newToolCalls.filter(tc => tc && tc.name)
    };
  }

  /**
   * 处理模型的流式响应
   */
  private async processModelResponse(
    stream: AsyncIterable<unknown>,
    round: number,
    toolManager: ToolCallManager,
    fullContent: string,
    fullReasoningContent: string,
    usage: UsageInfo | null,
    finishReasonResult: string | undefined | null,
    onChunk: (chunk: ChunkResponse, done: boolean) => void
  ): Promise<ModelResponseResult> {
    let hasNewToolCalls = false;
    let newToolCalls: ToolCallRecord[] = [];
    let updatedContent = fullContent;
    let updatedReasoningContent = fullReasoningContent;
    let updatedUsage = usage;
    let updatedFinishReason = finishReasonResult;

    try {
      for await (const chunk of stream) {
        const chunkData = chunk as {
          choices?: Array<{ delta?: ExtendedDelta; finish_reason?: string }>;
          usage?: unknown;
        };
        const delta = chunkData.choices?.[0]?.delta ?? {};
        const content = delta.content || '';
        const reasoningContent = delta.reasoning_content || '';
        const deltaToolCalls = delta.tool_calls || [];
        const finishReason = chunkData.choices?.[0]?.finish_reason;

        if (content) {
          updatedContent += content;
          onChunk({ content }, false);
        }

        if (reasoningContent) {
          updatedReasoningContent += reasoningContent;
          onChunk({ reasoning_content: reasoningContent }, false);
        }

        if (deltaToolCalls.length > 0) {
          hasNewToolCalls = true;

          for (const deltaToolCall of deltaToolCalls) {
            if (deltaToolCall.index !== undefined) {
              const localIndex = deltaToolCall.index;
              let globalIndex: number;

              if (round === 0) {
                const existingToolCalls = toolManager.getAllToolCalls();
                const existingCall = existingToolCalls.find(tc =>
                  tc.meta?.round === 0 && tc.meta?.localIndex === localIndex);

                if (!existingCall) {
                  globalIndex = await toolManager.createToolCall(localIndex, deltaToolCall.id, deltaToolCall.function?.name);
                } else {
                  globalIndex = existingCall.meta?.globalIndex as number;
                }
              } else {
                if (!newToolCalls[localIndex]) {
                  globalIndex = await toolManager.createToolCall(localIndex, deltaToolCall.id, deltaToolCall.function?.name || '');
                  newToolCalls[localIndex] = toolManager.getAllToolCalls()[globalIndex];
                } else {
                  globalIndex = newToolCalls[localIndex].meta?.globalIndex as number;
                }
              }

              if (deltaToolCall.function?.arguments) {
                toolManager.updateToolArguments(globalIndex, deltaToolCall.function.arguments);
              }
            }
          }
        }

        if (chunkData.usage || finishReason === 'stop') {
          if (chunkData.usage) {
            updatedUsage = this.formatUsage(chunkData.usage);
          }

          if (finishReason === 'stop') {
            updatedFinishReason = finishReason;
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
      Logger.error('OPENAI', `[${this.providerName}] : 处理模型响应失败: ${error instanceof Error ? error.message : String(error)}`);
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
   */
  async chatStream(
    message: string | InternalMessage[],
    onChunk: (chunk: ChunkResponse, done: boolean) => void,
    model: string = this.config.defaultModel,
    temperature: number = this.chatConfig.defaultTemperature,
    maxTokens: number = this.chatConfig.defaultMaxTokens,
    enableTools: boolean = this.toolsConfig.enableMCPTools,
    enablePrompts: boolean = this.toolsConfig.enablePrompts,
    signal?: AbortSignal,
    maxToolCallRounds: number = ToolsConfig.maxToolCallRounds,
    requestId: string = '',
    enableAutoCompact?: boolean,
    compactModel?: string,
    resolvedProfile?: ResolvedChatProfile,
    permissionCtx?: AgentPermissionContext
  ): Promise<ChatResponse> {
    try {
      const messages = await this.formatMessages(
        message,
        enableTools,
        enablePrompts,
        resolvedProfile
      );
      const chatTools = await this.getToolDefinitions(enableTools, resolvedProfile);
      const summarizeFn = this.resolveSummarizeFn(enableAutoCompact, compactModel, signal);

      return await runAgentLoop({
        messages,
        chatTools,
        model,
        temperature,
        maxTokens,
        maxToolCallRounds,
        signal,
        requestId,
        summarizeFn,
        onContextCompacted: (summaryContent: string) => {
          onChunk({ contextCompacted: true, summaryContent }, false);
        },
        onChunk,
        provider: this.getAgentLoopProvider(),
        permission: permissionCtx
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error('OPENAI', `[${this.providerName}] 流式聊天API调用失败:`, error);
      throw new Error(`${this.providerName} API流式错误: ${message}`);
    }
  }
}
