/**
 * 工具卡片与子 Agent 进度 UI（T3-04-11）
 *
 * @param {() => object} getApp
 * @param {{ scrollToBottom?: () => void, parseMarkdown?: Function, processCodeBlocks?: Function }} ui
 */
export function createToolCardsUi(getApp, ui) {
  const DURATION_SVG = `<svg class="tpc-duration-icon" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6.5" r="3.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 5v2l1 .8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;

  /**
   * @param {HTMLElement} messageDiv
   * @param {{ name: string, id?: string, args?: unknown, source?: string }} toolInfo
   */
  function addToolCall(messageDiv, toolInfo) {
    const app = getApp();
    const R = app.renderers;
    const chatBubble = messageDiv?.querySelector('.chat-bubble');
    if (!chatBubble || !R) {
      return null;
    }

    const source = R.resolveToolSource(toolInfo);
    const toolCall = document.createElement('div');
    toolCall.className = 'tool-call collapsed';
    R.decorateToolCallElement(toolCall, source);
    toolCall.dataset.toolName = toolInfo.name;
    if (toolInfo.id) {
      toolCall.dataset.toolId = toolInfo.id;
    }

    const argsStr = typeof toolInfo.args === 'string'
      ? toolInfo.args
      : JSON.stringify(toolInfo.args ?? {}, null, 2);

    toolCall.innerHTML = `
      <div class="tool-call-header">
        <div class="tool-call-title">${R.buildToolCallTitleHtml(toolInfo.name, source)}</div>
        <div class="tool-call-status">
          <div class="status-indicator status-running"></div>
          <span>执行中…</span>
        </div>
      </div>
      <div class="tool-call-content">
        <div class="tool-call-args">${escapeHtml(argsStr)}</div>
      </div>
    `;

    R.attachToolCallHeaderToggle(toolCall);

    const contentRoot = chatBubble.querySelector('.ai-bubble-inner') ?? chatBubble;
    const md = contentRoot.querySelector(':scope > .markdown-content:not(.reasoning-content)');
    if (md) {
      contentRoot.insertBefore(toolCall, md);
    } else {
      contentRoot.appendChild(toolCall);
    }

    ui.scrollToBottom?.();
    return toolCall;
  }

  /**
   * @param {HTMLElement} messageDiv
   */
  function updateToolCallResult(
    messageDiv,
    _toolName,
    result,
    isError = false,
    index = -1,
    toolId = null,
    executionTime = null,
  ) {
    const toolCallElements = messageDiv?.querySelectorAll('.tool-call');
    if (!toolCallElements?.length) {
      return;
    }

    let target;
    if (index >= 0 && toolCallElements[index]) {
      target = toolCallElements[index];
    } else if (toolId) {
      target = Array.from(toolCallElements).find((el) => el.dataset.toolId === toolId);
    } else {
      target = toolCallElements[toolCallElements.length - 1];
    }
    if (!target) {
      return;
    }

    let resultDiv = target.querySelector('.tool-call-result');
    if (!resultDiv) {
      resultDiv = document.createElement('div');
      resultDiv.className = 'tool-call-result';
      target.querySelector('.tool-call-content')?.appendChild(resultDiv);
    }

    let resultStr = '';
    if (result !== null && result !== undefined) {
      resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    }

    resultDiv.innerHTML = isError
      ? `<strong class="error">错误:</strong><pre class="error-result">${escapeHtml(resultStr)}</pre>`
      : `<strong>结果:</strong><pre>${escapeHtml(resultStr)}</pre>`;
    resultDiv.classList.toggle('error', isError);

    const statusDiv = target.querySelector('.tool-call-status');
    if (statusDiv) {
      let statusHtml = isError
        ? '<div class="status-indicator error"></div><span class="status-error">调用失败</span>'
        : '<div class="status-indicator success"></div><span class="status-success">调用成功</span>';

      if (executionTime != null) {
        const timeText = executionTime < 1000
          ? `${executionTime}ms`
          : `${(executionTime / 1000).toFixed(2)}s`;
        statusHtml += `<span class="tool-execution-time">${timeText}</span>`;
      }
      statusDiv.innerHTML = statusHtml;
    }

    ui.scrollToBottom?.();
  }

  /**
   * @param {HTMLElement} messageDiv
   */
  function updateToolCallProgress(messageDiv, index, progress, total, message, elapsed_ms) {
    const toolCallElements = messageDiv?.querySelectorAll('.tool-call');
    const targetToolCall = (index >= 0 && toolCallElements?.[index])
      ? toolCallElements[index]
      : toolCallElements?.[toolCallElements.length - 1];
    if (!targetToolCall) {
      return;
    }

    const contentContainer = targetToolCall.querySelector('.tool-call-content');
    if (!contentContainer) {
      return;
    }

    const isDone = total !== undefined && progress >= total;
    let progressContainer = targetToolCall.querySelector('.tool-progress-container');

    if (!progressContainer) {
      progressContainer = document.createElement('div');
      progressContainer.className = 'tool-progress-container collapsed';
      progressContainer.dataset.realSteps = '0';
      progressContainer.innerHTML = `
        <div class="tpc-header">
          <div class="tpc-icon-wrap"><span class="tpc-step-num-display">0</span></div>
          <div class="tpc-header-text">
            <span class="tpc-title">子 Agent 运行中</span>
            <span class="tpc-subtitle">正在执行…</span>
          </div>
          <button type="button" class="tpc-toggle" aria-label="展开">▼</button>
        </div>
        <div class="tpc-body"><div class="tpc-timeline"></div></div>
      `;
      progressContainer.querySelector('.tpc-header')?.addEventListener('click', () => {
        progressContainer.classList.toggle('collapsed');
      });
      const resultDiv = contentContainer.querySelector('.tool-call-result');
      if (resultDiv) {
        contentContainer.insertBefore(progressContainer, resultDiv);
      } else {
        contentContainer.appendChild(progressContainer);
      }
    }

    const realSteps = parseInt(progressContainer.dataset.realSteps || '0', 10) + 1;
    progressContainer.dataset.realSteps = String(realSteps);

    const timeline = progressContainer.querySelector('.tpc-timeline');
    const toolMatch = message?.match(/:\s*(.+)$/);
    const toolsRaw = toolMatch ? toolMatch[1] : (message ?? '');
    const isCompletionMsg = isDone || (message && (message.includes('完成') || message.includes('答案')));

    if (realSteps === 1) {
      const resultDiv = contentContainer.querySelector('.tool-call-result');
      if (resultDiv) {
        resultDiv.style.display = 'none';
      }
    }

    const titleEl = progressContainer.querySelector('.tpc-title');
    const subtitleEl = progressContainer.querySelector('.tpc-subtitle');
    const stepDisplay = progressContainer.querySelector('.tpc-step-num-display');

    if (isDone) {
      progressContainer.classList.add('done');
      if (titleEl) {
        titleEl.textContent = '子 Agent 完成';
      }
      if (subtitleEl) {
        subtitleEl.textContent = '已返回结果';
      }
    } else if (titleEl) {
      titleEl.textContent = '子 Agent 运行中';
      if (subtitleEl) {
        subtitleEl.textContent = `第 ${realSteps} 步执行中…`;
      }
    }
    if (stepDisplay) {
      stepDisplay.textContent = String(realSteps);
    }

    const stepEl = document.createElement('div');
    stepEl.className = `tpc-step ${isDone ? 'complete' : 'running'}`;
    if (elapsed_ms !== undefined && elapsed_ms >= 0) {
      stepEl.dataset.ownElapsed = String(elapsed_ms);
    }

    if (isDone) {
      const doneTimeText = elapsed_ms !== undefined && elapsed_ms >= 0
        ? (elapsed_ms >= 1000 ? `${(elapsed_ms / 1000).toFixed(1)}s` : `${elapsed_ms}ms`)
        : '';
      stepEl.innerHTML = `
        <div class="tpc-step-body">
          <span class="tpc-step-label">${escapeHtml(message || '已得到答案')}</span>
          ${doneTimeText ? `<span class="tpc-step-duration">${DURATION_SVG}${doneTimeText}</span>` : ''}
        </div>
      `;
    } else {
      const tools = toolsRaw
        ? toolsRaw.split(/[,，]\s*/).map((t) => t.trim()).filter(Boolean)
        : [];
      const toolChips = tools.map((t) => `<span class="tpc-tool-chip">${escapeHtml(t)}</span>`).join('');
      stepEl.innerHTML = `
        <div class="tpc-step-body">
          <div class="tpc-step-tools">${toolChips || `<span>${escapeHtml(toolsRaw)}</span>`}</div>
          <span class="tpc-step-duration tpc-step-duration--live">${DURATION_SVG}<span class="tpc-live-timer">0.0s</span></span>
        </div>
      `;
      const timerStart = Date.now();
      const timerTextEl = stepEl.querySelector('.tpc-live-timer');
      const timerId = setInterval(() => {
        if (timerTextEl) {
          const e = Date.now() - timerStart;
          timerTextEl.textContent = e >= 1000 ? `${(e / 1000).toFixed(1)}s` : `${e}ms`;
        }
      }, 100);
      stepEl.dataset.timerId = String(timerId);
    }

    timeline?.appendChild(stepEl);

    const statusDiv = targetToolCall.querySelector('.tool-call-status');
    if (statusDiv && !isDone) {
      statusDiv.innerHTML = `<div class="status-indicator status-running"></div><span>步骤 ${realSteps} · ${escapeHtml(toolsRaw || '处理中')}</span>`;
    }

    if (isDone) {
      const resultDiv = contentContainer.querySelector('.tool-call-result');
      if (resultDiv) {
        resultDiv.style.display = '';
      }
    }

    ui.scrollToBottom?.();
  }

  /**
   * @param {string} reason
   * @param {string} toolName
   */
  function describePermissionReason(reason, toolName) {
    const name = escapeHtml(toolName);
    if (reason === 'interactive_gray') {
      return `「${name}」可能访问外部服务或产生副作用，需你确认后再执行。`;
    }
    if (reason === 'interactive_unlisted') {
      return `「${name}」非只读工具，需你确认后再执行。`;
    }
    return `即将执行「${name}」，请确认是否继续。`;
  }

  /**
   * @param {string} raw
   */
  function formatPermissionArgsPreview(raw) {
    if (!raw || raw === '{}') {
      return '';
    }
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }

  /**
   * @param {HTMLElement | null | undefined} toolCallEl
   */
  function clearPermissionUi(toolCallEl) {
    if (!toolCallEl) {
      return;
    }
    toolCallEl.classList.remove('tool-call--permission-pending');
    const argsEl = toolCallEl.querySelector('.tool-call-args');
    if (argsEl) {
      argsEl.hidden = false;
    }
    toolCallEl.querySelector('.tool-permission-gate')?.remove();
  }

  /**
   * @param {HTMLElement} messageDiv
   * @param {{ tool_call_id: string, codeName: string, toolName: string, argsPreview: string, reason: string }} req
   * @param {{ onApprove: (alwaysAllow: boolean) => void, onDeny: () => void }} handlers
   */
  function showPermissionPrompt(messageDiv, req, handlers) {
    const toolCallElements = messageDiv?.querySelectorAll('.tool-call');
    let target = null;
    if (toolCallElements?.length) {
      target = Array.from(toolCallElements).find(
        (el) => el.dataset.toolId === req.tool_call_id,
      ) ?? toolCallElements[toolCallElements.length - 1];
    }
    if (!target) {
      return;
    }

    target.classList.remove('collapsed');
    target.classList.add('tool-call--permission-pending');

    const argsEl = target.querySelector('.tool-call-args');
    if (argsEl) {
      argsEl.hidden = true;
    }

    const statusDiv = target.querySelector('.tool-call-status');
    if (statusDiv) {
      statusDiv.innerHTML = `
        <span class="tool-permission-gate__status" aria-live="polite">
          <span class="tool-permission-gate__status-dot" aria-hidden="true"></span>
          待确认
        </span>
      `;
    }

    target.querySelector('.tool-permission-gate')?.remove();

    const content = target.querySelector('.tool-call-content');
    if (!content) {
      return;
    }

    const formattedArgs = formatPermissionArgsPreview(req.argsPreview);
    const argsBlock = formattedArgs
      ? `
        <details class="tool-permission-gate__params" open>
          <summary>调用参数</summary>
          <pre>${escapeHtml(formattedArgs)}</pre>
        </details>
      `
      : '';

    const gate = document.createElement('div');
    gate.className = 'tool-permission-gate';
    gate.setAttribute('role', 'group');
    gate.setAttribute('aria-label', `确认是否执行 ${req.toolName}`);
    gate.innerHTML = `
      <p class="tool-permission-gate__lead">是否允许执行此工具？</p>
      <p class="tool-permission-gate__explain">${describePermissionReason(req.reason, req.toolName)}</p>
      ${argsBlock}
      <label class="tool-permission-gate__remember">
        <input type="checkbox" class="tool-permission-gate__remember-cb" />
        <span class="tool-permission-gate__remember-text">
          <span class="tool-permission-gate__remember-title">记住此工具</span>
          <span class="tool-permission-gate__remember-desc">本聊天 24 小时内不再询问</span>
        </span>
      </label>
      <div class="tool-permission-gate__actions">
        <button type="button" class="tool-permission-gate__deny">拒绝</button>
        <button type="button" class="tool-permission-gate__approve">允许执行</button>
      </div>
    `;
    content.prepend(gate);

    const finish = (fn) => {
      clearPermissionUi(target);
      fn();
    };

    const rememberCb = gate.querySelector('.tool-permission-gate__remember-cb');
    gate.querySelector('.tool-permission-gate__approve')?.addEventListener('click', () => {
      const remember = rememberCb instanceof HTMLInputElement && rememberCb.checked;
      finish(() => handlers.onApprove(remember));
    });
    gate.querySelector('.tool-permission-gate__deny')?.addEventListener('click', () => {
      finish(() => handlers.onDeny());
    });

    gate.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    ui.scrollToBottom?.();
  }

  return {
    addToolCall,
    updateToolCallResult,
    updateToolCallProgress,
    showPermissionPrompt,
  };
}

/**
 * @param {string} text
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
