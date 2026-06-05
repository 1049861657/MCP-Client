/**
 * P3-01-04：计划浮层（SSE planning_update 驱动，锚定 #chat-messages 右上外侧）
 */

/**
 * @typedef {'pending' | 'in_progress' | 'completed'} TodoStatus
 */

/**
 * @typedef {{ id: string, content: string, status: TodoStatus, activeForm?: string }} TodoItem
 */

const PLAN_GAP = 12;
const PLAN_RING_LEN = 88;
const POPOVER_BOTTOM_PAD = 24;

/**
 * @param {() => object | null} getApp
 */
export function mountPlanningPanel(getApp) {
  if (!document.querySelector('.chat-shell')) {
    return { updatePlanningItems: () => {}, clearPlanning: () => {} };
  }

  const dock = document.createElement('div');
  dock.id = 'plan-dock';
  dock.className = 'plan-dock plan-dock--hidden';
  dock.setAttribute('role', 'region');
  dock.setAttribute('aria-label', '任务计划');
  dock.innerHTML = `
    <button type="button" class="plan-fab" id="plan-fab" aria-expanded="false" aria-controls="plan-popover" title="展开任务计划" aria-label="任务计划">
      <span class="plan-fab__visual" aria-hidden="true">
        <svg class="plan-fab__ring" viewBox="0 0 36 36">
          <circle class="plan-fab__ring-track" cx="18" cy="18" r="14" />
          <circle class="plan-fab__ring-progress" id="plan-fab-ring" cx="18" cy="18" r="14" />
        </svg>
        <svg class="plan-fab__glyph" viewBox="0 0 24 24" fill="none">
          <rect x="4.5" y="3.5" width="15" height="17" rx="2.25" stroke="currentColor" stroke-width="1.5" />
          <path d="M8.25 8.25h7.5M8.25 12h7.5M8.25 15.75h4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <path d="M6.6 8.4l1.05 1.05 1.9-1.9M6.6 12l1.05 1.05 1.9-1.9" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <span class="plan-fab__badge" id="plan-fab-badge" hidden>0</span>
    </button>
    <div id="plan-popover" class="plan-popover" aria-hidden="true">
      <div class="plan-popover__card">
        <header class="plan-dock__head">
          <div class="plan-dock__title-block">
            <h2 class="plan-dock__title">任务计划</h2>
          </div>
          <div class="plan-dock__actions">
            <button type="button" class="plan-dock__action" id="plan-btn-collapse" title="收起到入口" aria-label="收起">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </header>
        <div class="plan-dock__progress-wrap">
          <div class="plan-dock__progress-meta">
            <span id="plan-progress-label">0 / 0 已完成</span>
            <span id="plan-progress-pct">0%</span>
          </div>
          <div class="plan-dock__progress-bar">
            <div class="plan-dock__progress-fill" id="plan-progress-fill" style="width:0%"></div>
          </div>
        </div>
        <ul class="plan-dock__list" id="plan-list"></ul>
        <footer class="plan-dock__foot">
          <span class="plan-dock__foot-dot" aria-hidden="true"></span>
          <span id="plan-foot-text">等待 planning_update…</span>
        </footer>
      </div>
    </div>
  `;
  document.body.appendChild(dock);

  const fabEl = dock.querySelector('#plan-fab');
  const popoverEl = dock.querySelector('#plan-popover');
  const listEl = dock.querySelector('#plan-list');
  const fillEl = dock.querySelector('#plan-progress-fill');
  const labelEl = dock.querySelector('#plan-progress-label');
  const pctEl = dock.querySelector('#plan-progress-pct');
  const footEl = dock.querySelector('#plan-foot-text');
  const fabBadgeEl = dock.querySelector('#plan-fab-badge');
  const collapseBtn = dock.querySelector('#plan-btn-collapse');

  let expanded = false;
  let updateCount = 0;
  /** @type {ResizeObserver | null} */
  let resizeObserver = null;

  function getChatMessagesEl() {
    const app = getApp();
    return app?.elements?.chatMessages ?? document.getElementById('chat-messages');
  }

  function getPopoverMaxAvailable() {
    if (!(fabEl instanceof HTMLElement)) {
      return 200;
    }
    const fabRect = fabEl.getBoundingClientRect();
    const popoverTop = fabRect.bottom + 10;
    return Math.max(120, window.innerHeight - popoverTop - POPOVER_BOTTOM_PAD);
  }

  function fitPopoverHeight() {
    if (!(popoverEl instanceof HTMLElement)) {
      return;
    }
    if (!expanded || dock.classList.contains('plan-dock--hidden')) {
      popoverEl.style.height = '';
      return;
    }
    popoverEl.style.height = 'auto';
    const natural = popoverEl.scrollHeight;
    const maxAvail = getPopoverMaxAvailable();
    popoverEl.style.height = `${Math.min(natural, maxAvail)}px`;
  }

  function syncPlanAnchor() {
    const box = getChatMessagesEl();
    if (!(box instanceof HTMLElement)) {
      return;
    }
    const rect = box.getBoundingClientRect();
    dock.style.top = `${Math.round(rect.top)}px`;
    dock.style.left = `${Math.round(rect.right + PLAN_GAP)}px`;
    fitPopoverHeight();
  }

  function setExpanded(open) {
    expanded = open;
    dock.classList.toggle('plan-dock--open', open);
    fabEl?.setAttribute('aria-expanded', open ? 'true' : 'false');
    popoverEl?.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      requestAnimationFrame(fitPopoverHeight);
    } else if (popoverEl instanceof HTMLElement) {
      popoverEl.style.height = '';
    }
  }

  function bindAnchorListeners() {
    const box = getChatMessagesEl();
    if (!(box instanceof HTMLElement)) {
      return;
    }
    box.addEventListener('scroll', syncPlanAnchor, { passive: true });
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => syncPlanAnchor());
      resizeObserver.observe(box);
    }
  }

  function showDock(show) {
    dock.classList.toggle('plan-dock--hidden', !show);
    if (!show) {
      setExpanded(false);
      if (popoverEl instanceof HTMLElement) {
        popoverEl.style.height = '';
      }
    } else {
      syncPlanAnchor();
    }
  }

  /**
   * @param {TodoItem[]} items
   */
  /**
   * @param {TodoItem[]} items
   * @param {string} [footText]
   */
  function renderPlanList(items, footText) {
    const list = Array.isArray(items) ? items : [];
    if (!(listEl instanceof HTMLElement)) {
      return;
    }

    const done = list.filter((item) => item.status === 'completed').length;
    const total = list.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const open = list.filter((item) => item.status !== 'completed').length;

    if (labelEl instanceof HTMLElement) {
      labelEl.textContent = `${done} / ${total} 已完成`;
    }
    if (pctEl instanceof HTMLElement) {
      pctEl.textContent = `${pct}%`;
    }
    if (fillEl instanceof HTMLElement) {
      fillEl.style.width = `${pct}%`;
    }
    if (fabEl instanceof HTMLElement) {
      fabEl.style.setProperty('--plan-pct', String(pct));
      fabEl.style.setProperty('--plan-ring-len', String(PLAN_RING_LEN));
    }
    if (fabBadgeEl instanceof HTMLElement) {
      fabBadgeEl.textContent = String(open);
      fabBadgeEl.hidden = open === 0;
    }
    if (footEl instanceof HTMLElement) {
      footEl.textContent = footText
        ?? (total > 0 ? `planning_update #${updateCount}` : '等待 planning_update…');
    }

    listEl.innerHTML = list
      .map((item) => {
        const statusChar =
          item.status === 'completed' ? '✓' : item.status === 'in_progress' ? '●' : '';
        const activeLine =
          item.status === 'in_progress' && item.activeForm
            ? `<span class="plan-dock__item-active">${escapeHtml(item.activeForm)}</span>`
            : '';
        return `<li class="plan-dock__item plan-dock__item--${item.status}">
          <span class="plan-dock__status" aria-hidden="true">${statusChar}</span>
          <span class="plan-dock__item-text">
            ${escapeHtml(item.content)}
            ${activeLine}
          </span>
        </li>`;
      })
      .join('');

    requestAnimationFrame(fitPopoverHeight);
  }

  /**
   * 有待办或进行中项时显示入口（全部 completed 或空表则隐藏）
   * @param {TodoItem[]} items
   */
  function hasActivePlanItems(items) {
    return items.some(
      (item) => item.status === 'pending' || item.status === 'in_progress',
    );
  }

  /**
   * @param {TodoItem[]} items
   */
  function updatePlanningItems(items) {
    const list = Array.isArray(items) ? items : [];
    if (list.length === 0 || !hasActivePlanItems(list)) {
      showDock(false);
      renderPlanList(list);
      return;
    }
    updateCount += 1;
    showDock(true);
    renderPlanList(list);
  }

  function clearPlanning() {
    updateCount = 0;
    showDock(false);
    renderPlanList([]);
  }

  /**
   * 聊天内 todo 卡点击回溯：复用右侧 plan-dock 展示快照并展开
   * @param {TodoItem[]} items
   */
  function openPlanningSnapshot(items) {
    const list = Array.isArray(items) ? items : [];
    if (list.length === 0) {
      return;
    }
    showDock(true);
    renderPlanList(list, '来自对话回溯');
    setExpanded(true);
    syncPlanAnchor();
  }

  fabEl?.addEventListener('click', () => setExpanded(!expanded));
  collapseBtn?.addEventListener('click', () => setExpanded(false));
  window.addEventListener('resize', () => {
    syncPlanAnchor();
    fitPopoverHeight();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && expanded) {
      setExpanded(false);
    }
  });
  document.addEventListener('click', (e) => {
    if (!expanded || dock.classList.contains('plan-dock--hidden')) {
      return;
    }
    if (e.target instanceof Node && !dock.contains(e.target)) {
      setExpanded(false);
    }
  });

  bindAnchorListeners();
  requestAnimationFrame(syncPlanAnchor);

  return { updatePlanningItems, clearPlanning, openPlanningSnapshot };
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
