import { isUnauthorizedError } from '../auth/auth-shell.js';
import { confirmModal } from '../shared/ui/modal.js';
import { renderStatusDotHtml } from '../shared/ui/status-dot.js';
import { setStatusChipElement } from '../shared/ui/status-chip.js';
import { showToast } from '../shared/ui/toast.js';
import { closeToolTestDrawer } from './tool-test-drawer.js';
import {
  countEnabledTools,
  isToolEnabled,
  renderToolsPanel,
  resetToolsPanelState,
} from './tools-panel.js';
import { renderPromptsPanel, renderResourcesPanel, updateRpTabCount } from './rp-panel.js';

/** @typedef {{ id: string; name: string; status: string; authorizationUrl?: string; usesOAuth?: boolean; connectionDetails: ConnectionDetails }} ServerSummary */
/** @typedef {{ connectionType: string; command?: string; args?: string; mcpUrl?: string; headers?: Record<string, string>; displayCommand?: string }} ConnectionDetails */
/** @typedef {{ name: string; codeName?: string; description: string; parameters?: ToolParameter[] }} ToolInfo */
/** @typedef {{ name: string; type: string; description: string; required: boolean }} ToolParameter */
/** @typedef {{ name: string; description?: string; arguments?: { name: string; description?: string; required?: boolean }[] }} McpPromptInfo */
/** @typedef {{ uri: string; name?: string; description?: string; mimeType?: string }} McpResourceInfo */
/** @typedef {{ availableServers: ServerSummary[]; currentServerId: string | null; server: ServerSummary; serverTools: Record<string, ToolInfo[]>; serverResources?: Record<string, McpResourceInfo[]>; serverPrompts?: Record<string, McpPromptInfo[]>; toolPreferences?: Record<string, Record<string, boolean>> }} InfoData */

const MCP_STATUS = {
  Connected: 'connected',
  Disconnected: 'disconnected',
  Connecting: 'connecting',
  NeedsAuth: 'needs-auth',
  Failed: 'failed',
};

/**
 * @param {string} status
 * @returns {boolean}
 */
function isServerConnected(status) {
  return status === MCP_STATUS.Connected;
}

/**
 * @param {string} status
 * @returns {string}
 */
function serverStatusLabel(status) {
  switch (status) {
    case MCP_STATUS.Connected:
      return '已连接';
    case MCP_STATUS.Connecting:
      return '连接中';
    case MCP_STATUS.NeedsAuth:
      return '需授权';
    case MCP_STATUS.Failed:
      return '连接失败';
    default:
      return '未连接';
  }
}

/**
 * @param {string} status
 * @returns {'on' | 'off' | 'pending' | 'warn' | 'err'}
 */
function serverStatusChipClass(status) {
  if (status === MCP_STATUS.Connected) {
    return 'on';
  }
  if (status === MCP_STATUS.Connecting) {
    return 'pending';
  }
  if (status === MCP_STATUS.NeedsAuth) {
    return 'warn';
  }
  if (status === MCP_STATUS.Failed) {
    return 'err';
  }
  return 'off';
}

const ICON_POWER =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10M18.36 6.64a9 9 0 1 1-12.73 0"/></svg>';
const ICON_SPINNER =
  '<svg class="conn-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';

/** @type {{ serverId: string; action: 'connect' | 'disconnect' } | null} */
let connectionPending = null;

