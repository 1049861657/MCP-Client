import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';

/** 内部消息来源（Harness 上下文构建 / 审计，不发送给 LLM API） */
export type MessageSource = 'user' | 'tool' | 'reminder' | 'compact' | 'system';

/**
 * 内部消息扩展字段规范（P0-02）
 *
 * 内部 `messages[]` 与 API `messages[]` 分离；发送前由 `normalizeMessages()` 剥离。
 * - `_source`：消息来源，便于 Harness 区分用户输入、工具回写、压缩替换等
 * - `_internal`：任意内部标记（如 compact 批次 id、requestId）
 * - `_timestamp`：消息创建时间（ISO 8601）
 */
export interface InternalMessageExtensions {
  _source?: MessageSource;
  _internal?: unknown;
  _timestamp?: string;
  /** DeepSeek 等 reasoning 模型扩展字段，发送 API 前由 normalizeMessages 保留 */
  reasoning_content?: string;
}

/** Harness 内部消息块（可含扩展字段） */
export type InternalMessage = ChatCompletionMessageParam & InternalMessageExtensions;

/** @deprecated 文档别名，等同 InternalMessage */
export type IMessageBlock = InternalMessage;
export type ITransitionReason = 'tool_result' | 'end' | 'max_rounds' | null;

/** 触顶时未完成/中断的工具摘要（P0-05-02 SSE partialResults） */
export interface IPartialToolResult {
  id: string;
  name: string;
  codeName: string;
  status: 'pending' | 'interrupted';
  round?: number;
}

/** Agent Loop 运行时状态 */
export interface ILoopState {
  messages: InternalMessage[];
  turnCount: number;
  transitionReason: ITransitionReason;
}

/** 中断/恢复状态骨架（P1 控制面扩展） */
export interface IRecoveryState {
  interruptedAtTurn: number;
  pendingToolCallIds: string[];
  reason: string;
}

/** SSE 流式 chunk 结构 */
export interface ChunkResponse {
  content?: string;
  reasoning_content?: string;
  tool_call?: {
    index: number;
    id: string;
    name?: string;
  };
  tool_call_update?: {
    index: number;
    completeArguments?: string;
    tool_call_id?: string;
  };
  tool_call_result?: {
    name: string;
    result: unknown;
    error?: boolean;
    tool_call_id?: string;
    index?: number;
    execution_time?: number;
    token_usage?: unknown;
  };
  tool_progress?: {
    index: number;
    progress: number;
    total?: number;
    message?: string;
    elapsed_ms?: number;
  };
  special_notice?: {
    type: string;
    title: string;
    message: string;
    level: 'info' | 'warning' | 'error';
  };
  error?: string;
  [key: string]: unknown;
}

/** 流式 delta 扩展（reasoning_content / tool_calls） */
export interface ExtendedDelta {
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
  [key: string]: unknown;
}

/** 工具调用记录 */
export interface IToolCallRecord {
  id: string;
  codeName: string;
  name: string;
  arguments: Record<string, unknown>;
  argumentsText?: string;
  result?: unknown;
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
    tokenUsage?: unknown;
  };
}

/** @deprecated 兼容旧名，等同 IToolCallRecord */
export type ToolCallInfo = IToolCallRecord;

/** 使用量统计 */
export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** 聊天响应结果 */
export interface ChatResponse {
  content: string;
  model: string;
  tool_calls?: IToolCallRecord[];
  reasoning_content?: string;
  finish_reason?: string;
  usage: UsageInfo;
}

/** OpenAI 工具函数定义 */
export interface OpenAIFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** OpenAI 工具定义 */
export interface OpenAITool {
  type: 'function';
  function: OpenAIFunctionDefinition;
}

/** processModelResponse 返回结构 */
export interface ModelResponseResult {
  fullContent: string;
  fullReasoningContent: string;
  usage: UsageInfo | null;
  finishReasonResult: string | undefined | null;
  hasNewToolCalls: boolean;
  newToolCalls: IToolCallRecord[];
}
