import {
  commitMcpSelection,
  isMcpServerEnabled,
  MCP_CHECKBOX_PREFIX,
  readEnabledIdsFromMcpCheckboxes,
  syncMcpCheckboxes,
} from '../mcp-selection.js';
import { bindChatModalClose, closeChatModal, openChatModal } from './modal-host.js';

/** @type {string[]} 打开弹窗时的快照，取消时恢复 */
let snapshotEnabledIds = [];

/**
 * @param {() => object} getApp
 * @param {{ showTooltip: Function, updateMCPButtonCounter?: Function, saveMcpServerIds?: Function }} ui
 */
export function createMcpModalApi(getApp, ui) {
  let mcpModalBound = false;

  function bindMcpModalActions() {
    if (mcpModalBound) {
      return;
    }
    mcpModalBound = true;

    document.getElementById('mcp-save')?.addEventListener('click', () => {
      finalizeModal();
      closeChatModal('mcp-servers-modal');
    });

    document.getElementById('mcp-cancel')?.addEventListener('click', () => {
      revertMcpSelection();
      closeChatModal('mcp-servers-modal');
    });

    document.getElementById('mcp-select-all')?.addEventListener('click', () => {
      const app = getApp();
      if (!app.state.mcpServers.length) {
        ui.showTooltip('没有可用的服务器');
        return;
      }
      const allIds = app.state.mcpServers.map((server) => server.id);
      syncMcpCheckboxes(app.state.mcpServers, allIds);
      commitMcpSelection(app, allIds, ui);
    });

    document.getElementById('mcp-deselect-all')?.addEventListener('click', () => {
      const app = getApp();
      syncMcpCheckboxes(app.state.mcpServers, []);
      commitMcpSelection(app, [], ui);
    });
  }

  function showMCPServersModal() {
    bindMcpModalActions();
    openChatModal('mcp-servers-modal');
    bindChatModalClose('mcp-servers-modal', revertMcpSelection);
    loadMCPServersList();
  }

  function loadMCPServersList() {
    const app = getApp();
    const container = document.getElementById('mcp-modal-servers-list');
    if (!container) {
      return;
    }

    container.innerHTML = '<p class="mcp-servers-empty">加载中…</p>';

    app
      .loadMCPServers()
      .then(() => {
        snapshotEnabledIds = [...app.state.enabledServerIds];
        renderMCPServersList();
        updateMCPButtonCounter();
      })
      .catch(() => {
        container.innerHTML = '<p class="mcp-servers-empty">加载失败，请稍后重试</p>';
      });
  }

  function renderMCPServersList() {
    const app = getApp();
    const container = document.getElementById('mcp-modal-servers-list');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!app.state.mcpServers.length) {
      container.innerHTML =
        '<p class="mcp-servers-empty">暂无可用服务器<br>请先在 <a href="/info.html">MCP服务</a> 页连接 MCP</p>';
      return;
    }

    const { enabledServerIds } = app.state;
    for (const server of app.state.mcpServers) {
      container.appendChild(createMcpServerItem(server, enabledServerIds));
    }
  }

  /**
   * @param {{ id: string, name: string, description?: string, toolsEnabled?: number, toolsTotal?: number }} server
   * @param {string[]} enabledServerIds
   */
  function createMcpServerItem(server, enabledServerIds) {
    const item = document.createElement('div');
    item.className = 'mcp-server-item';
    item.style.setProperty('--mcp-hue', String(serverAccentHue(server.name)));

    const select = document.createElement('label');
    select.className = 'mcp-server-select';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${MCP_CHECKBOX_PREFIX}${server.id}`;
    checkbox.className = 'mcp-server-checkbox';
    checkbox.checked = isMcpServerEnabled(enabledServerIds, server.id);
    checkbox.dataset.serverId = server.id;

    checkbox.addEventListener('change', () => {
      const app = getApp();
      commitMcpSelection(app, readEnabledIdsFromMcpCheckboxes(app.state.mcpServers), ui);
    });

    const badge = document.createElement('span');
    badge.className = 'mcp-server-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = serverInitial(server.name);

    const indicator = document.createElement('span');
    indicator.className = 'mcp-server-indicator';
    indicator.setAttribute('aria-hidden', 'true');

    const textWrap = document.createElement('span');
    textWrap.className = 'mcp-server-text';

    const nameRow = document.createElement('span');
    nameRow.className = 'mcp-server-name-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'mcp-server-name';
    nameEl.textContent = server.name;
    nameRow.appendChild(nameEl);
    textWrap.appendChild(nameRow);

    const noneEnabled = isAllToolsDisabled(server);

    if (server.description) {
      const descEl = document.createElement('span');
      descEl.className = 'mcp-server-desc';
      descEl.textContent = server.description;
      textWrap.appendChild(descEl);
    }

    if (noneEnabled) {
      const warnEl = document.createElement('span');
      warnEl.className = 'mcp-server-warn';
      warnEl.textContent = '尚未启用任何工具';
      textWrap.appendChild(warnEl);
    }

    select.append(checkbox, badge, textWrap, indicator);

    const toolsLink = document.createElement('a');
    const ratio = formatToolRatio(server);
    toolsLink.className = 'mcp-server-tools-link';
    toolsLink.href = buildInfoToolsUrl(server.id);
    toolsLink.textContent = ratio;
    toolsLink.title = '在 MCP 服务页配置工具';
    toolsLink.setAttribute('aria-label', `${server.name} 工具配置 ${ratio}`);

    if (noneEnabled) {
      item.classList.add('has-no-tools-enabled');
    }

    item.append(select, toolsLink);
    return item;
  }

  function finalizeModal() {
    const app = getApp();
    const enabledIds = commitMcpSelection(
      app,
      readEnabledIdsFromMcpCheckboxes(app.state.mcpServers),
      ui,
    );
    snapshotEnabledIds = [...enabledIds];
    ui.showTooltip(`已更新 MCP 选择，当前启用 ${enabledIds.length} 个`);
  }

  function revertMcpSelection() {
    const app = getApp();
    commitMcpSelection(app, snapshotEnabledIds, ui);
    syncMcpCheckboxes(app.state.mcpServers, app.state.enabledServerIds);
  }

  function updateMCPButtonCounter() {
    const app = getApp();
    const btn = document.getElementById('mcp-quick-access');
    if (!btn) {
      return;
    }

    btn.querySelector('.counter')?.remove();
    const count = app.state.enabledServerIds.length;
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'counter';
      badge.textContent = String(count);
      btn.appendChild(badge);
    }
  }

  return {
    showMCPServersModal,
    updateMCPButtonCounter,
  };
}

/**
 * @param {string} serverId
 */
function buildInfoToolsUrl(serverId) {
  const params = new URLSearchParams({ serverId, tab: 'tools' });
  return `/info.html?${params.toString()}`;
}

/**
 * @param {{ toolsEnabled?: number, toolsTotal?: number }} server
 */
function formatToolRatio(server) {
  const enabled = typeof server.toolsEnabled === 'number' ? server.toolsEnabled : 0;
  const total = typeof server.toolsTotal === 'number' ? server.toolsTotal : 0;
  return `${enabled}/${total}`;
}

/**
 * @param {{ toolsEnabled?: number, toolsTotal?: number }} server
 */
function isAllToolsDisabled(server) {
  const enabled = typeof server.toolsEnabled === 'number' ? server.toolsEnabled : 0;
  const total = typeof server.toolsTotal === 'number' ? server.toolsTotal : 0;
  return total > 0 && enabled === 0;
}

/**
 * @param {string} name
 */
function serverInitial(name) {
  const trimmed = String(name).trim();
  if (!trimmed) {
    return 'M';
  }
  return trimmed.charAt(0).toUpperCase();
}

/**
 * @param {string} name
 */
function serverAccentHue(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}