const els = {
  loading: document.getElementById('loading'),
  appShell: document.getElementById('app-shell'),
  serverSearch: document.getElementById('server-search'),
  serverList: document.getElementById('server-list'),
  refreshListBtn: document.getElementById('refresh-list-btn'),
  addServerBtn: document.getElementById('add-server-btn'),
  vEmpty: document.getElementById('v-empty'),
  vDetail: document.getElementById('v-detail'),
  vForm: document.getElementById('v-form'),
  hName: document.getElementById('h-name'),
  hStatus: document.getElementById('h-status'),
  hStatusText: document.getElementById('h-status-text'),
  hConnBtn: document.getElementById('h-conn-btn'),
  hAuthBtn: document.getElementById('h-auth-btn'),
  goEdit: document.getElementById('go-edit'),
  goDel: document.getElementById('go-del'),
  tabTools: document.getElementById('tab-tools'),
  tabPrompts: document.getElementById('tab-prompts'),
  tabResources: document.getElementById('tab-resources'),
  infoGrid: document.getElementById('info-grid'),
  cardMcp: document.getElementById('card-mcp'),
  cardEnabledTools: document.getElementById('card-enabled-tools'),
  gId: document.getElementById('g-id'),
  gType: document.getElementById('g-type'),
  gInternal: document.getElementById('g-internal'),
  gVer: document.getElementById('g-ver'),
  gCmdLabel: document.getElementById('g-cmd-label'),
  gCmd: document.getElementById('g-cmd'),
  gEnabledTools: document.getElementById('g-enabled-tools'),
  goToolsTab: document.getElementById('go-tools-tab'),
  toolsToolbarHint: document.getElementById('tools-toolbar-hint'),
  toolsBody: document.getElementById('tools-body'),
  promptsBody: document.getElementById('prompts-body'),
  resourcesBody: document.getElementById('resources-body'),
  toolsAllOn: document.getElementById('tools-all-on'),
  toolsAllOff: document.getElementById('tools-all-off'),
  hToolsBadge: document.getElementById('h-tools-badge'),
  hToolsRatio: document.getElementById('h-tools-ratio'),
  formBack: document.getElementById('form-back'),
  formTitle: document.getElementById('form-h'),
  formMode: document.getElementById('form-mode'),
  serverIdInput: document.getElementById('server-id'),
  serverForm: document.getElementById('server-form'),
  formCancel: document.getElementById('form-x'),
  stdioBlock: document.getElementById('b-stdio'),
  httpBlock: document.getElementById('b-http'),
  headersRows: document.getElementById('headers-rows'),
  headersAddRow: document.getElementById('headers-add-row'),
};

/** @type {InfoData | null} */
let currentData = null;

/** @type {string} */
let searchQuery = '';

/**
 * @param {{ error?: string; details?: string }} body
 * @param {number} status
 * @param {string} fallback
 * @returns {string}
 */
function formatApiError(body, status, fallback) {
  const error = body.error?.trim();
  const details = body.details?.trim();
  const parts = [];

  if (error) {
    parts.push(error);
  }
  if (details && details !== error) {
    parts.push(details);
  }

  if (parts.length > 0) {
    return parts.join('：');
  }

  return status >= 400 ? `${fallback}（HTTP ${status}）` : fallback;
}

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<unknown>}
 */
