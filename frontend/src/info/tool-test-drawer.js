/**
 * MCP 工具试运行右侧抽屉
 */

/** @typedef {{ name: string; codeName?: string; description: string; parameters?: ToolParameter[] }} ToolInfo */
/** @typedef {{ name: string; type: string; description: string; required: boolean }} ToolParameter */

/** @type {AbortController | null} */
let runAbort = null;

/** @type {HTMLElement | null} */
let overlayEl = null;

/** @type {string | null} */
let currentServerId = null;

/** @type {ToolInfo | null} */
let currentTool = null;

/**
 * @param {unknown} error
 * @param {string} fallback
 */
function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * @param {ToolInfo} tool
 */
function defaultFormValues(tool) {
  /** @type {Record<string, string>} */
  const values = {};
  for (const p of tool.parameters ?? []) {
    if (p.type === 'object') {
      values[p.name] = '{}';
    } else {
      values[p.name] = '';
    }
  }
  return values;
}

/**
 * @param {ToolInfo} tool
 * @param {Record<string, string>} values
 */
function buildArguments(tool, values) {
  /** @type {Record<string, unknown>} */
  const args = {};
  for (const p of tool.parameters ?? []) {
    const raw = (values[p.name] ?? '').trim();
    if (!raw && !p.required) {
      continue;
    }
    if (p.type === 'integer') {
      args[p.name] = raw === '' ? 0 : Number(raw);
      continue;
    }
    if (p.type === 'object') {
      args[p.name] = raw === '' ? {} : JSON.parse(raw);
      continue;
    }
    args[p.name] = raw;
  }
  return args;
}

/**
 * @param {ToolInfo} tool
 * @param {Record<string, string>} values
 */
function validateForm(tool, values) {
  for (const p of tool.parameters ?? []) {
    const raw = (values[p.name] ?? '').trim();
    if (p.required && !raw) {
      return `${p.name} 为必填项`;
    }
    if (p.type === 'object' && raw) {
      try {
        JSON.parse(raw);
      } catch {
        return `${p.name} 须为合法 JSON`;
      }
    }
  }
  return null;
}

function ensureOverlay() {
  if (overlayEl) {
    return overlayEl;
  }

  overlayEl = document.createElement('div');
  overlayEl.className = 'test-overlay';
  overlayEl.setAttribute('aria-hidden', 'true');
  overlayEl.innerHTML = `
    <div class="test-backdrop" data-test-close></div>
    <aside class="test-drawer" role="dialog" aria-labelledby="test-drawer-title">
      <div class="test-drawer-head">
        <div>
          <h2 id="test-drawer-title">试运行</h2>
          <p class="test-drawer-sub" id="test-drawer-sub"></p>
        </div>
        <button type="button" class="icon-btn" data-test-close aria-label="关闭">&times;</button>
      </div>
      <div class="test-drawer-body" id="test-drawer-body"></div>
    </aside>
  `;

  overlayEl.querySelectorAll('[data-test-close]').forEach((el) => {
    el.addEventListener('click', () => closeToolTestDrawer());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlayEl?.classList.contains('open')) {
      closeToolTestDrawer();
    }
  });

  document.body.appendChild(overlayEl);
  return overlayEl;
}

/**
 * @param {ToolInfo} tool
 * @param {Record<string, string>} values
 * @param {{ status: string; ms?: number; unified?: { preview?: string; structured?: unknown; status?: string } }} runState
 */
