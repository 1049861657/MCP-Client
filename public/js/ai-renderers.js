/**
 * AI聊天应用 - 渲染注册表模块
 *
 * 提供可插拔的消息内容渲染架构。
 * 通过 AIChatRenderers.register(type, fn) 扩展新渲染器，无需修改核心代码。
 *
 * 内置渲染器：
 *   'reasoning'       - 历史推理过程回放（DeepSeek R1 / o1 等思考内容）
 *   'tool-call-group' - 历史工具调用组回放（StoredToolCall[]）
 *
 * 渲染器函数签名：
 *   fn(data: unknown, messageDiv: HTMLElement, options?: object): void
 *
 * 注意：本模块必须在 ai-ui.js 之后加载，因为内置渲染器依赖
 *   window.AIChatUI.parseMarkdown / processCodeBlocks / attachReasoningToggleEvent
 */

window.AIChatRenderers = {
    /** @type {Map<string, function>} */
    _map: new Map(),

    /**
     * 注册渲染器
     * @param {string} type
     * @param {function(data: unknown, messageDiv: HTMLElement, options?: object): void} fn
     * @returns {this}
     */
    register(type, fn) {
        this._map.set(type, fn);
        return this;
    },

    /**
     * 执行渲染，异常不向上抛出以防止单个渲染器失败影响整体
     * @param {string} type
     * @param {unknown} data
     * @param {HTMLElement} messageDiv
     * @param {object} [options]
     */
    render(type, data, messageDiv, options = {}) {
        const fn = this._map.get(type);
        if (!fn) {
            console.warn(`[AIChatRenderers] 未找到渲染器: ${type}`);
            return;
        }
        try {
            fn(data, messageDiv, options);
        } catch (e) {
            console.error(`[AIChatRenderers:${type}] 渲染失败:`, e);
        }
    },

    /** @param {string} type @returns {boolean} */
    has(type) {
        return this._map.has(type);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 内置渲染器
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 推理过程渲染器（历史回放）
 * 直接以折叠状态插入，避免重新展开动画对性能的影响
 *
 * @param {string} reasoningText     推理原文
 * @param {HTMLElement} messageDiv
 * @param {{ thinkingTime?: number }} options  thinkingTime: 思考耗时（秒）
 */
AIChatRenderers.register('reasoning', (reasoningText, messageDiv, { thinkingTime } = {}) => {
    const UI = window.AIChatUI;
    const chatBubble = messageDiv.querySelector('.chat-bubble');
    if (!chatBubble) return;

    const reasoningContainer = document.createElement('div');
    reasoningContainer.className = 'reasoning-container collapsed';

    const timeDisplay = thinkingTime !== undefined ? `${thinkingTime}秒` : '';

    const reasoningHeader = document.createElement('div');
    reasoningHeader.className = 'reasoning-header';
    reasoningHeader.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="toggle-icon">
            <path d="M7 10l5 5 5-5z"/>
        </svg>
        <span class="title-text">查看AI思考过程</span>
        <div class="thinking-time" style="display:inline-flex">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
            </svg>
            <span>${timeDisplay}</span>
        </div>
    `;

    const reasoningContentDiv = document.createElement('div');
    reasoningContentDiv.className = 'reasoning-content markdown-content';
    // 折叠状态的初始高度
    reasoningContentDiv.style.maxHeight = '0px';
    reasoningContentDiv.style.paddingTop = '0px';
    reasoningContentDiv.style.paddingBottom = '0px';
    reasoningContentDiv.innerHTML = UI.parseMarkdown(reasoningText);
    UI.processCodeBlocks(reasoningContentDiv);

    reasoningContainer.appendChild(reasoningHeader);
    reasoningContainer.appendChild(reasoningContentDiv);

    // 插入到 chat-bubble 最前面（在 markdown-content 和 tool-call 之前）
    chatBubble.insertBefore(reasoningContainer, chatBubble.firstChild);

    // 绑定折叠/展开事件
    UI.attachReasoningToggleEvent(reasoningHeader, reasoningContainer);
});

/**
 * 工具调用组渲染器（历史回放）
 * 为每个 StoredToolCall 构建最终完成状态的 DOM，跳过"执行中"的中间状态
 *
 * @param {object[]} toolCalls  StoredToolCall[]
 * @param {HTMLElement} messageDiv
 */
AIChatRenderers.register('tool-call-group', (toolCalls, messageDiv) => {
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) return;
    for (const tc of toolCalls) {
        _renderHistoricalToolCall(tc, messageDiv);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 内部辅助函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 单个工具调用历史回放
 * 直接构建最终状态的 DOM（成功/失败），不经过"执行中"中间态
 * @param {object} tc  StoredToolCall
 * @param {HTMLElement} messageDiv
 */
function _renderHistoricalToolCall(tc, messageDiv) {
    const chatBubble = messageDiv.querySelector('.chat-bubble');
    if (!chatBubble) return;

    const toolCallEl = document.createElement('div');
    toolCallEl.className = 'tool-call collapsed';
    toolCallEl.dataset.toolName = tc.name;
    if (tc.id) toolCallEl.dataset.toolId = tc.id;

    // ── Header ──────────────────────────────────────────────────────────────
    const toolHeader = document.createElement('div');
    toolHeader.className = 'tool-call-header';

    const toolTitle = document.createElement('div');
    toolTitle.className = 'tool-call-title';
    toolTitle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
        调用工具: <strong>${tc.name}</strong>
        <div class="tool-call-toggle" title="折叠/展开结果">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
    `;

    const toolStatus = document.createElement('div');
    toolStatus.className = 'tool-call-status';

    let statusHtml = tc.isError
        ? `<div class="status-indicator error"></div><span class="status-error">调用失败</span>`
        : `<div class="status-indicator success"></div><span class="status-success">调用成功</span>`;

    if (tc.executionTime != null) {
        const t = tc.executionTime < 1000
            ? `${tc.executionTime}ms`
            : `${(tc.executionTime / 1000).toFixed(2)}s`;
        statusHtml += `<span class="tool-execution-time">${t}</span>`;
    }

    if (tc.tokenUsage?.totalTokens) {
        statusHtml += `<span class="tool-token-usage" title="输入:${tc.tokenUsage.promptTokens ?? 0}|输出:${tc.tokenUsage.completionTokens ?? 0}">tokens:${tc.tokenUsage.totalTokens}</span>`;
    }

    toolStatus.innerHTML = statusHtml;
    toolHeader.appendChild(toolTitle);
    toolHeader.appendChild(toolStatus);
    toolCallEl.appendChild(toolHeader);

    // ── Content ──────────────────────────────────────────────────────────────
    const contentContainer = document.createElement('div');
    contentContainer.className = 'tool-call-content';

    // 参数区域
    const argsDiv = document.createElement('div');
    argsDiv.className = 'tool-call-args';
    const argsStr = typeof tc.args === 'string'
        ? tc.args
        : JSON.stringify(tc.args ?? {}, null, 2);
    argsDiv.textContent = argsStr;
    contentContainer.appendChild(argsDiv);

    // 子 Agent 进度步骤（如有）
    if (tc.progressSteps?.length > 0) {
        contentContainer.appendChild(_buildHistoricalProgress(tc.progressSteps));
    }

    // 结果区域
    const resultDiv = document.createElement('div');
    resultDiv.className = 'tool-call-result';
    if (tc.isError) resultDiv.classList.add('error');

    let resultStr = '';
    if (tc.result?._truncated) {
        resultStr = `[结果已截断，原始大小: ${tc.result.originalSize} 字节]\n${tc.result.preview}...`;
    } else if (tc.result !== null && tc.result !== undefined) {
        resultStr = typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2);
    }

    resultDiv.innerHTML = tc.isError
        ? `<strong class="error">错误:</strong><pre class="error-result">${resultStr}</pre>`
        : `<strong>结果:</strong><pre>${resultStr}</pre>`;

    contentContainer.appendChild(resultDiv);
    toolCallEl.appendChild(contentContainer);

    // 折叠/展开事件
    const toggleBtn = toolCallEl.querySelector('.tool-call-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', e => {
            e.stopPropagation();
            toolCallEl.classList.toggle('collapsed');
        });
    }

    // 插入位置：markdownDiv 之前（或 messageInfo 之前）
    const markdownDiv = chatBubble.querySelector(':scope > .markdown-content:not(.reasoning-content)');
    const messageInfo = chatBubble.querySelector(':scope > .message-info');
    if (markdownDiv) {
        chatBubble.insertBefore(toolCallEl, markdownDiv);
    } else if (messageInfo) {
        chatBubble.insertBefore(toolCallEl, messageInfo);
    } else {
        chatBubble.appendChild(toolCallEl);
    }
}

/**
 * 构建子 Agent 历史进度容器（所有步骤均为已完成状态）
 * @param {object[]} steps  ProgressStep[]
 * @returns {HTMLElement}
 */
function _buildHistoricalProgress(steps) {
    const _DURATION_SVG = `<svg class="tpc-duration-icon" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6.5" r="3.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 5v2l1 .8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 1.5h2.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;

    const progressContainer = document.createElement('div');
    progressContainer.className = 'tool-progress-container done collapsed';

    progressContainer.innerHTML = `
        <div class="tpc-header">
            <div class="tpc-icon-wrap done">
                <svg viewBox="0 0 20 20" fill="none" class="tpc-icon">
                    <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M7 10h6M10 7v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <div class="tpc-icon-ring"></div>
            </div>
            <div class="tpc-header-text">
                <span class="tpc-title">子 Agent 完成</span>
                <span class="tpc-subtitle">已返回结果</span>
            </div>
            <div class="tpc-step-badge"><span class="tpc-step-num">${steps.length}</span> 步</div>
            <button class="tpc-toggle" aria-label="展开/折叠">
                <svg viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
        <div class="tpc-body"><div class="tpc-timeline"></div></div>
    `;

    progressContainer.querySelector('.tpc-header').addEventListener('click', () => {
        progressContainer.classList.toggle('collapsed');
    });

    const timeline = progressContainer.querySelector('.tpc-timeline');

    for (const step of steps) {
        const stepEl = document.createElement('div');
        const elapsed = step.elapsed_ms ?? 0;
        const doneTimeText = elapsed >= 0
            ? (elapsed >= 1000 ? `${(elapsed / 1000).toFixed(1)}s` : `${elapsed}ms`)
            : '';
        const durationHtml = doneTimeText
            ? `<span class="tpc-step-duration">${_DURATION_SVG}${doneTimeText}</span>`
            : '';

        if (step.isDone) {
            stepEl.className = 'tpc-step complete';
            stepEl.innerHTML = `
                <div class="tpc-step-node">
                    <svg viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="tpc-step-line"></div>
                <div class="tpc-step-body">
                    <span class="tpc-step-label complete-label">${step.message || '已得到答案'}</span>
                    ${durationHtml}
                </div>
            `;
        } else {
            stepEl.className = 'tpc-step done';
            const toolChips = step.tools.length > 0
                ? step.tools.map(t => `<span class="tpc-tool-chip">${t}</span>`).join('')
                : `<span class="tpc-step-label">${step.message}</span>`;
            stepEl.innerHTML = `
                <div class="tpc-step-node"><span>${step.stepNumber}</span></div>
                <div class="tpc-step-line"></div>
                <div class="tpc-step-body">
                    <div class="tpc-step-tools">${toolChips}</div>
                    ${durationHtml}
                </div>
            `;
        }

        timeline.appendChild(stepEl);
    }

    return progressContainer;
}