async function requestJson(url, init) {
  const response = await fetch(url, init);

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      /** @type {{ error?: string; details?: string }} */
      const body = await response.json();
      message = formatApiError(body, response.status, message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * @param {unknown} error
 * @param {string} fallback
 */
function showErrorToast(error, fallback) {
  const message = error instanceof Error ? error.message : fallback;
  showToast(message, 'error', 8000);
}

/**
 * @param {HTMLElement | null} el
 * @param {boolean} visible
 */
function setVisible(el, visible) {
  if (!el) {
    return;
  }
  el.classList.toggle('hidden', !visible);
}

/**
 * @param {{ serverId: string; action: 'connect' | 'disconnect' } | null} pending
 */
function setConnectionPending(pending) {
  connectionPending = pending;
  syncConnectionPendingUi();
}

function clearConnectionPending() {
  connectionPending = null;
  syncConnectionPendingUi();
}

/**
 * @param {string} serverId
 * @param {string} status
 * @returns {'connect' | 'disconnect' | null}
 */
function getPendingActionForServer(serverId, status) {
  if (!connectionPending || connectionPending.serverId !== serverId) {
    return null;
  }
  const isConnected = isServerConnected(status);
  if (connectionPending.action === 'connect' && !isConnected) {
    return 'connect';
  }
  if (connectionPending.action === 'disconnect' && isConnected) {
    return 'disconnect';
  }
  return null;
}

function syncConnectionPendingUi() {
  const pendingOnCurrent =
    connectionPending &&
    currentData?.currentServerId &&
    connectionPending.serverId === currentData.currentServerId;

  els.vDetail?.classList.toggle('is-connection-pending', Boolean(pendingOnCurrent));

  if (currentData?.currentServerId) {
    updateDetailBar(currentData);
    paintServerList(currentData.availableServers, currentData.currentServerId);
  }
}

/**
 * @param {'v-empty' | 'v-detail' | 'v-form'} viewId
 */
function showView(viewId) {
  for (const view of [els.vEmpty, els.vDetail, els.vForm]) {
    view?.classList.toggle('active', view?.id === viewId);
  }
}

/**
 * @param {string} pane
 */
function switchTab(pane) {
  document.querySelectorAll('.tabs button').forEach((btn) => {
    btn.classList.toggle('active', btn instanceof HTMLButtonElement && btn.dataset.pane === pane);
  });
  document.querySelectorAll('.pane').forEach((paneEl) => {
    paneEl.classList.toggle('active', paneEl.id === `pane-${pane}`);
  });
}

/**
 * @returns {void}
 */
export function initInfoApp() {
  setupConnectionTypeToggle();
  setupFormHandlers();
  setupShellHandlers();
  handleOAuthRedirectQuery();
  void fetchServerInfo();
}

function handleOAuthRedirectQuery() {
  const params = new URLSearchParams(window.location.search);
  const oauth = params.get('oauth');
  if (oauth === 'ok') {
    showToast('OAuth 授权成功', 'success');
  } else if (oauth === 'error') {
    const message = params.get('message') || 'OAuth 授权失败';
    showToast(message, 'error', 8000);
  }
  if (oauth) {
    params.delete('oauth');
    params.delete('message');
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }
}

/**
 * @param {string} serverId
 */
async function startOAuthAuthorization(serverId) {
  try {
    /** @type {{ authorizationUrl?: string }} */
    const data = await requestJson(`/api/server/${encodeURIComponent(serverId)}/oauth/authorize`);
    if (!data.authorizationUrl) {
      throw new Error('未返回授权 URL');
    }
    window.open(data.authorizationUrl, '_blank', 'noopener,noreferrer');
    showToast('已在浏览器打开授权页，完成后将自动回到本页', 'info', 6000);
  } catch (error) {
    showErrorToast(error, '无法发起 OAuth 授权');
  }
}

function setupShellHandlers() {
  els.serverSearch?.addEventListener('input', () => {
    searchQuery = els.serverSearch instanceof HTMLInputElement ? els.serverSearch.value : '';
    if (currentData) {
      paintServerList(currentData.availableServers, currentData.currentServerId);
    }
  });

  els.refreshListBtn?.addEventListener('click', () => {
    void reloadServerConfig();
  });

  document.querySelectorAll('.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn instanceof HTMLButtonElement && btn.dataset.pane) {
        switchTab(btn.dataset.pane);
      }
    });
  });

  els.goToolsTab?.addEventListener('click', (event) => {
    event.preventDefault();
    if (currentData?.server && isServerConnected(currentData.server.status)) {
      switchTab('tools');
    }
  });

  els.hConnBtn?.addEventListener('click', () => {
    if (!currentData?.currentServerId || connectionPending) {
      return;
    }
    const isConnected = isServerConnected(currentData.server.status);
    if (isConnected) {
      void disconnectServer(currentData.currentServerId);
    } else if (currentData.server.status === MCP_STATUS.NeedsAuth) {
      void startOAuthAuthorization(currentData.currentServerId);
    } else {
      void connectServer(currentData.currentServerId);
    }
  });

  els.hAuthBtn?.addEventListener('click', () => {
    if (!currentData?.currentServerId || connectionPending) {
      return;
    }
    void startOAuthAuthorization(currentData.currentServerId);
  });

  els.goEdit?.addEventListener('click', () => {
    if (currentData?.server) {
      showEditForm(currentData.server);
    }
  });

  els.goDel?.addEventListener('click', () => {
    if (currentData?.server) {
      void deleteServer(currentData.server.id, currentData.server.name);
    }
  });

  els.toolsAllOn?.addEventListener('click', () => {
    void bulkSetTools(true);
  });

  els.toolsAllOff?.addEventListener('click', () => {
    void bulkSetTools(false);
  });
}

function setupConnectionTypeToggle() {
  document.querySelectorAll('input[name="connection-type"]').forEach((radio) => {
    radio.addEventListener('change', function handleChange() {
      if (!(this instanceof HTMLInputElement)) {
        return;
      }
      const isStdio = this.value === 'STDIO';
      els.stdioBlock?.classList.toggle('on', isStdio);
      els.httpBlock?.classList.toggle('on', !isStdio);
    });
  });
}

/**
 * @param {string} [key]
 * @param {string} [value]
 */
function addHeaderRow(key = '', value = '') {
  if (!els.headersRows) {
    return;
  }

  const row = document.createElement('div');
  row.className = 'hdr-row';

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'header-row-key';
  keyInput.placeholder = '名称';
  keyInput.value = key;

  const valInput = document.createElement('input');
  valInput.type = 'text';
  valInput.className = 'header-row-value';
  valInput.placeholder = '值';
  valInput.value = value;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'icon-btn hdr-remove';
  removeBtn.title = '删除';
  removeBtn.innerHTML = '&times;';
  removeBtn.addEventListener('click', () => row.remove());

  row.appendChild(keyInput);
  row.appendChild(valInput);
  row.appendChild(removeBtn);
  els.headersRows.appendChild(row);
}

/**
 * @returns {Record<string, string> | undefined}
 */
