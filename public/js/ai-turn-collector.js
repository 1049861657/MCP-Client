/**
 * AI聊天应用 - 轮次数据收集器模块
 *
 * 在单次 AI 响应流中收集工具调用、推理内容等所有结构化事件。
 * 流结束后调用 collect() 得到完整的轮次快照，供 IndexedDB 持久化使用。
 *
 * 数据结构（StoredToolCall）：
 *   id            string    - tool_call_id
 *   name          string    - 工具名
 *   args          object    - 调用参数（接收完整参数后覆盖初始值）
 *   result        unknown   - 工具返回值（超 64KB 自动截断为摘要）
 *   isError       boolean   - 是否执行失败
 *   executionTime number?   - 执行耗时（ms）
 *   tokenUsage    object?   - { promptTokens, completionTokens, totalTokens }
 *   progressSteps array     - 子 Agent 步骤列表（ProgressStep[]）
 *
 * 数据结构（ProgressStep）：
 *   stepNumber  number   - 步骤序号（1-based）
 *   tools       string[] - 本步骤调用的工具名列表
 *   message     string   - 原始步骤消息
 *   elapsed_ms  number   - 本步耗时（ms）
 *   isDone      boolean  - 是否为终止步骤
 */

const TRUNCATE_THRESHOLD = 64 * 1024; // 64 KB

class TurnCollector {
    constructor() {
        this.reset();
    }

    reset() {
        this._turnId = crypto.randomUUID();
        this._reasoning = '';
        /** @type {Map<string, object>} tool_call_id → StoredToolCall */
        this._toolCallsMap = new Map();
        /** @type {string[]} 按到达顺序记录 tool_call_id */
        this._toolCallsOrder = [];
    }

    get turnId() {
        return this._turnId;
    }

    /**
     * 工具调用开始事件
     * @param {{id: string, name: string, args: unknown}} toolInfo
     */
    onToolCall({ id, name, args }) {
        if (!id) return;
        this._toolCallsOrder.push(id);
        this._toolCallsMap.set(id, {
            id,
            name,
            args: args ?? {},
            result: null,
            isError: false,
            executionTime: undefined,
            tokenUsage: undefined,
            progressSteps: []
        });
    }

    /**
     * 工具调用参数更新（流式接收到完整参数时触发）
     * @param {string} toolCallId
     * @param {string} completeArguments JSON 字符串
     */
    onToolCallUpdate(toolCallId, completeArguments) {
        const tc = this._toolCallsMap.get(toolCallId);
        if (!tc || !completeArguments) return;
        try {
            tc.args = JSON.parse(completeArguments);
        } catch {
            // 解析失败时保留上次的 args
        }
    }

    /**
     * 工具调用完成事件
     * @param {{tool_call_id: string, result: unknown, error: boolean, execution_time: number, token_usage: object}} info
     */
    onToolCallResult({ tool_call_id, result, error, execution_time, token_usage }) {
        const tc = this._toolCallsMap.get(tool_call_id);
        if (!tc) return;
        tc.result = this._maybeTruncate(result);
        tc.isError = error === true;
        tc.executionTime = execution_time;
        tc.tokenUsage = token_usage;
    }

    /**
     * 子 Agent 进度步骤事件
     * @param {{index: number, progress: number, total: number, message: string, elapsed_ms: number}} info
     */
    onToolProgress({ index, progress, total, message, elapsed_ms }) {
        const id = this._toolCallsOrder[index ?? 0];
        const tc = this._toolCallsMap.get(id);
        if (!tc) return;

        const isDone = total !== undefined && progress >= total;
        const toolMatch = message?.match(/:\s*(.+)$/);
        const toolsRaw = toolMatch ? toolMatch[1] : (message ?? '');
        const tools = toolsRaw
            ? toolsRaw.split(/[,，]\s*/).map(t => t.trim()).filter(Boolean)
            : [];

        tc.progressSteps.push({
            stepNumber: tc.progressSteps.length + 1,
            tools,
            message: message ?? '',
            elapsed_ms: elapsed_ms ?? 0,
            isDone
        });
    }

    /**
     * 推理内容片段追加
     * @param {string} text
     */
    onReasoning(text) {
        this._reasoning += text;
    }

    /**
     * 流结束时调用，返回可直接存入 IndexedDB 的轮次快照
     * 对象仅包含有实际数据的字段（undefined 字段不参与 JSON 序列化）
     * @returns {{ turnId: string, reasoning?: string, toolCalls?: object[] }}
     */
    collect() {
        const snapshot = { turnId: this._turnId };

        if (this._reasoning) {
            snapshot.reasoning = this._reasoning;
        }

        const toolCalls = this._toolCallsOrder
            .map(id => this._toolCallsMap.get(id))
            .filter(Boolean);

        if (toolCalls.length > 0) {
            snapshot.toolCalls = toolCalls;
        }

        return snapshot;
    }

    /**
     * 工具结果超过阈值时，将其替换为摘要对象，防止单条 DB 记录过大。
     * @param {unknown} result
     * @returns {unknown}
     */
    _maybeTruncate(result) {
        if (result === null || result === undefined) return result;
        const str = typeof result === 'string' ? result : JSON.stringify(result);
        if (str.length <= TRUNCATE_THRESHOLD) return result;
        return {
            _truncated: true,
            preview: str.slice(0, 300),
            originalSize: str.length
        };
    }
}

window.AIChatTurnCollector = TurnCollector;