function renderPanel(tool, values, runState) {
  const fields = (tool.parameters ?? []).length
    ? (tool.parameters ?? [])
        .map((p) => {
          const val = values[p.name] ?? '';
          const req = p.required ? '<span class="req-mark">必填</span>' : '';
          const input =
            p.type === 'object'
              ? `<textarea data-field="${p.name}">${val}</textarea>`
              : p.type === 'integer'
                ? `<input type="number" data-field="${p.name}" value="${val}">`
                : `<input type="text" data-field="${p.name}" value="${val}">`;
          return `<div class="test-field">
            <label><span>${p.name}</span><span class="type-tag">${p.type}</span>${req}</label>
            ${input}
            <p class="field-hint">${p.description}</p>
          </div>`;
        })
        .join('')
    : '<p class="test-no-params">此工具无参数，可直接试运行。</p>';

  const running = runState.status === 'running';
  let resultHtml = '';
  if (runState.status === 'running') {
    resultHtml = `<div class="test-result">
      <div class="test-result-head"><span>返回结果</span><span class="test-status-run">执行中</span></div>
      <pre class="test-result-body">正在调用 MCP 工具…</pre>
    </div>`;
  } else if (runState.status === 'ok' || runState.status === 'err') {
    const ok = runState.status === 'ok';
    const u = runState.unified;
    const structuredHtml = u?.structured === undefined ? '' : (
      `<details class="test-structured"><summary>structuredContent</summary>`
      + `<pre class="test-result-body">${escapeHtml(JSON.stringify(u.structured, null, 2))}</pre></details>`
    );
    resultHtml = `<div class="test-result">
      <div class="test-result-head">
        <span>返回结果</span>
        <div class="test-result-meta">
          <span>${runState.ms ?? 0} ms</span>
          <span class="${ok ? 'test-status-ok' : 'test-status-err'}">${ok ? '成功' : '失败'}</span>
        </div>
      </div>
      <pre class="test-result-body${ok ? '' : ' err'}">${escapeHtml(u?.preview ?? '')}</pre>
      ${structuredHtml}
    </div>`;
  }

  return `<div class="tool-panel">
    <div class="test-section">
      <div class="test-section-title">调用参数</div>
      ${fields}
    </div>
    <div class="test-actions">
      <button type="button" class="btn btn-primary test-run-btn" ${running ? 'disabled' : ''}>${running ? '执行中…' : '试运行'}</button>
      <button type="button" class="btn test-reset-btn">重置</button>
      ${running ? '<button type="button" class="btn test-cancel-btn">取消</button>' : ''}
    </div>
    ${resultHtml}
  </div>`;
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

/**
 * @param {Record<string, string>} values
 * @param {{ status: string; ms?: number; unified?: { preview?: string; structured?: unknown } }} runState
 */
function paintPanel(values, runState) {
  const body = document.getElementById('test-drawer-body');
  if (!body || !currentTool) {
    return;
  }
  body.innerHTML = renderPanel(currentTool, values, runState);
  bindPanelEvents(values, runState);
}

/**
 * @param {Record<string, string>} values
 * @param {{ status: string; ms?: number; unified?: { preview?: string; structured?: unknown } }} runState
 */
function bindPanelEvents(values, runState) {
  const body = document.getElementById('test-drawer-body');
  if (!body || !currentTool || !currentServerId) {
    return;
  }

  body.querySelector('.test-run-btn')?.addEventListener('click', () => {
    void runTest(values);
  });
  body.querySelector('.test-reset-btn')?.addEventListener('click', () => {
    runAbort?.abort();
    runAbort = null;
    paintPanel(defaultFormValues(currentTool), { status: 'idle' });
  });
  body.querySelector('.test-cancel-btn')?.addEventListener('click', () => {
    runAbort?.abort();
    runAbort = null;
    paintPanel(values, { status: 'idle' });
  });

  body.querySelectorAll('[data-field]').forEach((el) => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      return;
    }
    el.addEventListener('input', () => {
      values[el.dataset.field ?? ''] = el.value;
    });
  });
}

/**
 * @param {Record<string, string>} values
 */
async function runTest(values) {
  if (!currentTool || !currentServerId) {
    return;
  }

  const body = document.getElementById('test-drawer-body');
  body?.querySelectorAll('[data-field]').forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      values[el.dataset.field ?? ''] = el.value;
    }
  });

  const validationError = validateForm(currentTool, values);
  if (validationError) {
    paintPanel(values, { status: 'err', ms: 0, unified: { preview: validationError } });
    return;
  }

  runAbort?.abort();
  runAbort = new AbortController();
  paintPanel(values, { status: 'running' });

  try {
    const response = await fetch(`/api/server/${encodeURIComponent(currentServerId)}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName: currentTool.name,
        arguments: buildArguments(currentTool, values)
      }),
      signal: runAbort.signal
    });

    /** @type {{ ok?: boolean; ms?: number; error?: string; unified?: { preview?: string; structured?: unknown } }} */
    const data = await response.json();
    const unified = data.unified ?? (data.error ? { preview: data.error } : undefined);
    paintPanel(values, {
      status: data.ok ? 'ok' : 'err',
      ms: data.ms ?? 0,
      unified
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      paintPanel(values, { status: 'idle' });
      return;
    }
    paintPanel(values, {
      status: 'err',
      ms: 0,
      unified: { preview: errorMessage(error, '试运行失败') }
    });
  } finally {
    runAbort = null;
  }
}

/**
 * @param {string} serverId
 * @param {ToolInfo} tool
 */
export function openToolTestDrawer(serverId, tool) {
  currentServerId = serverId;
  currentTool = tool;
  const overlay = ensureOverlay();
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');

  const sub = document.getElementById('test-drawer-sub');
  if (sub) {
    sub.textContent = `${tool.name}${tool.codeName ? ` · ${tool.codeName}` : ''}`;
  }

  paintPanel(defaultFormValues(tool), { status: 'idle' });
}

export function closeToolTestDrawer() {
  runAbort?.abort();
  runAbort = null;
  currentServerId = null;
  currentTool = null;
  overlayEl?.classList.remove('open');
  overlayEl?.setAttribute('aria-hidden', 'true');
  const body = document.getElementById('test-drawer-body');
  if (body) {
    body.innerHTML = '';
  }
}