function getHeadersFromRows() {
  /** @type {Record<string, string>} */
  const result = {};
  document.querySelectorAll('#headers-rows .hdr-row').forEach((row) => {
    const keyEl = row.querySelector('.header-row-key');
    const valEl = row.querySelector('.header-row-value');
    if (keyEl instanceof HTMLInputElement && valEl instanceof HTMLInputElement) {
      const key = keyEl.value.trim();
      const val = valEl.value.trim();
      if (key) {
        result[key] = val;
      }
    }
  });
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * @param {Record<string, string> | null | undefined} headers
 */
function setHeadersToRows(headers) {
  if (!els.headersRows) {
    return;
  }
  els.headersRows.innerHTML = '';
  if (headers) {
    Object.entries(headers).forEach(([k, v]) => addHeaderRow(k, v));
  }
}

function resetHeaders() {
  if (els.headersRows) {
    els.headersRows.innerHTML = '';
  }
}

function setupFormHandlers() {
  const hideForm = () => hideServerForm();

  els.formCancel?.addEventListener('click', hideForm);
  els.formBack?.addEventListener('click', hideForm);

  els.addServerBtn?.addEventListener('click', () => {
    if (els.formTitle) {
      els.formTitle.textContent = '新增服务器';
    }
    if (els.formMode instanceof HTMLInputElement) {
      els.formMode.value = 'add';
    }
    if (els.serverIdInput instanceof HTMLInputElement) {
      els.serverIdInput.value = '';
    }
    els.serverForm?.reset();
    resetHeaders();
    const stdioRadio = document.querySelector('input[name="connection-type"][value="STDIO"]');
    if (stdioRadio instanceof HTMLInputElement) {
      stdioRadio.checked = true;
    }
    els.stdioBlock?.classList.add('on');
    els.httpBlock?.classList.remove('on');
    showServerForm();
  });

  els.headersAddRow?.addEventListener('click', () => addHeaderRow());

  els.serverForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitServerForm();
  });
}

function showServerForm() {
  closeToolTestDrawer();
  showView('v-form');
}

function hideServerForm() {
  if (currentData?.currentServerId) {
    showView('v-detail');
  } else if (currentData?.availableServers?.length) {
    showView('v-detail');
  } else {
    showView('v-empty');
  }
}

/**
 * @param {ServerSummary} server
 */
function showEditForm(server) {
  if (els.formTitle) {
    els.formTitle.textContent = `编辑 · ${server.name}`;
  }
  if (els.formMode instanceof HTMLInputElement) {
    els.formMode.value = 'edit';
  }
  if (els.serverIdInput instanceof HTMLInputElement) {
    els.serverIdInput.value = server.id;
  }

  resetHeaders();

  const nameEl = document.getElementById('f-name');
  if (nameEl instanceof HTMLInputElement) {
    nameEl.value = server.name;
  }

  const connectionType = server.connectionDetails.connectionType;
  const typeRadio = document.querySelector(`input[name="connection-type"][value="${connectionType}"]`);
  if (typeRadio instanceof HTMLInputElement) {
    typeRadio.checked = true;
  }

  if (connectionType === 'STDIO') {
    els.stdioBlock?.classList.add('on');
    els.httpBlock?.classList.remove('on');
    const commandEl = document.getElementById('f-cmd');
    const argsEl = document.getElementById('f-args');
    if (commandEl instanceof HTMLInputElement) {
      commandEl.value = server.connectionDetails.command || '';
    }
    if (argsEl instanceof HTMLInputElement) {
      argsEl.value = server.connectionDetails.args || '';
    }
  } else {
    els.stdioBlock?.classList.remove('on');
    els.httpBlock?.classList.add('on');
    const mcpUrlEl = document.getElementById('f-url');
    if (mcpUrlEl instanceof HTMLInputElement) {
      mcpUrlEl.value = server.connectionDetails.mcpUrl || '';
    }
    setHeadersToRows(server.connectionDetails.headers || null);
  }

  showServerForm();
}

