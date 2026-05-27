import { Logger } from '../../utils/logger.js';
import { ToolsConfig } from '../../config/feature-config.js';
import { mcpClient } from '../mcp/index.js';
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
import { withLlmRetry } from './llm-retry.js';
import { ToolCallManager } from './tool-call-manager.js';
import {
  executeSystemTool,
  isSystemTool
} from './system-tools/system-tool-registry.js';
import {
  ChatResponse,
  ChunkResponse,
  InternalMessage,
  ToolCallRecord,
  ModelResponseResult,
  ChatTool,
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
    tools: ChatTool[],
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
  chatTools: ChatTool[];
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
    chatTools,
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

  const executeOneToolCall = async (
    toolCall: ToolCallRecord
  ): Promise<{ tool_call_id: string; content: string }> => {
    const globalIndex = toolCall.meta?.globalIndex as number;
    const current = toolManager.getToolCall(globalIndex) ?? toolCall;

    if (current.meta?.status === 'completed') {
      return { tool_call_id: current.id, content: String(current.result ?? '') };
    }
    if (current.meta?.status === 'error') {
      const errContent = String(current.result ?? current.meta.errorMessage ?? '');
      return { tool_call_id: current.id, content: errContent };
    }

    const round = toolManager.getCurrentRound();
    const auditBase = {
      requestId,
      round,
      toolName: current.name,
      codeName: current.codeName,
      serverId: isSystemTool(current.codeName)
        ? null
        : mcpClient.getServerIdForTool(current.codeName) ?? null
    };

    toolManager.markExecutionStart(globalIndex);
    const startedAt = Date.now();

    try {
      const validation = await provider.verifyToolArguments(current.name, current.arguments);

      if (!validation.isValid) {
        const errorMessage = `参数验证失败: ${validation.message}`;
        Logger.warn('OPENAI', errorMessage);
        const durationMs = Date.now() - startedAt;
        logToolCallAudit({
          ...auditBase,
          durationMs,
          success: false,
          error: errorMessage
        });
        toolManager.setToolResult(globalIndex, errorMessage, true, errorMessage, usage, durationMs);
        return { tool_call_id: current.id, content: errorMessage };
      }

      const isExecuteApi = current.name === 'executeApi';
      const toolResult = isSystemTool(current.codeName)
        ? await executeSystemTool(current.codeName, current.arguments, { signal })
        : await mcpClient.callTool<unknown>(
          current.codeName,
          current.arguments,
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

      const resultText = isSystemTool(current.codeName)
        ? (typeof toolResult === 'string' ? toolResult : String(toolResult))
        : provider.formatToolResult(toolResult);
      const persistedContent = await persistLargeOutput(current.id, resultText);
      const durationMs = Date.now() - startedAt;
      logToolCallAudit({
        ...auditBase,
        durationMs,
        success: true
      });
      toolManager.setToolResult(globalIndex, persistedContent, false, undefined, usage, durationMs);
      return { tool_call_id: current.id, content: persistedContent };
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'APIUserAbortError')) {
        throw error;
      }
      const errorMessage = `工具${current.name}执行失败: ${error instanceof Error ? error.message : String(error)}`;
      const durationMs = Date.now() - startedAt;
      logToolCallAudit({
        ...auditBase,
        durationMs,
        success: false,
        error: errorMessage
      });
      toolManager.setToolResult(globalIndex, errorMessage, true, errorMessage, usage, durationMs);
      return { tool_call_id: current.id, content: errorMessage };
    }
  };

  toolManager.attachStreamingExecutor(executeOneToolCall);

  const loopState = createLoopState(messages);

  let fullContent = '';
  let fullReasoningContent = '';
  let usage: UsageInfo | null = null;
  let finishReasonResult: string | undefined | null = null;

  const invokeModelRound = async (
    round: number,
    requestParams: Record<string, unknown>
  ): Promise<ModelResponseResult> => {
    return withLlmRetry(
      async () => {
        if (stream) {
          const responseStream = await provider.createCompletionStream(requestParams, signal);
          return provider.processModelResponse(
            responseStream,
            round,
            toolManager,
            fullContent,
            fullReasoningContent,
            usage,
            finishReasonResult,
            onChunk
          );
        }

        const response = await provider.createCompletion(requestParams, signal);
        return provider.processNonStreamResponse(
          response,
          round,
          toolManager,
          fullContent,
          fullReasoningContent,
          usage,
          finishReasonResult,
          onChunk
        );
      },
      {
        label: `round${round}`,
        providerName: provider.providerName,
        signal
      }
    );
  };

  interface ToolRoundResult {
    shouldContinue: boolean;
    nextAssistantReasoning: string;
  }

  const processToolCalls = async (
    toolCalls: ToolCallRecord[],
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

    const globalIndices = toolCalls.map(tc => tc.meta?.globalIndex as number);
    await toolManager.awaitToolExecutions(globalIndices);

    const toolResultMessages = await Promise.all(toolCalls.map(async (toolCall) => {
      const globalIndex = toolCall.meta?.globalIndex as number;
      const current = toolManager.getToolCall(globalIndex) ?? toolCall;

      if (current.meta?.status === 'completed' || current.meta?.status === 'error') {
        return {
          tool_call_id: current.id,
          content: String(current.result ?? current.meta?.errorMessage ?? '')
        };
      }

      return executeOneToolCall(current);
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
        chatTools,
        stream
      );

      const reasoningBeforeResponse = fullReasoningContent.length;
      const result = await invokeModelRound(round, nextRequestParams);

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
    chatTools,
    stream
  );

  const initialResult = await invokeModelRound(0, requestParams);

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
