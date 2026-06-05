/**
 * P3-01：聊天内 todo 工具卡 — 单行视觉进度 + 点击打开右侧计划面板
 */

/** @typedef {'pending' | 'in_progress' | 'completed'} TodoStatus */
/** @typedef {{ id: string, content: string, status: TodoStatus, activeForm?: string }} TodoItem */
/** @typedef {'idle' | 'active' | 'done' | 'cleared'} TodoCardTone */

/** @type {((items: TodoItem[]) => void) | null} */
let planningPanelOpener = null;

/**
 * @param {(items: TodoItem[]) => void} opener
 */
export function registerPlanningPanelOpener(opener) {
  planningPanelOpener = opener;
}

/**
 * @param {unknown} raw
 * @returns {TodoItem[]}
 */
export function normalizePlanningItems(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.content === 'string' &&
      (item.status === 'pending' || item.status === 'in_progress' || item.status === 'completed'),
  );
}

/**
 * @param {string} summary
 * @param {TodoItem[]} [items]
 * @returns {{ tone: TodoCardTone, total: number, done: number, segments: TodoItem[] }}
 */
export function resolveTodoCardMetrics(summary, items = []) {
  const list = normalizePlanningItems(items);
  if (list.length > 0) {
    const done = list.filter((i) => i.status === 'completed').length;
    const tone = done === list.length
      ? 'done'
      : list.some((i) => i.status === 'in_progress' || i.status === 'pending')
        ? 'active'
        : 'cleared';
    return { tone, total: list.length, done, segments: list };
  }

  const text = (summary || '').trim();
  if (!text || text === '执行中…') {
    return { tone: 'idle', total: 0, done: 0, segments: [] };
  }
  if (text === 'Todo 已清空') {
    return { tone: 'cleared', total: 0, done: 0, segments: [] };
  }

  const allDone = text.match(/^(\d+)\/(\d+)\s*已完成$/);
  if (allDone) {
    const total = Number.parseInt(allDone[2], 10);
    return {
      tone: 'done',
      total,
      done: total,
      segments: Array.from({ length: total }, (_, i) => ({
        id: String(i + 1),
        content: '',
        status: 'completed',
      })),
    };
  }

  const updated = text.match(/^已更新\s+(\d+)\s+项$/);
  if (updated) {
    const total = Number.parseInt(updated[1], 10);
    return {
      tone: 'active',
      total,
      done: 0,
      segments: Array.from({ length: total }, (_, i) => ({
        id: String(i + 1),
        content: '',
        status: 'pending',
      })),
    };
  }

  const inProg = text.match(/进行中\s+(\d+)/);
  const pending = text.match(/待办\s+(\d+)/);
  if (inProg || pending) {
    const nActive = inProg ? Number.parseInt(inProg[1], 10) : 0;
    const nPending = pending ? Number.parseInt(pending[1], 10) : 0;
    const total = nActive + nPending;
    const segments = [];
    for (let i = 0; i < nActive; i += 1) {
      segments.push({ id: `a${i}`, content: '', status: 'in_progress' });
    }
    for (let i = 0; i < nPending; i += 1) {
      segments.push({ id: `p${i}`, content: '', status: 'pending' });
    }
    return { tone: 'active', total, done: 0, segments };
  }

  return { tone: 'active', total: 0, done: 0, segments: [] };
}

/**
 * @param {TodoCardTone} tone
 */
function statusPillHtml(tone) {
  const map = {
    idle: { cls: 'idle', label: '同步中' },
    active: { cls: 'active', label: '跟踪中' },
    done: { cls: 'done', label: '已完成' },
    cleared: { cls: 'cleared', label: '已清空' },
  };
  const { cls, label } = map[tone];
  return `<span class="todo-card__pill todo-card__pill--${cls}">${label}</span>`;
}

/**
 * @param {TodoItem[]} segments
 * @param {TodoCardTone} tone
 */
