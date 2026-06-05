import {
  buildToolCallsFromStored,
  stringifyToolContent,
} from './message-history-builder.js';

const TRUNCATE_THRESHOLD = 64 * 1024;
const TODO_TOOL_NAME = 'todo';
const TODO_SLOT_KEY = '__todo_slot__';

/**
 * @param {(name: string) => 'system' | 'mcp'} [resolveToolSource]
 */
export class TurnCollector {
  /**
   * @param {(name: string) => 'system' | 'mcp'} [resolveToolSource]
   */
  constructor(resolveToolSource) {
    this._resolveToolSource = resolveToolSource ?? (() => 'mcp');
    this.reset();
  }

  reset() {
    this._turnId = crypto.randomUUID();
    this._reasoning = '';
    /** @type {Map<string, object>} */
    this._toolCallsMap = new Map();
    /** @type {string[]} */
    this._toolCallsOrder = [];
  }

  get turnId() {
    return this._turnId;
  }

  /**
   * @param {{ id: string; name: string; args?: unknown; source?: string }} toolInfo
   */
  onToolCall({ id, name, args, source }) {
    if (!id) {
      return;
    }
    if (name === TODO_TOOL_NAME) {
      const existing = this._toolCallsMap.get(TODO_SLOT_KEY);
      if (existing) {
        existing.revision = (existing.revision ?? 1) + 1;
        existing.args = args ?? existing.args;
        existing.lastToolCallId = id;
        return;
      }
      this._toolCallsOrder.push(TODO_SLOT_KEY);
      this._toolCallsMap.set(TODO_SLOT_KEY, {
        id,
        name: TODO_TOOL_NAME,
        source: source ?? 'system',
        args: args ?? {},
        result: null,
        isError: false,
        executionTime: undefined,
        progressSteps: [],
        revision: 1,
        lastToolCallId: id,
      });
      return;
    }
    this._toolCallsOrder.push(id);
    this._toolCallsMap.set(id, {
      id,
      name,
      source: source ?? this._resolveToolSource(name),
      args: args ?? {},
      result: null,
      isError: false,
      executionTime: undefined,
      progressSteps: [],
    });
  }

  /**
   * @param {string} toolCallId
   * @param {string} completeArguments
   */
  onToolCallUpdate(toolCallId, completeArguments) {
    const tc = this._toolCallsMap.get(toolCallId);
    if (!tc || !completeArguments) {
      return;
    }
    try {
      const parsed = JSON.parse(completeArguments);
      tc.args = parsed;
      const todo = this._toolCallsMap.get(TODO_SLOT_KEY);
      if (
        todo &&
        (todo.lastToolCallId === toolCallId || todo.id === toolCallId) &&
        Array.isArray(parsed.items)
      ) {
        todo.planningItems = parsed.items.map((item) => ({ ...item }));
      }
    } catch {
      /* keep previous args */
    }
  }

  /**
   * @param {unknown} items
   */
  onPlanningSnapshot(items) {
    const todo = this._toolCallsMap.get(TODO_SLOT_KEY);
    if (!todo || !Array.isArray(items)) {
      return;
    }
    todo.planningItems = items.map((item) => ({ ...item }));
  }

  /**
   * @param {{ tool_call_id: string; result: unknown; error?: boolean; execution_time?: number }} info
   */
  onToolCallResult({ tool_call_id, result, error, execution_time }) {
    let tc = this._toolCallsMap.get(tool_call_id);
    if (!tc) {
      const todoSlot = this._toolCallsMap.get(TODO_SLOT_KEY);
      if (todoSlot?.lastToolCallId === tool_call_id) {
        tc = todoSlot;
      }
    }
    if (!tc) {
      return;
    }
    tc.result = this._maybeTruncate(result);
    tc.isError = error === true;
    tc.executionTime = execution_time;
  }

  /**
   * @param {{ index?: number; progress?: number; total?: number; message?: string; elapsed_ms?: number }} info
   */
  onToolProgress({ index, progress, total, message, elapsed_ms }) {
    const id = this._toolCallsOrder[index ?? 0];
    const tc = this._toolCallsMap.get(id);
    if (!tc) {
      return;
    }

    const isDone = total !== undefined && progress !== undefined && progress >= total;
    const toolMatch = message?.match(/:\s*(.+)$/);
    const toolsRaw = toolMatch ? toolMatch[1] : (message ?? '');
    const tools = toolsRaw
      ? toolsRaw.split(/[,，]\s*/).map((t) => t.trim()).filter(Boolean)
      : [];

    tc.progressSteps.push({
      stepNumber: tc.progressSteps.length + 1,
      tools,
      message: message ?? '',
      elapsed_ms: elapsed_ms ?? 0,
      isDone,
    });
  }

  /**
   * @param {string} text
   */
  onReasoning(text) {
    this._reasoning += text;
  }

  /**
   * @returns {{ turnId: string; reasoning?: string; toolCalls?: object[] }}
   */
  collect() {
    const snapshot = { turnId: this._turnId };

    if (this._reasoning) {
      snapshot.reasoning = this._reasoning;
    }

    const toolCalls = this._toolCallsOrder
      .map((id) => this._toolCallsMap.get(id))
      .filter(Boolean);

    if (toolCalls.length > 0) {
      snapshot.toolCalls = toolCalls;
    }

    return snapshot;
  }

  /**
   * @param {string} assistantContent
   * @returns {object[]}
   */
  toHistoryEntries(assistantContent) {
    const entries = [];
    const toolCalls = this._toolCallsOrder
      .map((id) => this._toolCallsMap.get(id))
      .filter(Boolean);

    const assistant = {
      role: 'assistant',
      content: assistantContent ?? '',
      turnId: this._turnId,
    };

    if (this._reasoning) {
      assistant.reasoning_content = this._reasoning;
      assistant.reasoning = this._reasoning;
    }

    if (toolCalls.length > 0) {
      assistant.tool_calls = buildToolCallsFromStored(toolCalls);
      assistant.toolCalls = toolCalls;
      assistant._toolResultsExpanded = true;
      entries.push(assistant);

      for (const tc of toolCalls) {
        if (tc.result === null || tc.result === undefined) {
          continue;
        }
        entries.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: stringifyToolContent(tc.result),
        });
      }
    } else {
      entries.push(assistant);
    }

    return entries;
  }

  /**
   * @param {unknown} result
   * @returns {unknown}
   */
  _maybeTruncate(result) {
    if (result === null || result === undefined) {
      return result;
    }
    const str = typeof result === 'string' ? result : JSON.stringify(result);
    if (str.length <= TRUNCATE_THRESHOLD) {
      return result;
    }
    return {
      _truncated: true,
      preview: str.slice(0, 300),
      originalSize: str.length,
    };
  }
}