async function submitServerForm() {
  const mode = els.formMode instanceof HTMLInputElement ? els.formMode.value : 'add';
  const typeRadio = document.querySelector('input[name="connection-type"]:checked');
  const connectionType = typeRadio instanceof HTMLInputElement ? typeRadio.value : 'STDIO';

  const nameEl = document.getElementById('f-name');
  const name = nameEl instanceof HTMLInputElement ? nameEl.value.trim() : '';

  /** @type {{ name: string; connectionType: string; serverId?: string; command?: string; args?: string[]; mcpUrl?: string; headers?: Record<string, string> }} */
  const serverData = { name, connectionType };

  if (connectionType === 'STDIO') {
    const commandEl = document.getElementById('f-cmd');
    const argsEl = document.getElementById('f-args');
    const command = commandEl instanceof HTMLInputElement ? commandEl.value.trim() : '';
    const argsStr = argsEl instanceof HTMLInputElement ? argsEl.value.trim() : '';
    serverData.command = command;
    serverData.args = argsStr.split(',').map((arg) => arg.trim());
  } else {
    const mcpUrlEl = document.getElementById('f-url');
    serverData.mcpUrl = mcpUrlEl instanceof HTMLInputElement ? mcpUrlEl.value.trim() : '';
    serverData.headers = getHeadersFromRows() ?? {};
  }

  try {
    setVisible(els.loading, true);

    if (mode === 'add') {
      serverData.serverId = `server-${Date.now()}`;
      await requestJson('/api/server/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverData),
      });
    } else {
      const serverId = els.serverIdInput instanceof HTMLInputElement ? els.serverIdInput.value : '';
      await requestJson(`/api/server/update/${serverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverData),
      });
    }

    await reloadServerConfig();
  } catch (error) {
    console.error('服务器操作失败:', error);
    showErrorToast(error, '操作失败');
    setVisible(els.loading, false);
    showServerForm();
  }
}

/**
 * @param {string} serverId
 * @param {string} serverName
 */
async function deleteServer(serverId, serverName) {
  const confirmed = await confirmModal({
    title: '删除确认',
    message: `确定要删除服务器 "${serverName}" 吗？`,
    confirmLabel: '删除',
    cancelLabel: '取消',
    variant: 'danger',
  });

  if (!confirmed) {
    return;
  }

  try {
    setVisible(els.loading, true);
    await requestJson(`/api/server/delete/${serverId}`, { method: 'DELETE' });
    await reloadServerConfig();
  } catch (error) {
    console.error('删除服务器失败:', error);
    showErrorToast(error, '删除失败');
    setVisible(els.loading, false);
  }
}

/**
 * @param {ServerSummary[]} servers
 * @param {string | null} currentServerId
 */
function paintServerList(servers, currentServerId) {
  if (!els.serverList) {
    return;
  }

  const query = searchQuery.trim().toLowerCase();
  els.serverList.innerHTML = '';

  const filtered = servers.filter(
    (server) => !query || server.name.toLowerCase().includes(query)
  );

  filtered.forEach((server) => {
    const isConnected = isServerConnected(server.status);
    const needsAuth = server.status === MCP_STATUS.NeedsAuth;
    const row = document.createElement('div');
    row.className = `server-item${server.id === currentServerId ? ' active' : ''}`;
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.addEventListener('click', () => {
      void switchServer(server.id);
    });
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        void switchServer(server.id);
      }
    });

    const main = document.createElement('div');
    main.className = 'server-item-main';
    const dotVariant = isConnected ? 'on' : needsAuth ? 'warn' : 'off';
    main.innerHTML = `${renderStatusDotHtml(dotVariant)}<span class="server-item-name">${server.name}</span>`;

    const quick = document.createElement('button');
    quick.type = 'button';
    quick.className = `server-quick${isConnected ? ' on' : ''}`;
    quick.title = isConnected ? '断开' : needsAuth ? '授权' : '连接';
    quick.innerHTML = ICON_POWER;
    quick.setAttribute('data-requires-auth', '');
    quick.addEventListener('click', (event) => {
      event.stopPropagation();
      if (connectionPending) {
        return;
      }
      if (isConnected) {
        void disconnectServer(server.id);
      } else if (needsAuth) {
        void startOAuthAuthorization(server.id);
      } else {
        void connectServer(server.id);
      }
    });

    const pendingAction = getPendingActionForServer(server.id, server.status);
    if (pendingAction) {
      quick.className = 'server-quick is-loading';
      quick.title = pendingAction === 'connect' ? '连接中…' : '断开中…';
      quick.innerHTML = ICON_SPINNER;
      quick.disabled = true;
    }

    row.appendChild(main);
    row.appendChild(quick);
    els.serverList.appendChild(row);
  });
}

/**
 * @param {ToolInfo[]} tools
 * @param {Record<string, boolean>} preferences
 */
function paintEnabledToolsGrid(tools, preferences) {
  if (!els.gEnabledTools) {
    return;
  }

  const enabled = tools.filter((t) => isToolEnabled(preferences, t.name));

  if (!enabled.length) {
    els.gEnabledTools.innerHTML = '<div class="card-empty">暂无已启用工具</div>';
    return;
  }

  els.gEnabledTools.innerHTML = enabled
    .map(
      (t) => `<div class="enabled-tool-cell">
        <div class="enabled-tool-head">
          <span class="enabled-tool-name">${t.name}</span>
          ${t.codeName ? `<code class="enabled-tool-fn">${t.codeName}</code>` : ''}
        </div>
        <p class="enabled-tool-desc">${t.description}</p>
      </div>`
    )
    .join('');
}

/**
 * @param {ToolInfo[]} tools
 * @param {Record<string, boolean>} preferences
 * @param {boolean} isConnected
 */
function updateToolSummary(tools, preferences, isConnected) {
  if (!isConnected) {
    return;
  }

  const { enabled, total, ratio } = countEnabledTools(tools, preferences);

  if (els.hToolsRatio) {
    els.hToolsRatio.textContent = ratio;
  }
  if (els.toolsToolbarHint) {
    els.toolsToolbarHint.innerHTML = `已启用 <strong>${ratio}</strong>`;
  }
  if (els.hToolsBadge) {
    els.hToolsBadge.classList.toggle('all-on', total > 0 && enabled === total);
    els.hToolsBadge.classList.toggle('partial', total > 0 && enabled > 0 && enabled < total);
  }

  paintEnabledToolsGrid(tools, preferences);
}

/**
 * @param {InfoData} data
 * @param {boolean} isConnected
 */
function renderTools(data, isConnected) {
  if (!els.toolsBody) {
    return;
  }

  const serverId = data.currentServerId;
  const currentServerTools =
    data.serverTools && serverId ? data.serverTools[serverId] ?? [] : [];

  if (!isConnected || !serverId) {
    els.toolsBody.innerHTML = '';
    updateToolSummary([], {}, false);
    return;
  }

  const preferences = data.toolPreferences?.[serverId] ?? {};

  const refreshTools = () => {
    if (currentData) {
      renderTools(currentData, isServerConnected(currentData.server.status));
      updateToolSummary(currentServerTools, currentData.toolPreferences?.[serverId] ?? preferences, true);
    }
  };

  renderToolsPanel(els.toolsBody, {
    serverId,
    tools: currentServerTools,
    preferences,
    onPreferencesChange: async (nextPrefs) => {
      try {
        await requestJson(`/api/server/${encodeURIComponent(serverId)}/tool-preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences: nextPrefs }),
        });
        if (!currentData?.toolPreferences) {
          currentData.toolPreferences = {};
        }
        currentData.toolPreferences[serverId] = nextPrefs;
        refreshTools();
      } catch (error) {
        showErrorToast(error, '保存工具偏好失败');
        refreshTools();
      }
    },
  });

  updateToolSummary(currentServerTools, preferences, true);
}

