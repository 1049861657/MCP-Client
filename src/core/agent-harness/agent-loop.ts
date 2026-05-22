import { Logger } from '../../utils/logger.js';import { ToolsConfig } from '../../config/feature-config.js';
import { mcpClient } from '../client.js';
import { ToolCallManager } from './tool-executor.js';
import {
  ChatResponse,
  ChunkResponse,
  InternalMessage,
  ILoopState,
  IToolCallRecord,
  ModelResponseResult,
  OpenAITool,
  UsageInfo
} from './types.js';

/** Provider 层能力：Harness 通过此接口调用 LLM，不直接依赖 OpenAI 类 */
export interface AgentLoopProvider {
  providerName: string;
  createRequestParams(
    messages: InternalMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    tools: OpenAITool[],
    stream: boolean
  ): Record<string, unknown>;
  createCompletionStream(
    requestParams: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<AsyncIterable<unknown>>;
  processModelResponse(
    stream: AsyncIterable<unknown>,
    round: number,
    toolManager: ToolCallManager,
    fullContent: string,
    fullReasoningContent: string,
    usage: UsageInfo | null,
    finishReasonResult: string | undefined | null,
    onChunk: (chunk: ChunkResponse, done: boolean) => void
  ): Promise<ModelResponseResult>;
  verifyToolArguments(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ isValid: boolean; message: string }>;
  formatToolResult(toolResult: unknown): string;
}

export interface RunAgentLoopParams {
  messages: InternalMessage[];
  openAITools: OpenAITool[];
  model: string;
  temperature: number;
  maxTokens: number;
  maxToolCallRounds?: number;
  signal?: AbortSignal;
  onChunk: (chunk: ChunkResponse, done: boolean) => void;
  provider: AgentLoopProvider;
}

/**
 * Agent Loop 主入口：流式多轮工具调用 orchestration
 */
export async function runAgentLoop(params: RunAgentLoopParams): Promise<ChatResponse> {
  const {
    messages,
    openAITools,
    model,
    temperature,
    maxTokens,
    maxToolCallRounds = ToolsConfig.maxToolCallRounds,
    signal,
    onChunk,
    provider
  } = params;

  const toolManager = new ToolCallManager(provider.providerName, onChunk);
  const loopState: ILoopState = {
    messages,
    turnCount: 0,
    transitionReason: null
  };

  let fullContent = '';
  let fullReasoningContent = '';
  let usage: UsageInfo | null = null;
  let finishReasonResult: string | undefined | null = null;

  interface ToolRoundResult {
    shouldContinue: boolean;
    nextAssistantReasoning: string;
  }

  const processToolCalls = async (
    toolCalls: IToolCallRecord[],
    assistantReasoning: string
  ): Promise<ToolRoundResult> => {
    if (toolCalls.length === 0) {
      return { shouldContinue: false, nextAssistantReasoning: '' };
    }

    const round = toolManager.getCurrentRound();
    Logger.info('OPENAI', `回合${round}: 处理 ${toolCalls.length} 个工具调用`);

    const assistantMessage: InternalMessage = {
      role: 'assistant',
      content: fullContent || null,
      tool_calls: toolCalls.map(t => ({
        id: t.id,
        function: {
          name: t.codeName,
          arguments: JSON.stringify(t.arguments)
        },
        type: 'function'
      })),
      _source: 'tool'
    };

    if (assistantReasoning) {
      assistantMessage.reasoning_content = assistantReasoning;
    }

    messages.push(assistantMessage);

    const toolResultMessages = await Promise.all(toolCalls.map(async (toolCall) => {
      const globalIndex = toolCall.meta?.globalIndex as number;

      try {
        const validation = await provider.verifyToolArguments(toolCall.name, toolCall.arguments);

        if (!validation.isValid) {
          const errorMessage = `参数验证失败: ${validation.message}`;
          Logger.warn('OPENAI', errorMessage);
          toolManager.setToolResult(globalIndex, errorMessage, true, errorMessage);
          return { tool_call_id: toolCall.id, content: errorMessage };
        }

        const isExecuteApi = toolCall.name === 'executeApi';
        const toolResult = await mcpClient.callTool<unknown>(
          toolCall.codeName,
          toolCall.arguments,
          {
            signal,
            ...(isExecuteApi ? {
              supportsProgress: true,
              onProgress: (progress, total, message, elapsed_ms) => {
                toolManager.setToolProgress(globalIndex, progress, total, message, elapsed_ms);
              }
            } : {})
          }
        );

        const resultText = provider.formatToolResult(toolResult);
        toolManager.setToolResult(globalIndex, resultText, false, undefined, usage);
        return { tool_call_id: toolCall.id, content: resultText };
      } catch (error) {
        if (error instanceof Error && (error.name === 'AbortError' || error.name === 'APIUserAbortError')) {
          throw error;
        }
        const errorMessage = `工具${toolCall.name}执行失败: ${error instanceof Error ? error.message : String(error)}`;
        toolManager.setToolResult(globalIndex, errorMessage, true, errorMessage);
        return { tool_call_id: toolCall.id, content: errorMessage };
      }
    }));

    for (const result of toolResultMessages) {
      messages.push({
        role: 'tool',
        content: result.content,
        tool_call_id: result.tool_call_id,
        _source: 'tool'
      });
    }

    try {
      const nextRequestParams = provider.createRequestParams(
        messages,
        model,
        temperature,
        maxTokens,
        openAITools,
        true
      );

      const nextStream = await provider.createCompletionStream(nextRequestParams, signal);

      const reasoningBeforeResponse = fullReasoningContent.length;
      const result = await provider.processModelResponse(
        nextStream,
        round,
        toolManager,
        fullContent,
        fullReasoningContent,
        usage,
        finishReasonResult,
        onChunk
      );

      fullContent = result.fullContent;
      fullReasoningContent = result.fullReasoningContent;
      usage = result.usage;
      finishReasonResult = result.finishReasonResult;
      loopState.transitionReason = result.hasNewToolCalls ? 'tool_result' : 'end';

      const nextAssistantReasoning = result.fullReasoningContent.slice(reasoningBeforeResponse);

      return {
        shouldContinue: result.hasNewToolCalls && result.newToolCalls.length > 0,
        nextAssistantReasoning
      };
    } catch (error) {
      Logger.error(
        'OPENAI',
        `[${provider.providerName}] 回合${round}: 获取模型回复失败: ${error instanceof Error ? error.message : String(error)}`
      );
      onChunk({
        error: `获取模型回复失败: ${error instanceof Error ? error.message : String(error)}`
      }, false);
    }

    return { shouldContinue: false, nextAssistantReasoning: '' };
  };

  const requestParams = provider.createRequestParams(
    messages,
    model,
    temperature,
    maxTokens,
    openAITools,
    true
  );

  const stream = await provider.createCompletionStream(requestParams, signal);

  const initialResult = await provider.processModelResponse(
    stream,
    0,
    toolManager,
    fullContent,
    fullReasoningContent,
    usage,
    finishReasonResult,
    onChunk
  );

  fullContent = initialResult.fullContent;
  fullReasoningContent = initialResult.fullReasoningContent;
  usage = initialResult.usage;
  finishReasonResult = initialResult.finishReasonResult;
  loopState.turnCount = 1;

  if (toolManager.hasValidToolCalls()) {
    toolManager.setCurrentRound(1);

    const initialToolCalls = toolManager.getToolCallsByRound(0);
    let roundResult = await processToolCalls(initialToolCalls, initialResult.fullReasoningContent);

    while (roundResult.shouldContinue && toolManager.getCurrentRound() < maxToolCallRounds) {
      toolManager.setCurrentRound(toolManager.getCurrentRound() + 1);
      const round = toolManager.getCurrentRound();
      loopState.turnCount = round + 1;

      if (round >= maxToolCallRounds) {
        Logger.warn('OPENAI', `已达到最大工具调用回合数 ${maxToolCallRounds}，停止后续调用`);
        onChunk({ content: '\n\n[系统: 已达到最大工具调用次数限制，后续工具调用已被中断]' }, false);
        toolManager.setReachedMaxRounds(true);
        loopState.transitionReason = 'end';
        break;
      }

      const roundToolCalls = toolManager.getToolCallsByRound(round - 1);
      roundResult = await processToolCalls(roundToolCalls, roundResult.nextAssistantReasoning);
    }

    toolManager.finalizeAllToolCalls();
  } else {
    loopState.transitionReason = 'end';
  }

  onChunk({}, true);

  return {
    content: fullContent,
    reasoning_content: fullReasoningContent,
    tool_calls: toolManager.getAllToolCalls(),
    model,
    finish_reason: finishReasonResult || undefined,
    usage: usage || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    }
  };
}
