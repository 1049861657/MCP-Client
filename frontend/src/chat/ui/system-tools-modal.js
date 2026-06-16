import { CHAT_SETTINGS_KEY } from '../storage-contract.js';
import { bindChatModalClose, openChatModal } from './chat-modals-host.js';

/**
 * @param {() => object} getApp
 */
function persistEnabledSystemTools(getApp) {
  try {
    const raw = localStorage.getItem(CHAT_SETTINGS_KEY);
    const settings = raw ? JSON.parse(raw) : {};
    settings.enabledSystemToolNames = [...(getApp().state.enabledSystemToolNames ?? [])];
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * @param {object} tool
 */
function resolveToolSummary(tool) {
  if (typeof tool.summary === 'string' && tool.summary.trim()) {
    return tool.summary.trim();
  }
  return tool.label || tool.codeName;
}

/**
 * @param {() => object} getApp
 */
export function createSystemToolsModalApi(getApp) {
  function renderSystemToolsList() {
    const container = document.getElementById('system-tools-modal-list');
    if (!container) {
      return;
    }
    const app = getApp();
    const catalog = app.state.systemToolCatalog ?? [];
    const enabled = new Set(app.state.enabledSystemToolNames ?? []);

    if (catalog.length === 0) {
      container.replaceChildren();
      const empty = document.createElement('li');
      empty.className = 'system-tools-empty';
      empty.textContent = '暂无可用工具';
      container.appendChild(empty);
      return;
    }

    container.replaceChildren();
    for (const tool of catalog) {
      const row = document.createElement('li');
      row.className = 'system-tools-item';
      row.setAttribute('role', 'listitem');

      const text = document.createElement('div');
      text.className = 'system-tools-item-text';
      const title = document.createElement('div');
      title.className = 'system-tools-item-title';
      title.textContent = tool.label || tool.codeName;
      const summary = document.createElement('div');
      summary.className = 'system-tools-item-summary';
      summary.textContent = resolveToolSummary(tool);
      text.append(title, summary);

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'ui-toggle';
      const on = enabled.has(tool.codeName);
      toggle.classList.toggle('on', on);
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggle.setAttribute('aria-label', `${tool.label || tool.codeName}${on ? '，已启用' : '，已关闭'}`);
      toggle.addEventListener('click', () => {
        const next = !toggle.classList.contains('on');
        toggle.classList.toggle('on', next);
        toggle.setAttribute('aria-pressed', next ? 'true' : 'false');
        toggle.setAttribute(
          'aria-label',
          `${tool.label || tool.codeName}${next ? '，已启用' : '，已关闭'}`,
        );
        const names = new Set(app.state.enabledSystemToolNames ?? []);
        if (next) {
          names.add(tool.codeName);
        } else {
          names.delete(tool.codeName);
        }
        app.state.enabledSystemToolNames = [...names];
        persistEnabledSystemTools(getApp);
      });

      row.append(text, toggle);
      container.appendChild(row);
    }
  }

  function showSystemToolsModal() {
    renderSystemToolsList();
    openChatModal('system-tools-modal');
    bindChatModalClose('system-tools-modal');
  }

  return { showSystemToolsModal };
}
