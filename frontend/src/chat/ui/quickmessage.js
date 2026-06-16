import {
  mountDropdownSelect,
  refreshDropdownSelect,
} from '../../shared/ui/dropdown-select.js';
import { confirmModal } from '../../shared/ui/confirm-dialog.js';
import { inputDialog } from '../../shared/ui/input-dialog.js';
import { CHAT_QUICK_MESSAGES_KEY } from '../storage-contract.js';
import { bindChatModalClose, closeChatModal, openChatModal } from './modal-host.js';

const ICON_EDIT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
const ICON_DELETE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

/** @type {boolean} */
let qmUiBound = false;

/**
 * @param {unknown} data
 * @returns {{ messages: Array<{ id: string; sortId: number; content: string; result: string; category: string }>; categories: string[] }}
 */
function parseQuickMessagesResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('响应格式无效');
  }
  const payload = /** @type {{ messages?: unknown; categories?: unknown }} */ (data);
  if (!Array.isArray(payload.messages)) {
    throw new Error('响应缺少 messages');
  }
  if (!Array.isArray(payload.categories)) {
    throw new Error('响应缺少 categories');
  }
  return {
    messages: payload.messages,
    categories: payload.categories.filter((item) => typeof item === 'string' && item.trim().length > 0),
  };
}

/**
 * 本地优先加载快捷消息：localStorage 有则用，无则拉服务端种子并落地（T4-02-04）。
 * @returns {Promise<{ messages: Array<{ id: string; sortId: number; content: string; result: string; category: string }>; categories: string[] }>}
 */
async function loadLocalQuickMessages() {
  try {
    const raw = localStorage.getItem(CHAT_QUICK_MESSAGES_KEY);
    if (raw) {
      return parseQuickMessagesResponse(JSON.parse(raw));
    }
  } catch {
    // 本地数据损坏则回落服务端种子
  }
  const response = await fetch('/api/config/quick-messages');
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }
  const seed = parseQuickMessagesResponse(await response.json());
  persistLocalQuickMessages(seed.messages, seed.categories);
  return seed;
}

/**
 * @param {Array<{ id: string; sortId: number; content: string; result: string; category: string }>} messages
 * @param {string[]} categories
 */
function persistLocalQuickMessages(messages, categories) {
  localStorage.setItem(CHAT_QUICK_MESSAGES_KEY, JSON.stringify({ messages, categories }));
}

/**
 * @param {() => object} getApp
 * @param {() => { showTooltip: (message: string, duration?: number) => void }} getUi
 */