/**
 * @param {InfoData} data
 * @param {boolean} isConnected
 */
function renderResourcesAndPrompts(data, isConnected) {
  const serverId = data.currentServerId;
  if (!isConnected || !serverId) {
    if (els.promptsBody) {
      els.promptsBody.innerHTML = '';
    }
    if (els.resourcesBody) {
      els.resourcesBody.innerHTML = '';
    }
    updateRpTabCount(els.tabPrompts, 0);
    updateRpTabCount(els.tabResources, 0);
    return;
  }

  const prompts = data.serverPrompts?.[serverId] ?? [];
  const resources = data.serverResources?.[serverId] ?? [];
  renderPromptsPanel(els.promptsBody, prompts, serverId);
  renderResourcesPanel(els.resourcesBody, resources, serverId);
  updateRpTabCount(els.tabPrompts, prompts.length);
  updateRpTabCount(els.tabResources, resources.length);
}

/**
 * @param {boolean} enabled
 */
async function bulkSetTools(enabled) {
  if (!currentData?.currentServerId || !isServerConnected(currentData.server.status)) {
    return;
  }

  const serverId = currentData.currentServerId;
  const tools = currentData.serverTools?.[serverId] ?? [];
  if (!tools.length) {
    return;
  }

  /** @type {Record<string, boolean>} */
  const nextPrefs = { ...(currentData.toolPreferences?.[serverId] ?? {}) };
  tools.forEach((t) => {
    nextPrefs[t.name] = enabled;
  });

  try {
    await requestJson(`/api/server/${encodeURIComponent(serverId)}/tool-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: nextPrefs }),
    });
    if (!currentData.toolPreferences) {
      currentData.toolPreferences = {};
    }
    currentData.toolPreferences[serverId] = nextPrefs;
    renderTools(currentData, true);
  } catch (error) {
    showErrorToast(error, '保存工具偏好失败');
  }
}

/**
 * @param {InfoData} data
 * @param {boolean} isConnected
 */
function applyConnectionState(data, isConnected) {
  for (const tab of [els.tabTools, els.tabPrompts, els.tabResources]) {
    tab?.classList.toggle('hidden', !isConnected);
  }
  setVisible(els.cardMcp, isConnected);
  setVisible(els.cardEnabledTools, isConnected);
  els.infoGrid?.classList.toggle('offline', !isConnected);

  if (!isConnected) {
    switchTab('general');
    renderResourcesAndPrompts(data, false);
  } else {
    if (els.gInternal) {
      els.gInternal.textContent = data.server.internalName || data.server.name || '—';
    }
    if (els.gVer) {
      els.gVer.textContent = data.server.version || '—';
    }
    renderTools(data, true);
    renderResourcesAndPrompts(data, true);
  }
}

/**
 * @param {InfoData} data
 */
function updateDetailBar(data) {
  const isConnected = isServerConnected(data.server.status);
  const needsAuth = data.server.status === MCP_STATUS.NeedsAuth;
  const pendingAction = getPendingActionForServer(data.server.id, data.server.status);

  if (els.hName) {
    els.hName.textContent = data.server.name;
  }

  if (els.hStatus) {
    let chipVariant = pendingAction ? 'pending' : serverStatusChipClass(data.server.status);
    let chipLabel = serverStatusLabel(data.server.status);
    if (pendingAction === 'connect') {
      chipLabel = '连接中';
    } else if (pendingAction === 'disconnect') {
      chipLabel = '断开中';
    }
    setStatusChipElement(els.hStatus, chipLabel, chipVariant);
  }

  if (els.hAuthBtn) {
    const showAuth = needsAuth || (data.server.usesOAuth && !isConnected && !pendingAction);
    els.hAuthBtn.classList.toggle('hidden', !showAuth);
    els.hAuthBtn.disabled = Boolean(connectionPending);
  }

  if (els.hConnBtn) {
    if (pendingAction === 'connect') {
      els.hConnBtn.textContent = '连接中…';
      els.hConnBtn.className = 'btn btn-primary is-loading';
      els.hConnBtn.disabled = true;
    } else if (pendingAction === 'disconnect') {
      els.hConnBtn.textContent = '断开中…';
      els.hConnBtn.className = 'btn is-loading';
      els.hConnBtn.disabled = true;
    } else if (isConnected) {
      els.hConnBtn.textContent = '断开连接';
      els.hConnBtn.className = 'btn';
      els.hConnBtn.disabled = Boolean(connectionPending);
    } else if (needsAuth) {
      els.hConnBtn.textContent = '重新连接';
      els.hConnBtn.className = 'btn btn-primary';
      els.hConnBtn.disabled = Boolean(connectionPending);
    } else {
      els.hConnBtn.textContent = '连接';
      els.hConnBtn.className = 'btn btn-primary';
      els.hConnBtn.disabled = Boolean(connectionPending);
    }
  }

  const connectionType = data.server.connectionDetails.connectionType;
  let connectionTypeName = connectionType || '未知';
  if (connectionType === 'STDIO') {
    connectionTypeName = 'Stdio';
  } else if (connectionType === 'HTTP') {
    connectionTypeName = 'HTTP';
  }

  if (els.gId) {
    els.gId.textContent = data.server.id;
  }
  if (els.gType) {
    els.gType.textContent = connectionTypeName;
  }
  if (els.gCmdLabel) {
    els.gCmdLabel.textContent = connectionType === 'HTTP' ? '端点 URL' : '启动命令';
  }
  if (els.gCmd) {
    els.gCmd.textContent = data.server.connectionDetails.displayCommand || '';
  }
}

/**
 * @param {InfoData} data
 */
function updatePageInfo(data) {
  currentData = data;
  closeToolTestDrawer();
  resetToolsPanelState();

  paintServerList(data.availableServers, data.currentServerId);

  const isConnected = isServerConnected(data.server.status);

  if (data.currentServerId) {
    showView('v-detail');
    updateDetailBar(data);
    applyConnectionState(data, isConnected);
  } else {
    showView('v-empty');
  }

  setVisible(els.loading, false);
  setVisible(els.appShell, true);
}

/**
 * 未登录只读：仅切换前端展示，不调用写接口。
 * @param {string} serverId
 */
function selectServerViewLocally(serverId) {
  if (!currentData?.availableServers) {
    return;
  }

  const server = currentData.availableServers.find((item) => item.id === serverId);
  if (!server) {
    return;
  }

  updatePageInfo({
    ...currentData,
    currentServerId: serverId,
    server,
  });
}

/**
 * @param {string} serverId
 */
async function switchServer(serverId) {
  closeToolTestDrawer();
  resetToolsPanelState();

  try {
    setVisible(els.loading, true);

    /** @type {InfoData} */
    const data = await requestJson(`/api/server/switch/${serverId}`, { method: 'POST' });
    updatePageInfo(data);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      selectServerViewLocally(serverId);
      setVisible(els.loading, false);
      return;
    }
    console.error('切换服务器失败:', error);
    showLoadingError(error instanceof Error ? error.message : '切换服务器失败');
  }
}

/**
 * @param {InfoData} data
 * @param {string} serverId
 * @returns {string}
 */
function resolveServerStatus(data, serverId) {
  const row = data.availableServers?.find((item) => item.id === serverId);
  return row?.status ?? data.server.status;
}

/**
 * @param {string} serverId
 */
async function connectServer(serverId) {
  if (connectionPending) {
    return;
  }

  setConnectionPending({ serverId, action: 'connect' });

  try {
    /** @type {InfoData} */
    const data = await requestJson(`/api/server/connect/${serverId}`, { method: 'POST' });
    const status = resolveServerStatus(data, serverId);

    if (!isServerConnected(status)) {
      if (status === MCP_STATUS.NeedsAuth) {
        updatePageInfo(data);
        showToast('该服务器需要 OAuth 授权，请点击「授权」', 'info', 6000);
        return;
      }
      throw new Error('服务器连接未成功建立');
    }

    updatePageInfo(data);
  } catch (error) {
    console.error('连接服务器失败:', error);
    showErrorToast(error, '连接服务器失败');
  } finally {
    clearConnectionPending();
  }
}

/**
 * @param {string} serverId
 */
async function disconnectServer(serverId) {
  if (connectionPending) {
    return;
  }

  setConnectionPending({ serverId, action: 'disconnect' });

  try {
    /** @type {InfoData} */
    const data = await requestJson(`/api/server/disconnect/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    updatePageInfo(data);
  } catch (error) {
    console.error('断开服务器连接失败:', error);
    showErrorToast(error, '断开服务器连接失败');
  } finally {
    clearConnectionPending();
  }
}

/**
 * @returns {{ serverId: string, tab: string }}
 */
function readUrlIntent() {
  const params = new URLSearchParams(window.location.search);
  return {
    serverId: params.get('serverId') ?? '',
    tab: params.get('tab') ?? '',
  };
}

/**
 * 处理 ?serverId=&tab=tools 深链（来自聊天页 MCP 弹窗）
 */
async function applyUrlIntent() {
  const { serverId, tab } = readUrlIntent();
  if (!serverId || !currentData?.availableServers?.some((server) => server.id === serverId)) {
    return;
  }

  if (currentData.currentServerId !== serverId) {
    await switchServer(serverId);
  }

  if (tab === 'tools' && currentData?.server && isServerConnected(currentData.server.status)) {
    switchTab('tools');
  }
}

/**
 * @param {{ silent?: boolean }} [options]
 */
async function fetchServerInfo(options = {}) {
  const { silent = false } = options;

  try {
    if (!silent) {
      setVisible(els.loading, true);
    }

    /** @type {InfoData} */
    const data = await requestJson('/api/info');

    if (data.availableServers && data.availableServers.length > 0) {
      if (data.currentServerId) {
        updatePageInfo(data);
        await applyUrlIntent();
      } else {
        await switchServer(data.availableServers[0].id);
        await applyUrlIntent();
      }
    } else {
      currentData = data;
      paintServerList([], null);
      setVisible(els.loading, false);
      setVisible(els.appShell, true);
      showView('v-empty');
    }
  } catch (error) {
    console.error('获取服务信息失败:', error);
    showLoadingError(error instanceof Error ? error.message : '获取服务信息失败');
  }
}

async function reloadServerConfig() {
  try {
    setVisible(els.loading, true);

    /** @type {InfoData} */
    const data = await requestJson('/api/server/reload-config', { method: 'POST' });
    updatePageInfo(data);
  } catch (error) {
    console.error('重新加载配置失败:', error);
    showErrorToast(error, '重新加载配置失败');
    await fetchServerInfo();
  }
}

/**
 * @param {string} message
 */
function showLoadingError(message) {
  if (!els.loading) {
    return;
  }
  els.loading.innerHTML = `<div class="error-panel"><p>获取服务信息失败: ${message}</p></div>`;
  setVisible(els.loading, true);
  setVisible(els.appShell, false);
}
