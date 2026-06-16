import {
  commitMcpSelection,
  countKnownEnabledMcpServers,
  isMcpServerEnabled,
  MCP_CHECKBOX_PREFIX,
  readEnabledIdsFromMcpCheckboxes,
  syncMcpCheckboxes,
} from '../mcp-selection.js';
import { closeChatModal, openChatModal } from './modal-host.js';

/**
 * @param {() => object} getApp
 * @param {{ showTooltip: Function, updateMCPButtonCounter?: Function, saveMcpServerIds?: Function }} ui
 */
export function createMcpModalApi(getApp, ui) {
  let actionsBound = false;

  function bindMcpModalActions() {
    if (actionsBound) {
      return;
    }
    actionsBound = true;

    const modal = document.getElementById('mcp-servers-modal');
    const dismiss = () => closeChatModal('mcp-servers-modal');

    document.getElementById('mcp-save')?.addEventListener('click', async () => {
      const app = getApp();
      const saveBtn = document.getElementById('mcp-save');
      if (saveBtn instanceof HTMLButtonElement) {
        saveBtn.disabled = true;
      }
      try {
        const selectedIds = readEnabledIdsFromMcpCheckboxes(app.state.mcpServers);
        let reachableIds = [];
        let unreachableNames = [];
        let skippedNoToolsNames = [];

        if (selectedIds.length > 0) {
          ui.showTooltip('正在检测 MCP 连通性…');
          const probeResult = await app.api.probeMcpServers(selectedIds);
          reachableIds = Array.isArray(probeResult.reachableIds)
            ? probeResult.reachableIds.filter((id) => typeof id === 'string')
            : [];
          unreachableNames = Array.isArray(probeResult.unreachable)
            ? probeResult.unreachable.map((row) => row.name || row.id)
            : [];
          skippedNoToolsNames = Array.isArray(probeResult.skippedNoTools)
            ? probeResult.skippedNoTools.map((row) => row.name || row.id)
            : [];
        }

        const committed = commitMcpSelection(app, reachableIds, ui);
        let message = `已保存 MCP 选择，当前可用 ${committed.length} 个`;
        if (unreachableNames.length > 0) {
          message += `（${unreachableNames.join('、')} 连接不上，已取消勾选）`;
        }
        if (skippedNoToolsNames.length > 0) {
          message += `（${skippedNoToolsNames.join('、')} 无启用工具，已取消勾选）`;
        }
        ui.showTooltip(message);
        dismiss();
      } catch (error) {
        ui.showTooltip(error instanceof Error ? error.message : '保存失败');
      } finally {
        if (saveBtn instanceof HTMLButtonElement) {
          saveBtn.disabled = false;
        }
      }
    });

    document.getElementById('mcp-cancel')?.addEventListener('click', dismiss);

    modal?.querySelectorAll('[data-close-modal="mcp-servers-modal"]').forEach((btn) => {
      btn.addEventListener('click', dismiss);
    });
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) {
        dismiss();
      }
    });

    document.getElementById('mcp-select-all')?.addEventListener('click', () => {
      const app = getApp();
      const servers = app.state.mcpServers || [];
      if (!servers.length) {
        ui.showTooltip('没有可用的服务器');
        return;
      }
      syncMcpCheckboxes(servers, servers.map((server) => server.id));
    });

    document.getElementById('mcp-deselect-all')?.addEventListener('click', () => {
      const app = getApp();
      syncMcpCheckboxes(app.state.mcpServers, []);
    });
  }

  function showMCPServersModal() {
    bindMcpModalActions();
    openChatModal('mcp-servers-modal');
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
        renderMCPServersList();
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
        '<p class="mcp-servers-empty">暂无已启用的 MCP 服务<br>请先在 <a href="/info.html">MCP服务</a> 页连接并启用 MCP</p>';
      return;
    }

    const { enabledServerIds } = app.state;
    for (const server of app.state.mcpServers) {
      container.appendChild(createMcpServerItem(server, enabledServerIds));
    }
  }

  /**
   * @param {{ id: string, name: string, description?: string, isConnected?: boolean, toolsEnabled?: number, toolsTotal?: number }} server
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
    toolsLink.title = ratio === '—' ? '保存后将检测连通性并刷新工具数' : '在 MCP 服务页配置工具';
    toolsLink.setAttribute('aria-label', `${server.name} 工具配置 ${ratio}`);

    if (noneEnabled) {
      item.classList.add('has-no-tools-enabled');
    }

    item.append(select, toolsLink);
    return item;
  }

  function updateMCPButtonCounter() {
    const app = getApp();
    const btn = document.getElementById('mcp-quick-access');
    if (!btn) {
      return;
    }

    btn.querySelector('.counter')?.remove();
    const count = countKnownEnabledMcpServers(
      app.state.enabledServerIds || [],
      app.state.mcpServers || [],
    );
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
 * @param {{ isConnected?: boolean, toolsEnabled?: number, toolsTotal?: number }} server
 */
function formatToolRatio(server) {
  const total = typeof server.toolsTotal === 'number' ? server.toolsTotal : 0;
  if (server.isConnected !== true && total === 0) {
    return '—';
  }
  const enabled = typeof server.toolsEnabled === 'number' ? server.toolsEnabled : 0;
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
