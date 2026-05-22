import { Logger } from '../../utils/logger.js';
import { ToolsConfig } from '../../config/feature-config.js';
import { mcpClient } from '../client.js';
import { logToolCallAudit } from './audit.js';
import {
  applyContextBeforeLlm,
  isContextSummaryMessage,
  persistLargeOutput
} from './context-budget.js';
import {
  buildPartialResults,
  createLoopState,
  emitMaxToolCallsReached,
  recordTurnEnd
} from './loop-state.js';
import { ToolCallManager } from './tool-executor.js';
import {
  ChatResponse,
  ChunkResponse,
  InternalMessage,
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
  createCompletion(
    requestParams: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<unknown>;
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
  processNonStreamResponse(
    response: unknown,
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
  stream?: boolean;
  signal?: AbortSignal;
  requestId?: string;
  /** 超阈时由 Provider 注入的摘要压缩 */
  summarizeFn?: (messages: InternalMessage[]) => Promise<InternalMessage[]>;
  /** 本轮 LLM 前触发自动摘要压缩时回调（用于 SSE / UI） */
  onContextCompacted?: (summaryContent: string) => void;
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
    stream = true,
    signal,
    requestId = '',
    summarizeFn,
    onContextCompacted,
    onChunk,
    provider
  } = params;

  const prepareContext = async (round: number): Promise<void> => {
    const compacted = await applyContextBeforeLlm(messages, { requestId, round, summarizeFn });
    if (compacted) {
      const summary = messages.find(m => isContextSummaryMessage(m));
      const summaryContent =
        summary && typeof summary.content === 'string' ? summary.content : '';
      onContextCompacted?.(summaryContent);
    }
  };

  const toolManager = new ToolCallManager(provider.providerName, onChunk);
  const loopState = createLoopState(messages);

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
      const auditBase = {
        requestId,
        round,
        toolName: toolCall.name,
        codeName: toolCall.codeName,
        serverId: mcpClient.getServerIdForTool(toolCall.codeName) ?? null
      };
      const startedAt = Date.now();

      try {
        const validation = await provider.verifyToolArguments(toolCall.name, toolCall.arguments);

        if (!validation.isValid) {
          const errorMessage = `参数验证失败: ${validation.message}`;
          Logger.warn('OPENAI', errorMessage);
          logToolCallAudit({
            ...auditBase,
            durationMs: Date.now() - startedAt,
            success: false,
            error: errorMessage
          });
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
        const persistedContent = await persistLargeOutput(toolCall.id, resultText);
        logToolCallAudit({
          ...auditBase,
          durationMs: Date.now() - startedAt,
          success: true
        });
        toolManager.setToolResult(globalIndex, persistedContent, false, undefined, usage);
        return { tool_call_id: toolCall.id, content: persistedContent };
      } catch (error) {
        if (error instanceof Error && (error.name === 'AbortError' || error.name === 'APIUserAbortError')) {
          throw error;
        }
        const errorMessage = `工具${toolCall.name}执行失败: ${error instanceof Error ? error.message : String(error)}`;
        logToolCallAudit({
          ...auditBase,
          durationMs: Date.now() - startedAt,
          success: false,
          error: errorMessage
        });
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
      await prepareContext(round);
      const nextRequestParams = provider.createRequestParams(
        messages,
        model,
        temperature,
        maxTokens,
        openAITools,
        stream
      );

      const reasoningBeforeResponse = fullReasoningContent.length;
      let result: ModelResponseResult;

      if (stream) {
        const nextStream = await provider.createCompletionStream(nextRequestParams, signal);
        result = await provider.processModelResponse(
          nextStream,
          round,
          toolManager,
          fullContent,
          fullReasoningContent,
          usage,
          finishReasonResult,
          onChunk
        );
      } else {
        const nextResponse = await provider.createCompletion(nextRequestParams, signal);
        result = await provider.processNonStreamResponse(
          nextResponse,
          round,
          toolManager,
          fullContent,
          fullReasoningContent,
          usage,
          finishReasonResult,
          onChunk
        );
      }

      fullContent = result.fullContent;
      fullReasoningContent = result.fullReasoningContent;
      usage = result.usage;
      finishReasonResult = result.finishReasonResult;

      const harnessTurn = round + 1;
      const reason = result.hasNewToolCalls ? 'tool_result' : 'end';
      recordTurnEnd(
        loopState,
        harnessTurn,
        reason,
        result.newToolCalls.length,
        provider.providerName
      );

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
      recordTurnEnd(loopState, round + 1, 'end', 0, provider.providerName);
    }

    return { shouldContinue: false, nextAssistantReasoning: '' };
  };

  await prepareContext(0);
  const requestParams = provider.createRequestParams(
    messages,
    model,
    temperature,
    maxTokens,
    openAITools,
    stream
  );

  let initialResult: ModelResponseResult;

  if (stream) {
    const responseStream = await provider.createCompletionStream(requestParams, signal);
    initialResult = await provider.processModelResponse(
      responseStream,
      0,
      toolManager,
      fullContent,
      fullReasoningContent,
      usage,
      finishReasonResult,
      onChunk
    );
  } else {
    const response = await provider.createCompletion(requestParams, signal);
    initialResult = await provider.processNonStreamResponse(
      response,
      0,
      toolManager,
      fullContent,
      fullReasoningContent,
      usage,
      finishReasonResult,
      onChunk
    );
  }

  fullContent = initialResult.fullContent;
  fullReasoningContent = initialResult.fullReasoningContent;
  usage = initialResult.usage;
  finishReasonResult = initialResult.finishReasonResult;

  const initialToolCount = toolManager.hasValidToolCalls()
    ? toolManager.getToolCallsByRound(0).length
    : 0;
  recordTurnEnd(
    loopState,
    1,
    initialToolCount > 0 ? 'tool_result' : 'end',
    initialToolCount,
    provider.providerName
  );

  if (toolManager.hasValidToolCalls()) {
    toolManager.setCurrentRound(1);

    const initialToolCalls = toolManager.getToolCallsByRound(0);
    let roundResult = await processToolCalls(initialToolCalls, initialResult.fullReasoningContent);

    while (roundResult.shouldContinue && toolManager.getCurrentRound() < maxToolCallRounds) {
      toolManager.setCurrentRound(toolManager.getCurrentRound() + 1);
      const round = toolManager.getCurrentRound();

      if (round >= maxToolCallRounds) {
        Logger.warn('OPENAI', `已达到最大工具调用回合数 ${maxToolCallRounds}，停止后续调用`);
        toolManager.setReachedMaxRounds(true);

        const unprocessed = toolManager.getToolCallsByRound(round - 1);
        const partialResults = buildPartialResults(unprocessed);
        emitMaxToolCallsReached(onChunk, round, partialResults);
        recordTurnEnd(
          loopState,
          round + 1,
          'max_rounds',
          unprocessed.length,
          provider.providerName
        );
        break;
      }

      const roundToolCalls = toolManager.getToolCallsByRound(round - 1);
      roundResult = await processToolCalls(roundToolCalls, roundResult.nextAssistantReasoning);
    }

    toolManager.finalizeAllToolCalls();
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