export function createQuickMessageUi(getApp, getUi) {
  /** @type {Array<{ id: string; sortId: number; content: string; result: string; category: string }> | null} */
  let quickMessagesData = null;
  /** @type {string[]} */
  let categoryNames = [];
  let currentCategory = '';
  /** @type {string} */
  let ctxCategory = '';

  /**
   * @param {unknown} error
   * @param {HTMLElement | null} container
   * @param {string} message
   */
  function handleError(error, container, message) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(message, err);
    if (container) {
      container.innerHTML = `<div class="error-message">${message}: ${err.message}</div>`;
    }
    getUi().showTooltip(`${message}: ${err.message}`);
  }

  function ensureCurrentCategory() {
    if (categoryNames.length === 0) {
      currentCategory = '';
      return;
    }
    if (!categoryNames.includes(currentCategory)) {
      currentCategory = categoryNames[0];
    }
  }

  /**
   * @param {Array<{ id: string; sortId: number; content: string; result: string; category: string }>} data
   * @param {{ id: string; sortId: number; content: string; result: string; category: string }} message
   * @returns {number}
   */
  function getOriginalIndex(data, message) {
    return data.findIndex(
      (item) =>
        item.id === message.id &&
        item.sortId === message.sortId &&
        item.content === message.content,
    );
  }

  function syncEditCategoryOptions() {
    const select = document.getElementById('edit-message-category');
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const prev = select.value;
    select.innerHTML = categoryNames
      .map((name) => `<option value="${name}">${name}</option>`)
      .join('');
    if (categoryNames.includes(prev)) {
      select.value = prev;
    } else if (categoryNames.includes(currentCategory)) {
      select.value = currentCategory;
    }
    if (select.dataset.fbSelectMounted === '1') {
      refreshDropdownSelect(select);
    }
  }

  function updateEditSubtitle(category) {
    const sub = document.getElementById('edit-message-subtitle');
    if (sub) {
      sub.textContent = `将添加到「${category}」分类`;
    }
  }

  /**
   * @param {string} result
   */
  function setEditResultValue(result) {
    const hidden = document.getElementById('edit-message-result');
    if (hidden instanceof HTMLInputElement) {
      hidden.value = result;
    }
    document.querySelectorAll('.qm-result-seg-btn').forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) {
        return;
      }
      const isActive = btn.dataset.result === result;
      btn.classList.toggle('active', isActive);
      btn.classList.toggle('pass', isActive && result === '√');
      btn.classList.toggle('fail', isActive && result === '×');
    });
  }

  function updateBatchMeta() {
    const checkbox = document.getElementById('enable-batch-mode');
    const meta = document.getElementById('batch-mode-description');
    const content = document.getElementById('edit-message-content');
    if (!(checkbox instanceof HTMLInputElement) || !(meta instanceof HTMLElement)) {
      return;
    }
    if (!checkbox.checked) {
      meta.classList.add('hidden');
      return;
    }
    meta.classList.remove('hidden');
    const lines =
      content instanceof HTMLTextAreaElement
        ? content.value.split(/\r?\n/).filter((line) => line.trim()).length
        : 0;
    meta.innerHTML = `将创建 <strong>${lines}</strong> 条消息`;
  }

  function renderCategoryRail() {
    const list = document.getElementById('qm-cat-list');
    if (!list) {
      return;
    }
    list.innerHTML = '';
    categoryNames.forEach((name) => {
      const count = (quickMessagesData ?? []).filter((msg) => msg.category === name).length;
      const item = document.createElement('div');
      item.className = `qm-cat-item${name === currentCategory ? ' active' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-selected', name === currentCategory ? 'true' : 'false');
      item.innerHTML = `
        <span class="qm-cat-item-name">${name}</span>
        <span class="qm-cat-badge">${count}</span>
        <button type="button" class="qm-cat-menu-btn" aria-label="分类操作">⋯</button>`;

      item.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('.qm-cat-menu-btn')) {
          return;
        }
        currentCategory = name;
        renderQuickMessagesUi();
      });

      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          currentCategory = name;
          renderQuickMessagesUi();
        }
      });

      const menuBtn = item.querySelector('.qm-cat-menu-btn');
      if (menuBtn instanceof HTMLButtonElement) {
        menuBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          ctxCategory = name;
          const rect = menuBtn.getBoundingClientRect();
          const panel = document.querySelector('.qm-modal-panel');
          const ctx = document.getElementById('qm-ctx-menu');
          if (!(ctx instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
            return;
          }
          const panelRect = panel.getBoundingClientRect();
          ctx.style.left = `${rect.right - panelRect.left + 4}px`;
          ctx.style.top = `${rect.top - panelRect.top}px`;
          ctx.classList.remove('hidden');
        });
      }

      list.appendChild(item);
    });
    syncEditCategoryOptions();
  }

  function renderStats() {
    const title = document.getElementById('qm-current-cat-title');
    const chips = document.getElementById('qm-stat-chips');
    const list = (quickMessagesData ?? []).filter((msg) => msg.category === currentCategory);
    const pass = list.filter((msg) => msg.result !== '×').length;
    const fail = list.length - pass;
    if (title) {
      title.textContent = currentCategory;
    }
    if (chips) {
      chips.innerHTML = `
        <span class="qm-stat-chip neutral">${list.length} 条</span>
        <span class="qm-stat-chip pass">${pass} 通过</span>
        ${fail > 0 ? `<span class="qm-stat-chip fail">${fail} 失败</span>` : ''}`;
    }
  }

  /**
   * @param {HTMLElement} container
   * @param {Array<{ id: string; sortId: number; content: string; result: string; category: string }>} data
   */
  function renderMessageTable(container, data) {
    const filtered = data.filter((msg) => msg.category === currentCategory && msg.content);
    const emptyState = document.getElementById('qm-empty-state');
    const emptyName = document.getElementById('qm-empty-cat-name');

    if (filtered.length === 0) {
      container.innerHTML = '';
      container.classList.add('hidden');
      emptyState?.classList.remove('hidden');
      if (emptyName) {
        emptyName.textContent = currentCategory;
      }
      return;
    }

    container.classList.remove('hidden');
    emptyState?.classList.add('hidden');

    const table = document.createElement('table');
    table.className = 'qm-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>测试项目</th>
          <th>结果</th>
          <th></th>
        </tr>
      </thead>
      <tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    if (!tbody) {
      return;
    }

    filtered.forEach((message, displayIndex) => {
      const index = getOriginalIndex(data, message);
      const passed = message.result !== '×';
      const tr = document.createElement('tr');
      tr.setAttribute('data-message', message.content);
      tr.setAttribute('data-index', String(index));
      tr.innerHTML = `
        <td class="qm-col-id">${displayIndex + 1}</td>
        <td class="qm-col-content" title="${message.content}">${message.content}</td>
        <td class="qm-col-result">
          <button type="button" class="qm-status-pill ${passed ? 'pass' : 'fail'}">${passed ? '✓ 通过' : '× 失败'}</button>
        </td>
        <td class="qm-col-actions">
          <span class="qm-row-actions">
            <button type="button" class="qm-icon-btn" data-action="edit" title="编辑">${ICON_EDIT}</button>
            <button type="button" class="qm-icon-btn danger" data-action="delete" title="删除">${ICON_DELETE}</button>
          </span>
        </td>`;

      tr.querySelector('.qm-status-pill')?.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!quickMessagesData || index < 0) {
          return;
        }
        quickMessagesData[index].result = passed ? '×' : '√';
        renderQuickMessagesUi();
        void saveQuickMessagesWithoutReload();
      });

      tr.querySelector('[data-action="edit"]')?.addEventListener('click', (event) => {
        event.stopPropagation();
        editQuickMessage(index);
      });

      tr.querySelector('[data-action="delete"]')?.addEventListener('click', (event) => {
        event.stopPropagation();
        void deleteQuickMessage(index);
      });

      tr.addEventListener('click', () => {
        const messageInput = getApp().elements.message;
        if (messageInput instanceof HTMLTextAreaElement) {
          messageInput.value = message.content;
          messageInput.focus();
          closeChatModal('quick-messages-modal');
          getUi().showTooltip('已添加到输入框');
        }
      });

      tbody.appendChild(tr);
    });

    container.innerHTML = '';
    container.appendChild(table);
  }

  function renderQuickMessagesUi() {
    ensureCurrentCategory();
    renderCategoryRail();
    renderStats();
    const container = document.querySelector('.quick-messages-container');
    if (container instanceof HTMLElement && quickMessagesData) {
      renderMessageTable(container, quickMessagesData);
    }
  }

  function startAddCategory() {
    const wrap = document.getElementById('qm-cat-inline-add');
    const input = document.getElementById('qm-cat-new-input');
    if (!(wrap instanceof HTMLElement) || !(input instanceof HTMLInputElement)) {
      return;
    }
    wrap.classList.remove('hidden');
    input.value = '';
    input.focus();
  }

  function commitAddCategory() {
    const wrap = document.getElementById('qm-cat-inline-add');
    const input = document.getElementById('qm-cat-new-input');
    if (!(wrap instanceof HTMLElement) || !(input instanceof HTMLInputElement)) {
      return;
    }
    const name = input.value.trim();
    wrap.classList.add('hidden');
    if (!name || categoryNames.includes(name)) {
      if (name && categoryNames.includes(name)) {
        getUi().showTooltip('分类已存在');
      }
      return;
    }
    categoryNames.push(name);
    currentCategory = name;
    renderQuickMessagesUi();
    void saveQuickMessagesWithoutReload();
    getUi().showTooltip(`已创建分类「${name}」`);
  }

  async function renameCategory(oldName) {
    const next = await inputDialog({
      title: '重命名分类',
      label: '分类名称',
      defaultValue: oldName,
      confirmLabel: '保存',
      cancelLabel: '取消',
    });
    if (next === null || next.trim() === '' || next.trim() === oldName) {
      return;
    }
    const trimmed = next.trim();
    if (categoryNames.includes(trimmed)) {
      getUi().showTooltip('名称已存在');
      return;
    }
    categoryNames = categoryNames.map((name) => (name === oldName ? trimmed : name));
    if (quickMessagesData) {
      quickMessagesData.forEach((msg) => {
        if (msg.category === oldName) {
          msg.category = trimmed;
        }
      });
    }
    if (currentCategory === oldName) {
      currentCategory = trimmed;
    }
    renderQuickMessagesUi();
    await saveQuickMessagesWithoutReload();
    getUi().showTooltip('分类已重命名');
  }

  async function deleteCategory(name) {
    const count = (quickMessagesData ?? []).filter((msg) => msg.category === name).length;
    const confirmed = await confirmModal({
      title: '删除分类',
      message: count
        ? `删除「${name}」将同时删除 ${count} 条消息，确定继续？`
        : `删除空分类「${name}」？`,
      confirmLabel: '删除',
      cancelLabel: '取消',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    categoryNames = categoryNames.filter((item) => item !== name);
    if (quickMessagesData) {
      quickMessagesData = quickMessagesData.filter((msg) => msg.category !== name);
      quickMessagesData.forEach((item, idx) => {
        item.sortId = idx + 1;
      });
    }
    ensureCurrentCategory();
    renderQuickMessagesUi();
    await saveQuickMessagesWithoutReload();
    getUi().showTooltip('分类已删除');
  }

  function bindQuickMessageUi() {
    if (qmUiBound) {
      return;
    }
    qmUiBound = true;

    bindChatModalClose('quick-messages-modal');
    bindChatModalClose('edit-message-modal');

    document.getElementById('qm-add-message')?.addEventListener('click', () => addQuickMessage());
    document.getElementById('qm-empty-add')?.addEventListener('click', () => addQuickMessage());
    document.getElementById('qm-add-category')?.addEventListener('click', startAddCategory);

    const catInput = document.getElementById('qm-cat-new-input');
    if (catInput instanceof HTMLInputElement) {
      catInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitAddCategory();
        }
        if (event.key === 'Escape') {
          document.getElementById('qm-cat-inline-add')?.classList.add('hidden');
        }
      });
      catInput.addEventListener('blur', commitAddCategory);
    }

    const ctx = document.getElementById('qm-ctx-menu');
    ctx?.querySelector('[data-action="rename"]')?.addEventListener('click', () => {
      ctx.classList.add('hidden');
      void renameCategory(ctxCategory);
    });
    ctx?.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      ctx.classList.add('hidden');
      void deleteCategory(ctxCategory);
    });

    document.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (!event.target.closest('#qm-ctx-menu') && !event.target.closest('.qm-cat-menu-btn')) {
        ctx?.classList.add('hidden');
      }
    });

    document.querySelectorAll('.qm-result-seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn instanceof HTMLButtonElement && btn.dataset.result) {
          setEditResultValue(btn.dataset.result);
        }
      });
    });

    const batchCheckbox = document.getElementById('enable-batch-mode');
    batchCheckbox?.addEventListener('change', updateBatchMeta);
    document.getElementById('edit-message-content')?.addEventListener('input', updateBatchMeta);

    document.getElementById('edit-message-category')?.addEventListener('change', (event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement) {
        updateEditSubtitle(target.value);
      }
    });

    const cancelBtn = document.getElementById('cancel-edit');
    cancelBtn?.addEventListener('click', () => {
      closeChatModal('edit-message-modal');
      resetBatchMode();
    });

    const form = document.getElementById('edit-message-form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      saveMessageEdit();
    });
  }

  function resetBatchMode() {
    const batchModeCheckbox = document.getElementById('enable-batch-mode');
    const batchModeDescription = document.getElementById('batch-mode-description');
    const contentInput = document.getElementById('edit-message-content');
    const batchGroup = document.querySelector('.batch-mode-group');

    if (batchModeCheckbox instanceof HTMLInputElement) {
      batchModeCheckbox.checked = false;
    }
    batchModeDescription?.classList.add('hidden');
    if (contentInput instanceof HTMLTextAreaElement) {
      contentInput.rows = 4;
      contentInput.placeholder = '输入要发送的测试问题…';
    }
    if (batchGroup instanceof HTMLElement) {
      batchGroup.classList.remove('hidden');
    }
  }

  function addQuickMessage() {
    if (categoryNames.length === 0) {
      getUi().showTooltip('请先创建分类');
      startAddCategory();
      return;
    }
    const title = document.getElementById('edit-message-title');
    const indexInput = document.getElementById('edit-message-index');
    const idInput = document.getElementById('edit-message-id');
    const sortIdInput = document.getElementById('edit-message-sortid');
    const contentInput = document.getElementById('edit-message-content');
    const categorySelect = document.getElementById('edit-message-category');
    const batchGroup = document.querySelector('.batch-mode-group');

    if (
      !(indexInput instanceof HTMLInputElement) ||
      !(idInput instanceof HTMLInputElement) ||
      !(sortIdInput instanceof HTMLInputElement) ||
      !(contentInput instanceof HTMLTextAreaElement) ||
      !(categorySelect instanceof HTMLSelectElement)
    ) {
      return;
    }

    if (title) {
      title.textContent = '新增快捷消息';
    }
    indexInput.value = '-1';
    idInput.value = '';
    contentInput.value = '';

    let maxSortId = 0;
    if (quickMessagesData && quickMessagesData.length > 0) {
      maxSortId = Math.max(...quickMessagesData.map((item) => parseInt(String(item.sortId), 10) || 0));
    }
    sortIdInput.value = String(maxSortId + 1);
    setEditResultValue('×');
    syncEditCategoryOptions();
    categorySelect.value = currentCategory;
    updateEditSubtitle(currentCategory);
    if (batchGroup instanceof HTMLElement) {
      batchGroup.classList.remove('hidden');
    }
    resetBatchMode();
    openChatModal('edit-message-modal');
    const categorySelectEl = document.getElementById('edit-message-category');
    if (categorySelectEl instanceof HTMLSelectElement) {
      mountDropdownSelect(categorySelectEl, { placeholder: '选择分类' });
    }
  }

  /**
   * @param {number} index
   */
  function editQuickMessage(index) {
    if (!quickMessagesData || !quickMessagesData[index]) {
      getUi().showTooltip('找不到要编辑的消息');
      return;
    }

    const message = quickMessagesData[index];
    const title = document.getElementById('edit-message-title');
    const indexInput = document.getElementById('edit-message-index');
    const idInput = document.getElementById('edit-message-id');
    const sortIdInput = document.getElementById('edit-message-sortid');
    const contentInput = document.getElementById('edit-message-content');
    const categorySelect = document.getElementById('edit-message-category');
    const batchGroup = document.querySelector('.batch-mode-group');

    if (
      !(title instanceof HTMLElement) ||
      !(indexInput instanceof HTMLInputElement) ||
      !(idInput instanceof HTMLInputElement) ||
      !(sortIdInput instanceof HTMLInputElement) ||
      !(contentInput instanceof HTMLTextAreaElement) ||
      !(categorySelect instanceof HTMLSelectElement)
    ) {
      return;
    }

    title.textContent = '编辑快捷消息';
    indexInput.value = String(index);
    idInput.value = message.id || '';
    sortIdInput.value = String(message.sortId || '');
    contentInput.value = message.content || '';
    setEditResultValue(message.result === '×' ? '×' : '√');
    syncEditCategoryOptions();
    categorySelect.value = categoryNames.includes(message.category)
      ? message.category
      : categoryNames[0] ?? message.category;
    updateEditSubtitle(categorySelect.value);
    if (batchGroup instanceof HTMLElement) {
      batchGroup.classList.add('hidden');
    }
    openChatModal('edit-message-modal');
    mountDropdownSelect(categorySelect, { placeholder: '选择分类' });
  }

  /**
   * @param {string} text
   * @param {string} result
   * @param {string} category
   */
  function processBatchMessages(text, result, category) {
    if (!text.trim()) {
      return [];
    }
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    let maxSortId = 0;
    if (quickMessagesData && quickMessagesData.length > 0) {
      maxSortId = Math.max(...quickMessagesData.map((item) => parseInt(String(item.sortId), 10) || 0));
    }
    return lines.map((line, offset) => ({
      id: '',
      sortId: maxSortId + offset + 1,
      content: line.trim(),
      result,
      category,
    }));
  }

  function saveMessageEdit() {
    const indexInput = document.getElementById('edit-message-index');
    const idInput = document.getElementById('edit-message-id');
    const sortIdInput = document.getElementById('edit-message-sortid');
    const contentInput = document.getElementById('edit-message-content');
    const resultInput = document.getElementById('edit-message-result');
    const categorySelect = document.getElementById('edit-message-category');
    const batchModeCheckbox = document.getElementById('enable-batch-mode');

    if (
      !(indexInput instanceof HTMLInputElement) ||
      !(sortIdInput instanceof HTMLInputElement) ||
      !(contentInput instanceof HTMLTextAreaElement) ||
      !(resultInput instanceof HTMLInputElement) ||
      !(categorySelect instanceof HTMLSelectElement)
    ) {
      return;
    }

    const index = parseInt(indexInput.value, 10);
    const id = idInput instanceof HTMLInputElement ? idInput.value : '';
    const batchEnabled =
      index === -1 &&
      batchModeCheckbox instanceof HTMLInputElement &&
      batchModeCheckbox.checked;
    const content = batchEnabled ? contentInput.value : contentInput.value.trim();
    const result = resultInput.value;
    const category = categorySelect.value;

    if (!content.trim()) {
      getUi().showTooltip('消息内容不能为空');
      return;
    }

    closeChatModal('edit-message-modal');

    if (batchEnabled && quickMessagesData) {
      const messages = processBatchMessages(content, result, category);
      resetBatchMode();
      if (messages.length === 0) {
        getUi().showTooltip('没有有效的消息内容');
        return;
      }
      quickMessagesData = [...quickMessagesData, ...messages];
      currentCategory = category;
      renderQuickMessagesUi();
      getUi().showTooltip(`成功添加 ${messages.length} 条消息`);
      void saveQuickMessagesWithoutReload();
      return;
    }

    resetBatchMode();

    if (!quickMessagesData) {
      return;
    }

    const newMessage = {
      id,
      sortId: parseInt(sortIdInput.value, 10),
      content,
      result,
      category,
    };

    if (index === -1) {
      quickMessagesData.push(newMessage);
      currentCategory = category;
    } else {
      newMessage.sortId = quickMessagesData[index].sortId;
      quickMessagesData[index] = newMessage;
      if (newMessage.category !== currentCategory) {
        currentCategory = newMessage.category;
      }
    }

    renderQuickMessagesUi();
    getUi().showTooltip(index === -1 ? '添加成功' : '更新成功');
    void saveQuickMessagesWithoutReload();
  }

  /**
   * @param {number} index
   */
  async function deleteQuickMessage(index) {
    if (!quickMessagesData || !quickMessagesData[index]) {
      getUi().showTooltip('找不到要删除的消息');
      return;
    }

    const confirmed = await confirmModal({
      title: '删除确认',
      message: '确定要删除这条快捷消息吗？',
      confirmLabel: '删除',
      cancelLabel: '取消',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    quickMessagesData.splice(index, 1);
    quickMessagesData.forEach((item, idx) => {
      item.sortId = idx + 1;
    });
    renderQuickMessagesUi();
    getUi().showTooltip('删除成功');
    await saveQuickMessagesWithoutReload();
  }

  async function saveQuickMessagesWithoutReload() {
    if (!quickMessagesData) {
      getUi().showTooltip('没有可保存的数据');
      return;
    }
    // 本地自治：写 localStorage，不再回写服务端（服务端仅作种子，见 T4-02-04）
    persistLocalQuickMessages(quickMessagesData, categoryNames);
  }

  async function showQuickMessagesModal() {
    bindQuickMessageUi();
    openChatModal('quick-messages-modal');

    const container = document.querySelector('.quick-messages-container');
    if (container instanceof HTMLElement) {
      container.innerHTML = '<div class="loading-messages">正在加载快捷消息...</div>';
      container.classList.remove('hidden');
    }
    document.getElementById('qm-empty-state')?.classList.add('hidden');

    try {
      const payload = await loadLocalQuickMessages();
      quickMessagesData = payload.messages;
      categoryNames = payload.categories;
      currentCategory = categoryNames[0] ?? '';
      renderQuickMessagesUi();
    } catch (error) {
      handleError(error, container instanceof HTMLElement ? container : null, '加载快捷消息失败');
    }
  }

  /**
   * @param {Array<{ content: string }>} array
   * @param {number} count
   */
  function getRandomElements(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }

  /**
   * @param {{ isAppended?: boolean; bubbleCount?: number }} options
   */
  async function showQuickMessageBubbles(options = {}) {
    const { isAppended = false, bubbleCount = 3 } = options;
    const containerClass = isAppended ? 'appended-quick-bubbles' : 'quick-message-bubbles';
    const bubbleClass = isAppended ? 'appended-quick-bubble' : 'quick-message-bubble';

    const app = getApp();
    const chatMessages = app.elements.chatMessages;
    if (!(chatMessages instanceof HTMLElement)) {
      return;
    }

    if (app.state?.isLoading) {
      return;
    }

    if (!isAppended && chatMessages.childElementCount > 0) {
      return;
    }

    const existingBubbles = chatMessages.querySelector(`.${containerClass}`);
    existingBubbles?.remove();

    try {
      const { messages } = await loadLocalQuickMessages();
      if (messages.length === 0) {
        return;
      }

      if (!isAppended && chatMessages.childElementCount > 0) {
        return;
      }

      const randomMessages = getRandomElements(messages, bubbleCount);
      const bubblesContainer = document.createElement('div');
      bubblesContainer.className = containerClass;

      randomMessages.forEach((message) => {
        const bubble = document.createElement('div');
        bubble.className = bubbleClass;
        bubble.textContent = message.content;
        bubble.addEventListener('click', () => {
          const messageInput = getApp().elements.message;
          if (messageInput instanceof HTMLTextAreaElement) {
            messageInput.value = message.content;
            bubblesContainer.remove();
            const sendButton = getApp().elements.sendButton;
            if (sendButton instanceof HTMLElement) {
              sendButton.click();
            }
          }
        });
        bubblesContainer.appendChild(bubble);
      });

      chatMessages.appendChild(bubblesContainer);
      if (isAppended) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    } catch (error) {
      console.error('加载随机快捷消息失败:', error);
    }
  }

  function showAppendedQuickMessages() {
    void showQuickMessageBubbles({ isAppended: true });
  }

  function showRandomQuickMessages() {
    void showQuickMessageBubbles({ isAppended: false });
  }

  return {
    showQuickMessagesModal,
    showAppendedQuickMessages,
    showRandomQuickMessages,
  };
}
