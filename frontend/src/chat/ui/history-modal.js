import { escapeHtml } from '../../shared/escape-html.js';
import { renderEmptyStateHtml } from '../../shared/ui/empty-state.js';
import { confirmModal } from '../../shared/ui/confirm-dialog.js';
import { enhanceCodeBlocks } from '../code-blocks.js';
import { marked } from '../renderers.js';
import { bindChatModalClose, closeChatModal, openChatModal } from './modal-host.js';

const SESSION_BUBBLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z"/></svg>';

/**
 * @param {() => object} getApp
 * @param {{ showTooltip: Function }} ui
 */
export function createHistoryModalApi(getApp, ui) {
  /** @type {string | null} */
  let selectedSessionId = null;
  let batchActionsBound = false;

  function showHistoryModal() {
    bindBatchActions();
    openChatModal('history-modal');
    bindChatModalClose('history-modal');
    loadSessionList();
  }

  function bindBatchActions() {
    if (batchActionsBound) {
      return;
    }
    batchActionsBound = true;

    document.getElementById('history-select-all')?.addEventListener('click', selectAllSessions);
    document.getElementById('history-deselect-all')?.addEventListener('click', deselectAllSessions);
    document.getElementById('history-batch-delete')?.addEventListener('click', deleteSelectedSessions);
  }

  function loadSessionList() {
    const app = getApp();
    const provider = app.elements.provider?.value ?? '';
    const container = document.getElementById('sessions-container');
    const titleEl = document.getElementById('session-list-title');
    if (!container) {
      return;
    }

    if (titleEl) {
      titleEl.textContent =
        provider && !app.sessionStore.isAuthed() ? `${provider} · 会话列表` : '会话列表';
    }

    resetDetailPanel();
    updateBatchDeleteButton();
    container.innerHTML = renderEmptyStateHtml({ message: '正在加载…', variant: 'inline' });

    app.sessionStore
      .listSessions(provider || null)
      .then((sessions) => {
        if (!sessions.length) {
          container.innerHTML = renderEmptyStateHtml({ message: '暂无聊天会话', variant: 'inline' });
          updateBatchDeleteButton();
          return;
        }
        renderSessionList(sessions);
        setupSessionSearch();
        selectFirstSession();
        updateBatchDeleteButton();
      })
      .catch((error) => {
        container.innerHTML = renderEmptyStateHtml({
          message: `加载失败: ${error.message}`,
          variant: 'error',
        });
        updateBatchDeleteButton();
      });
  }

  /**
   * @param {object[]} sessions
   */
  function renderSessionList(sessions) {
    const app = getApp();
    const isAuthed = app.sessionStore.isAuthed();
    const container = document.getElementById('sessions-container');
    if (!container) {
      return;
    }

    container.innerHTML = '';
    for (const session of sessions) {
      // guest 沿用 session_ 前缀校验；authed 服务端 cuid 不做前缀过滤
      if (!isAuthed && !session.id?.startsWith('session_')) {
        continue;
      }
      const displayId = session.displayId ?? session.id;
      if (!displayId || displayId === 'NaN') {
        continue;
      }

      const item = document.createElement('div');
      item.className = 'history-session-item';
      item.dataset.sessionId = session.id;
      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      const messageCount = session.messageCount ?? 0;
      const lastActive = formatSessionDate(session.lastActive);
      // authed 列表带服务端标题；guest 沿用「会话 {displayId}」展示
      const nameHtml = isAuthed
        ? escapeHtml(session.title || '无标题会话')
        : `会话 ${escapeHtml(displayId)}`;
      const badgeHtml = messageCount > 0 ? `${messageCount} 条` : '';

      item.innerHTML = `
        <label class="history-session-check-wrap" aria-label="选择会话 ${escapeHtml(displayId)}">
          <input type="checkbox" class="history-session-check" data-session-id="${escapeHtml(session.id)}">
        </label>
        <span class="history-session-icon">${SESSION_BUBBLE_SVG}</span>
        <span class="history-session-body">
          <span class="history-session-name">${nameHtml}</span>
          <span class="history-session-date">${escapeHtml(lastActive)}</span>
        </span>
        <span class="history-session-badge">${badgeHtml}</span>
      `;

      const checkbox = item.querySelector('.history-session-check');
      const checkWrap = item.querySelector('.history-session-check-wrap');
      checkWrap?.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      checkbox?.addEventListener('change', () => {
        updateBatchDeleteButton();
      });

      item.addEventListener('click', () => {
        selectSession(session.id, item);
      });
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectSession(session.id, item);
        }
      });

      container.appendChild(item);
    }

    if (!container.childElementCount) {
      container.innerHTML = renderEmptyStateHtml({ message: '暂无有效会话', variant: 'inline' });
    }
  }

  function getVisibleSessionItems() {
    return [...document.querySelectorAll('.history-session-item')].filter(
      (item) => item instanceof HTMLElement && item.style.display !== 'none',
    );
  }

  function getCheckedSessionIds() {
    return [...document.querySelectorAll('.history-session-check:checked')]
      .map((input) => (input instanceof HTMLInputElement ? input.dataset.sessionId : ''))
      .filter((id) => typeof id === 'string' && id.length > 0);
  }

  function updateBatchDeleteButton() {
    const deleteBtn = document.getElementById('history-batch-delete');
    const deselectBtn = document.getElementById('history-deselect-all');
    if (!(deleteBtn instanceof HTMLButtonElement)) {
      return;
    }
    const count = getCheckedSessionIds().length;
    deleteBtn.disabled = count === 0;
    deleteBtn.textContent = count > 0 ? `删除 · ${count}` : '删除';
    if (deselectBtn instanceof HTMLButtonElement) {
      deselectBtn.hidden = count === 0;
    }
  }

  function selectAllSessions() {
    for (const item of getVisibleSessionItems()) {
      const checkbox = item.querySelector('.history-session-check');
      if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = true;
      }
    }
    updateBatchDeleteButton();
  }

  function deselectAllSessions() {
    document.querySelectorAll('.history-session-check').forEach((input) => {
      if (input instanceof HTMLInputElement) {
        input.checked = false;
      }
    });
    updateBatchDeleteButton();
  }

  async function deleteSelectedSessions() {
    const app = getApp();
    const ids = getCheckedSessionIds();
    if (!ids.length) {
      ui.showTooltip('请先选择要删除的会话');
      return;
    }

    const ok = await confirmModal({
      title: '批量删除确认',
      message: `确定要删除选中的 ${ids.length} 个会话吗？此操作无法撤销。`,
      confirmLabel: '删除',
      cancelLabel: '取消',
      variant: 'danger',
    });
    if (!ok) {
      return;
    }

    const deleteBtn = document.getElementById('history-batch-delete');
    if (deleteBtn instanceof HTMLButtonElement) {
      deleteBtn.disabled = true;
      deleteBtn.textContent = '删除中…';
    }

    try {
      await Promise.all(ids.map((id) => app.sessionStore.deleteSession(id)));
      ui.showTooltip(`已删除 ${ids.length} 个会话`);
      await app.sessionStore.loadLatest();
      app.updateSessionDisplay();
      loadSessionList();
    } catch (error) {
      ui.showTooltip(`批量删除失败: ${error.message}`);
      updateBatchDeleteButton();
    }
  }

  function selectFirstSession() {
    const first = getVisibleSessionItems()[0];
    if (first instanceof HTMLElement) {
      selectSession(first.dataset.sessionId ?? '', first);
    }
  }

  /**
   * @param {string} sessionId
   * @param {HTMLElement} item
   */
  function selectSession(sessionId, item) {
    if (!sessionId) {
      return;
    }
    document.querySelectorAll('.history-session-item').forEach((el) => {
      el.classList.remove('active');
    });
    item.classList.add('active');
    selectedSessionId = sessionId;
    loadSessionDetail(sessionId);

    const loadBtn = document.getElementById('load-session');
    const deleteBtn = document.getElementById('delete-session');
    if (loadBtn instanceof HTMLButtonElement) {
      loadBtn.disabled = false;
    }
    if (deleteBtn instanceof HTMLButtonElement) {
      deleteBtn.disabled = false;
    }
  }

  function resetDetailPanel() {
    selectedSessionId = null;
    const titleEl = document.getElementById('session-detail-title');
    const metaEl = document.getElementById('session-detail-meta');
    const messagesEl = document.getElementById('session-messages');
    const loadBtn = document.getElementById('load-session');
    const deleteBtn = document.getElementById('delete-session');

    if (titleEl) {
      titleEl.textContent = '会话详情';
    }
    if (metaEl) {
      metaEl.textContent = '请从左侧选择会话';
    }
    if (messagesEl) {
      messagesEl.innerHTML = renderEmptyStateHtml({
        message: '请从左侧选择会话',
        variant: 'dashed',
      });
    }
    if (loadBtn instanceof HTMLButtonElement) {
      loadBtn.disabled = true;
    }
    if (deleteBtn instanceof HTMLButtonElement) {
      deleteBtn.disabled = true;
    }
  }

  function setupSessionSearch() {
    const searchInput = document.getElementById('session-search');
    if (!searchInput || searchInput.dataset.bound === '1') {
      return;
    }
    searchInput.dataset.bound = '1';
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.toLowerCase();
      document.querySelectorAll('.history-session-item').forEach((item) => {
        if (!(item instanceof HTMLElement)) {
          return;
        }
        const text = item.textContent?.toLowerCase() ?? '';
        item.style.display = text.includes(term) ? '' : 'none';
      });
    });
  }

  /**
   * @param {string} sessionId
   */
  function loadSessionDetail(sessionId) {
    const app = getApp();
    const messagesEl = document.getElementById('session-messages');
    const titleEl = document.getElementById('session-detail-title');
    const metaEl = document.getElementById('session-detail-meta');
    if (!messagesEl || !titleEl || !metaEl) {
      return;
    }

    const displayId = app.sessionStore.displayId(sessionId);
    titleEl.textContent = `会话 ${displayId}`;
    metaEl.textContent = '正在加载…';
    messagesEl.innerHTML = renderEmptyStateHtml({ message: '正在加载…', variant: 'dashed' });

    app.sessionStore
      .getSessionMessages(sessionId)
      .then((messages) => renderSessionMessages(messages, sessionId))
      .catch((error) => {
        metaEl.textContent = '加载失败';
        messagesEl.innerHTML = renderEmptyStateHtml({
          message: `加载失败: ${error.message}`,
          variant: 'dashed',
          className: 'ui-empty-state--error',
        });
      });
  }

  /**
   * @param {object[]} messages
   * @param {string} sessionId
   */
  function renderSessionMessages(messages, sessionId) {
    const messagesEl = document.getElementById('session-messages');
    const metaEl = document.getElementById('session-detail-meta');
    if (!messagesEl || !metaEl) {
      return;
    }

    const visibleCount = messages.filter(
      (message) => message.role === 'user' || message.role === 'assistant',
    ).length;
    metaEl.textContent = visibleCount > 0 ? `共 ${visibleCount} 条消息` : '暂无消息';

    if (!messages.length) {
      messagesEl.innerHTML = renderEmptyStateHtml({
        message: '此会话暂无消息',
        variant: 'dashed',
      });
      setupSessionActions(sessionId);
      return;
    }

    messagesEl.innerHTML = '';
    for (const message of messages) {
      if (message.role === 'tool') {
        continue;
      }
      if (!message.role) {
        continue;
      }

      const isUser = message.role === 'user';
      const row = document.createElement('article');
      row.className = `history-msg-row history-msg-row--${isUser ? 'user' : 'assistant'}`;

      let extra = '';
      if (!isUser && message.toolCalls?.length) {
        extra = message.toolCalls
          .map((tc) => `<span class="history-msg-tool">${escapeHtml(tc.name)}</span>`)
          .join('');
      }

      const timeHtml = formatMessageTime(message.timestamp);
      const contentHtml = isUser
        ? `<div class="history-msg-plain">${escapeHtml(message.content ?? '')}</div>`
        : `<div class="markdown-content history-msg-markdown">${renderHistoryMarkdown(message.content ?? '')}</div>`;

      row.innerHTML = isUser
        ? `
        <div class="history-msg-bubble">
          <div class="history-msg-card">
            ${contentHtml}
            ${extra ? `<div class="history-msg-tools">${extra}</div>` : ''}
            ${timeHtml ? `<time class="history-msg-time">${timeHtml}</time>` : ''}
          </div>
        </div>`
        : `
        <div class="history-msg-bubble">
          <span class="history-msg-avatar" aria-hidden="true">AI</span>
          <div class="history-msg-card">
            ${contentHtml}
            ${extra ? `<div class="history-msg-tools">${extra}</div>` : ''}
            ${timeHtml ? `<time class="history-msg-time">${timeHtml}</time>` : ''}
          </div>
        </div>`;

      const markdownEl = row.querySelector('.history-msg-markdown');
      if (markdownEl instanceof HTMLElement) {
        processHistoryCodeBlocks(markdownEl);
      }
      messagesEl.appendChild(row);
    }

    setupSessionActions(sessionId);
  }

  /**
   * @param {string} sessionId
   */
  function setupSessionActions(sessionId) {
    const app = getApp();
    const loadBtn = document.getElementById('load-session');
    const deleteBtn = document.getElementById('delete-session');
    if (!loadBtn || !deleteBtn) {
      return;
    }

    loadBtn.onclick = async () => {
      try {
        await app.sessionStore.loadSession(sessionId);
        closeChatModal('history-modal');
        ui.showTooltip('已加载会话');
      } catch (error) {
        ui.showTooltip(`加载会话失败: ${error.message}`);
      }
    };

    deleteBtn.onclick = async () => {
      const ok = await confirmModal({
        title: '删除确认',
        message: '确定要删除此会话吗？此操作无法撤销。',
        confirmLabel: '删除',
        cancelLabel: '取消',
        variant: 'danger',
      });
      if (!ok) {
        return;
      }

      try {
        await app.sessionStore.deleteSession(sessionId);
        ui.showTooltip('已删除会话');
        await app.sessionStore.loadLatest();
        app.updateSessionDisplay();
        loadSessionList();
      } catch (error) {
        ui.showTooltip(`删除失败: ${error.message}`);
      }
    };
  }

  return { showHistoryModal, loadSessionList };
}

/**
 * @param {string | undefined} value
 */
function formatSessionDate(value) {
  if (!value) {
    return '未知时间';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * @param {string | number | undefined} value
 */
function formatMessageTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * @param {string} text
 */
function renderHistoryMarkdown(text) {
  return marked.parse(text);
}

/**
 * @param {HTMLElement} container
 */
function processHistoryCodeBlocks(container) {
  enhanceCodeBlocks(container);
}
