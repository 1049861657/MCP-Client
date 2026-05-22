import { Logger } from '../../utils/logger.js';
import {
  ChunkResponse,
  InternalMessage,
  ILoopState,
  IPartialToolResult,
  IToolCallRecord,
  ITransitionReason
} from './types.js';

/** 创建 Agent Loop 显式状态 */
export function createLoopState(messages: InternalMessage[]): ILoopState {
  return {
    messages,
    turnCount: 0,
    transitionReason: null
  };
}

/** 每轮结束后更新续行原因并打结构化日志 */
export function recordTurnEnd(
  state: ILoopState,
  turn: number,
  reason: ITransitionReason,
  toolCount: number,
  providerName: string
): void {
  state.turnCount = turn;
  state.transitionReason = reason;
  logTurnSummary(providerName, turn, reason, toolCount);
}

/** 输出 { turn, reason, toolCount } 供排障 */
export function logTurnSummary(
  providerName: string,
  turn: number,
  reason: ITransitionReason,
  toolCount: number
): void {
  Logger.info('HARNESS', `[${providerName}] loop turn end ${JSON.stringify({ turn, reason, toolCount })}`);
}

/** 从工具记录提取触顶时的未完成/中断摘要 */
export function buildPartialResults(toolCalls: IToolCallRecord[]): IPartialToolResult[] {
  return toolCalls
    .filter(tc => tc.meta?.status === 'pending' || tc.meta?.status === 'interrupted')
    .map(tc => ({
      id: tc.id,
      name: tc.name,
      codeName: tc.codeName,
      status: tc.meta?.status === 'pending' ? 'pending' : 'interrupted',
      round: tc.meta?.round
    }));
}

/** 推送顶层 SSE 事件 type: max_tool_calls_reached */
export function emitMaxToolCallsReached(
  onChunk: (chunk: ChunkResponse, done: boolean) => void,
  round: number,
  partialResults: IPartialToolResult[]
): void {
  onChunk({
    type: 'max_tool_calls_reached',
    round,
    partialResults
  }, false);
}