function segmentsHtml(segments, tone) {
  if (tone === 'idle') {
    return '<span class="todo-card__seg todo-card__seg--idle" aria-hidden="true"></span>'
      + '<span class="todo-card__seg todo-card__seg--idle" aria-hidden="true"></span>'
      + '<span class="todo-card__seg todo-card__seg--idle" aria-hidden="true"></span>';
  }
  if (segments.length === 0) {
    return '<span class="todo-card__seg todo-card__seg--empty" aria-hidden="true"></span>';
  }
  const maxShow = 8;
  const visible = segments.slice(0, maxShow);
  const overflow = segments.length - maxShow;
  let html = visible
    .map(
      (item) =>
        `<span class="todo-card__seg todo-card__seg--${item.status}" `
        + `title="${escapeAttr(item.content || item.status)}"></span>`,
    )
    .join('');
  if (overflow > 0) {
    html += `<span class="todo-card__seg todo-card__seg--more" title="+${overflow}">+${overflow}</span>`;
  }
  return html;
}

/**
 * @param {string} summary
 * @param {TodoItem[]} [items]
 * @returns {string}
 */
export function buildTodoCardHtml(summary, items = []) {
  const metrics = resolveTodoCardMetrics(summary, items);

  return `
    <div class="tool-call-header todo-card-header">
      <div class="tool-call-title">
        <span class="tool-source-icon-wrap tool-source-icon-wrap--system" title="System · 本地系统工具">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"></path>
          </svg>
        </span>
        <span class="tool-source-badge tool-source-badge--system" title="System · 本地系统工具">System</span>
        <span class="tool-call-name-row">
          <code class="tool-call-name">todo</code>
        </span>
      </div>
      <div class="tool-call-status todo-card-status">
        <div class="todo-card__viz" aria-hidden="true">
          <div class="todo-card__segments">${segmentsHtml(metrics.segments, metrics.tone)}</div>
        </div>
        ${statusPillHtml(metrics.tone)}
        <span class="todo-card__panel-hint" aria-hidden="true" title="在右侧面板查看">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>
    </div>
  `;
}

/**
 * @param {HTMLElement} cardEl
 * @returns {TodoItem[]}
 */
export function readPlanningItemsFromCard(cardEl) {
  const raw = cardEl.dataset.planningItems;
  if (!raw) {
    return [];
  }
  try {
    return normalizePlanningItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * @param {HTMLElement} cardEl
 * @param {TodoItem[]} items
 */
export function writePlanningItemsToCard(cardEl, items) {
  const list = normalizePlanningItems(items);
  if (list.length > 0) {
    cardEl.dataset.planningItems = JSON.stringify(list);
  }
}

/**
 * @param {HTMLElement} cardEl
 * @param {string} summary
 * @param {TodoItem[]} [items]
 */
export function renderTodoCard(cardEl, summary, items = []) {
  const list = normalizePlanningItems(items);
  const metrics = resolveTodoCardMetrics(summary, list);
  cardEl.innerHTML = buildTodoCardHtml(summary, list);
  if (list.length > 0) {
    writePlanningItemsToCard(cardEl, list);
  }
  cardEl.dataset.todoSummary = summary;
  const ariaLabel = metrics.total > 0
    ? `todo ${metrics.done} / ${metrics.total} 已完成，点击在右侧面板查看`
    : 'todo，点击在右侧面板查看';
  cardEl.setAttribute('aria-label', ariaLabel);
  bindTodoCardInteraction(cardEl);
}

/**
 * @param {HTMLElement} cardEl
 */
export function bindTodoCardInteraction(cardEl) {
  if (cardEl.dataset.todoBound === '1') {
    return;
  }
  cardEl.dataset.todoBound = '1';
  cardEl.classList.add('tool-call--todo-clickable');
  cardEl.setAttribute('role', 'button');
  cardEl.setAttribute('tabindex', '0');

  const open = () => {
    if (!planningPanelOpener) {
      return;
    }
    const items = readPlanningItemsFromCard(cardEl);
    const summary = cardEl.dataset.todoSummary ?? '';
    const fallback = resolveTodoCardMetrics(summary, items).segments;
    const list = items.length > 0 ? items : fallback;
    if (list.length === 0) {
      return;
    }
    planningPanelOpener(list);
  };

  cardEl.addEventListener('click', (e) => {
    e.stopPropagation();
    open();
  });
  cardEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      open();
    }
  });
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
 * @param {string} text
 */
function escapeAttr(text) {
  return escapeHtml(text).replace(/"/g, '&quot;');
}
