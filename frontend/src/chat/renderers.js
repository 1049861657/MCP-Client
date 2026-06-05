import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import typescript from 'highlight.js/lib/languages/typescript';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';

import { CHAT_TOOLBAR_ICONS } from './icons.js';
import { renderTodoCard } from './todo-card-view.js';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);

marked.use({
  gfm: true,
  breaks: true,
});

const SYSTEM_TOOL_NAMES = new Set(['read_persisted_output', 'todo']);

/**
 * @param {object} ui 需含 parseMarkdown / processCodeBlocks / attachReasoningToggleEvent
 */
export function createRenderers(ui) {
  /** @type {Map<string, Function>} */
  const map = new Map();

  function register(type, fn) {
    map.set(type, fn);
  }

  function render(type, data, messageDiv, options = {}) {
    const fn = map.get(type);
    if (!fn) {
      console.warn(`[renderers] 未找到渲染器: ${type}`);
      return;
    }
    try {
      fn(data, messageDiv, options);
    } catch (e) {
      console.error(`[renderers:${type}] 渲染失败:`, e);
    }
  }

  function has(type) {
    return map.has(type);
  }

  function resolveToolSource(toolOrSource) {
    if (typeof toolOrSource === 'string') {
      if (toolOrSource === 'system' || toolOrSource === 'mcp') {
        return toolOrSource;
      }
      return SYSTEM_TOOL_NAMES.has(toolOrSource) ? 'system' : 'mcp';
    }
    if (toolOrSource?.source === 'system' || toolOrSource?.source === 'mcp') {
      return toolOrSource.source;
    }
    if (toolOrSource?.name && SYSTEM_TOOL_NAMES.has(toolOrSource.name)) {
      return 'system';
    }
    return 'mcp';
  }

  function getToolSourceClass(source) {
    return source === 'system' ? 'tool-call--system' : 'tool-call--mcp';
  }

  function getToolSourceLabel(source) {
    return source === 'system' ? 'System' : 'MCP';
  }

  function getToolSourceTitle(source) {
    return source === 'system'
      ? 'System · 本地系统工具'
      : 'MCP · 远程协议工具';
  }

  function decorateToolCallElement(el, source) {
    el.classList.add(getToolSourceClass(source));
    el.dataset.toolSource = source;
  }

  function buildToolSourceBadgeHtml(source) {
    const label = getToolSourceLabel(source);
    const title = getToolSourceTitle(source);
    return `<span class="tool-source-badge tool-source-badge--${source}" title="${title}">${label}</span>`;
  }

  function getToolSourceIconSvg(source) {
    if (source === 'system') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"></path>
      </svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 22v-5"></path><path d="M9 8V2"></path><path d="M15 8V2"></path>
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"></path>
    </svg>`;
  }

  function buildToolCallTitleHtml(name, source) {
    return `
      <span class="tool-source-icon-wrap tool-source-icon-wrap--${source}" title="${getToolSourceTitle(source)}">
        ${getToolSourceIconSvg(source)}
      </span>
      ${buildToolSourceBadgeHtml(source)}
      <span class="tool-call-name-row">
        <code class="tool-call-name">${name}</code>
        <div class="tool-call-toggle" title="展开 / 折叠详情" aria-label="展开或折叠工具详情">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </span>
    `;
  }

  function attachToolCallHeaderToggle(toolCallEl) {
    const header = toolCallEl.querySelector('.tool-call-header');
    const toggle = (e) => {
      if (e.target.closest('.tool-call-status')) {
        return;
      }
      toolCallEl.classList.toggle('collapsed');
    };
    header?.addEventListener('click', toggle);
    toolCallEl.querySelector('.tool-call-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toolCallEl.classList.toggle('collapsed');
    });
  }

  register('reasoning', (reasoningText, messageDiv) => {
    const chatBubble = messageDiv.querySelector('.chat-bubble');
    if (!chatBubble) {
      return;
    }

    const reasoningContainer = document.createElement('div');
    reasoningContainer.className = 'reasoning-container collapsed';

    const reasoningHeader = document.createElement('div');
    reasoningHeader.className = 'reasoning-header';
    reasoningHeader.innerHTML = `
      ${CHAT_TOOLBAR_ICONS.reasoningToggle}
      <span class="title-text">查看AI思考过程</span>
    `;

    const reasoningContentDiv = document.createElement('div');
    reasoningContentDiv.className = 'reasoning-content markdown-content';
    reasoningContentDiv.style.maxHeight = '0px';
    reasoningContentDiv.innerHTML = ui.parseMarkdown(reasoningText);
    ui.processCodeBlocks(reasoningContentDiv);

    reasoningContainer.appendChild(reasoningHeader);
    reasoningContainer.appendChild(reasoningContentDiv);
    const contentRoot = chatBubble.querySelector('.ai-bubble-inner') ?? chatBubble;
    contentRoot.insertBefore(reasoningContainer, contentRoot.firstChild);
    ui.attachReasoningToggleEvent?.(reasoningHeader, reasoningContainer);
  });

  register('tool-call-group', (toolCalls, messageDiv) => {
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      return;
    }
    for (const tc of mergeHistoricalTodoCalls(toolCalls)) {
      renderHistoricalToolCall(tc, messageDiv, api);
    }
  });

  const api = {
    register,
    render,
    has,
    resolveToolSource,
    getToolSourceClass,
    getToolSourceLabel,
    getToolSourceTitle,
    decorateToolCallElement,
    buildToolSourceBadgeHtml,
    buildToolCallTitleHtml,
    attachToolCallHeaderToggle,
  };

  return api;
}

/**
 * @param {object} tc
 * @param {HTMLElement} messageDiv
 * @param {ReturnType<createRenderers>} R
 */
function renderHistoricalToolCall(tc, messageDiv, R) {
  const chatBubble = messageDiv.querySelector('.chat-bubble');
  if (!chatBubble) {
    return;
  }

  if (tc.name === 'todo') {
    renderHistoricalTodoCall(tc, messageDiv, R);
    return;
  }

  const source = R.resolveToolSource(tc);
  const toolCallEl = document.createElement('div');
  toolCallEl.className = 'tool-call collapsed';
  R.decorateToolCallElement(toolCallEl, source);
  toolCallEl.dataset.toolName = tc.name;
  if (tc.id) {
    toolCallEl.dataset.toolId = tc.id;
  }

  const toolHeader = document.createElement('div');
  toolHeader.className = 'tool-call-header';

  const toolTitle = document.createElement('div');
  toolTitle.className = 'tool-call-title';
  toolTitle.innerHTML = R.buildToolCallTitleHtml(tc.name, source);

  const toolStatus = document.createElement('div');
  toolStatus.className = 'tool-call-status';
  let statusHtml = tc.isError
    ? '<span class="status-error">调用失败</span>'
    : '<span class="status-success">调用成功</span>';
  if (tc.executionTime != null) {
    const t = tc.executionTime < 1000
      ? `${tc.executionTime}ms`
      : `${(tc.executionTime / 1000).toFixed(2)}s`;
    statusHtml += `<span class="tool-execution-time">${t}</span>`;
  }
  toolStatus.innerHTML = statusHtml;

  toolHeader.appendChild(toolTitle);
  toolHeader.appendChild(toolStatus);
  toolCallEl.appendChild(toolHeader);

  const contentContainer = document.createElement('div');
  contentContainer.className = 'tool-call-content';

  const argsDiv = document.createElement('div');
  argsDiv.className = 'tool-call-args';
  argsDiv.textContent = typeof tc.args === 'string'
    ? tc.args
    : JSON.stringify(tc.args ?? {}, null, 2);
  contentContainer.appendChild(argsDiv);

  const resultDiv = document.createElement('div');
  resultDiv.className = 'tool-call-result';
  if (tc.isError) {
    resultDiv.classList.add('error');
  }
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
  R.attachToolCallHeaderToggle(toolCallEl);

  const contentRoot = chatBubble.querySelector('.ai-bubble-inner') ?? chatBubble;
  const markdownDiv = contentRoot.querySelector(':scope > .markdown-content:not(.reasoning-content)');
  if (markdownDiv) {
    contentRoot.insertBefore(toolCallEl, markdownDiv);
  } else {
    contentRoot.appendChild(toolCallEl);
  }
}

/**
 * 历史回放：同轮多条 todo 合并为单卡
 * @param {object[]} toolCalls
 */
function mergeHistoricalTodoCalls(toolCalls) {
  const todos = toolCalls.filter((tc) => tc.name === 'todo');
  if (todos.length <= 1) {
    return toolCalls;
  }
  const last = todos[todos.length - 1];
  const mergedTodo = {
    ...last,
    revision: last.revision ?? todos.length,
  };
  const out = [];
  let todoMerged = false;
  for (const tc of toolCalls) {
    if (tc.name === 'todo') {
      if (!todoMerged) {
        out.push(mergedTodo);
        todoMerged = true;
      }
      continue;
    }
    out.push(tc);
  }
  return out;
}

/**
 * @param {object} tc
 * @param {HTMLElement} messageDiv
 * @param {ReturnType<createRenderers>} R
 */
function renderHistoricalTodoCall(tc, messageDiv, R) {
  const chatBubble = messageDiv.querySelector('.chat-bubble');
  if (!chatBubble) {
    return;
  }

  const contentRoot = chatBubble.querySelector('.ai-bubble-inner') ?? chatBubble;
  let summary = '';
  if (tc.result?._truncated) {
    summary = tc.result.preview ?? '';
  } else if (tc.result !== null && tc.result !== undefined) {
    summary = typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result);
  }

  const toolCallEl = document.createElement('div');
  toolCallEl.className = 'tool-call collapsed tool-call--system tool-call--todo-slot';
  toolCallEl.dataset.todoSlot = 'single';
  toolCallEl.dataset.todoRevision = String(tc.revision ?? 1);
  toolCallEl.dataset.toolName = 'todo';
  if (tc.id) {
    toolCallEl.dataset.toolId = tc.id;
  }
  R.decorateToolCallElement(toolCallEl, 'system');
  renderTodoCard(toolCallEl, summary, tc.planningItems ?? []);

  const markdownDiv = contentRoot.querySelector(':scope > .markdown-content:not(.reasoning-content)');
  if (markdownDiv) {
    contentRoot.insertBefore(toolCallEl, markdownDiv);
  } else {
    contentRoot.appendChild(toolCallEl);
  }
}

export { marked, hljs };
