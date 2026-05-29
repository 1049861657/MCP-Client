import { confirmModal } from '../shared/ui/modal.js';
import { showToast } from '../shared/ui/toast.js';

/** @typedef {{ id: string; name: string; status: string; connectionDetails: ConnectionDetails }} ServerSummary */
/** @typedef {{ connectionType: string; command?: string; args?: string; mcpUrl?: string; headers?: Record<string, string>; displayCommand?: string }} ConnectionDetails */
/** @typedef {{ name: string; codeName?: string; description: string; parameters?: ToolParameter[] }} ToolInfo */
/** @typedef {{ name: string; type: string; description: string; required: boolean }} ToolParameter */
/** @typedef {{ availableServers: ServerSummary[]; currentServerId: string | null; server: ServerSummary; serverTools: Record<string, ToolInfo[]> }} InfoData */

const els = {
  loading: document.getElementById('loading'),
  serversSelector: document.getElementById('servers-selector'),
  serverTabsList: document.getElementById('server-tabs-list'),
  addServerBtn: document.getElementById('add-server-btn'),
  serverFormContainer: document.getElementById('server-form-container'),
  serverForm: document.getElementById('server-form'),
  cancelFormBtn: document.getElementById('cancel-form'),
  formTitle: document.getElementById('form-title'),
  formMode: document.getElementById('form-mode'),
  serverIdInput: document.getElementById('server-id'),
  stdioFields: document.getElementById('stdio-fields'),
  httpFields: document.getElementById('http-fields'),
  headersRows: document.getElementById('headers-rows'),
  headersAddRow: document.getElementById('headers-add-row'),
  serverInfo: document.getElementById('server-info'),
  serverConnectedInfo: document.getElementById('server-connected-info'),
  serverInternalName: document.getElementById('server-internal-name'),
  serverVersion: document.getElementById('server-version'),
  serverConnectionType: document.getElementById('server-connection-type'),
  serverCommand: document.getElementById('server-command'),
  connectionToggle: document.getElementById('connection-toggle'),
  toolsInfo: document.getElementById('tools-info'),
  toolsContainer: document.getElementById('tools-container'),
};

/** @type {InfoData | null} */
let currentData = null;

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
 * @returns {void}
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
 * @returns {void}
 */
export function initInfoApp() {
  setupConnectionTypeToggle();
  setupFormHandlers();
  void fetchServerInfo();
}

/**
 * @returns {void}
 */
function setupConnectionTypeToggle() {
  document.querySelectorAll('input[name="connection-type"]').forEach((radio) => {
    radio.addEventListener('change', function handleChange() {
      if (!(this instanceof HTMLInputElement)) {
        return;
      }
      const isStdio = this.value === 'STDIO';
      setVisible(els.stdioFields, isStdio);
      setVisible(els.httpFields, !isStdio);
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
  row.className = 'header-row';

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'header-row-key';
  keyInput.placeholder = '例如: Authorization';
  keyInput.value = key;

  const valInput = document.createElement('input');
  valInput.type = 'text';
  valInput.className = 'header-row-value';
  valInput.placeholder = '例如: Bearer token';
  valInput.value = value;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove-row';
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
  document.querySelectorAll('#headers-rows .header-row').forEach((row) => {
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

/**
 * @returns {void}
 */
function setupFormHandlers() {
  els.cancelFormBtn?.addEventListener('click', hideServerForm);

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
    setVisible(els.stdioFields, true);
    setVisible(els.httpFields, false);
    showServerForm();
  });

  els.headersAddRow?.addEventListener('click', () => addHeaderRow());

  els.serverForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitServerForm();
  });
}

/**
 * @returns {void}
 */
function showServerForm() {
  setVisible(els.serverFormContainer, true);
  setVisible(els.serverInfo, false);
  setVisible(els.toolsInfo, false);
}

/**
 * @returns {void}
 */
function hideServerForm() {
  setVisible(els.serverFormContainer, false);
  if (currentData) {
    setVisible(els.serverInfo, true);
    if (currentData.server.status === '已连接') {
      setVisible(els.toolsInfo, true);
    }
  }
}

/**
 * @param {ServerSummary} server
 */
function showEditForm(server) {
  if (els.formTitle) {
    els.formTitle.textContent = `编辑服务器: ${server.name}`;
  }
  if (els.formMode instanceof HTMLInputElement) {
    els.formMode.value = 'edit';
  }
  if (els.serverIdInput instanceof HTMLInputElement) {
    els.serverIdInput.value = server.id;
  }

  resetHeaders();

  const nameEl = document.getElementById('server-name');
  if (nameEl instanceof HTMLInputElement) {
    nameEl.value = server.name;
  }

  const connectionType = server.connectionDetails.connectionType;
  const typeRadio = document.querySelector(`input[name="connection-type"][value="${connectionType}"]`);
  if (typeRadio instanceof HTMLInputElement) {
    typeRadio.checked = true;
  }

  if (connectionType === 'STDIO') {
    setVisible(els.stdioFields, true);
    setVisible(els.httpFields, false);
    const commandEl = document.getElementById('command');
    const argsEl = document.getElementById('args');
    if (commandEl instanceof HTMLInputElement) {
      commandEl.value = server.connectionDetails.command || '';
    }
    if (argsEl instanceof HTMLInputElement) {
      argsEl.value = server.connectionDetails.args || '';
    }
  } else {
    setVisible(els.stdioFields, false);
    setVisible(els.httpFields, true);
    const mcpUrlEl = document.getElementById('mcp-url');
    if (mcpUrlEl instanceof HTMLInputElement) {
      mcpUrlEl.value = server.connectionDetails.mcpUrl || '';
    }
    setHeadersToRows(server.connectionDetails.headers || null);
  }

  showServerForm();
}

/**
 * @returns {Promise<void>}
 */
async function submitServerForm() {
  const mode = els.formMode instanceof HTMLInputElement ? els.formMode.value : 'add';
  const typeRadio = document.querySelector('input[name="connection-type"]:checked');
  const connectionType = typeRadio instanceof HTMLInputElement ? typeRadio.value : 'STDIO';

  const nameEl = document.getElementById('server-name');
  const name = nameEl instanceof HTMLInputElement ? nameEl.value.trim() : '';

  /** @type {{ name: string; connectionType: string; serverId?: string; command?: string; args?: string[]; mcpUrl?: string; headers?: Record<string, string> }} */
  const serverData = { name, connectionType };

  if (connectionType === 'STDIO') {
    const commandEl = document.getElementById('command');
    const argsEl = document.getElementById('args');
    const command = commandEl instanceof HTMLInputElement ? commandEl.value.trim() : '';
    const argsStr = argsEl instanceof HTMLInputElement ? argsEl.value.trim() : '';
    serverData.command = command;
    serverData.args = argsStr.split(',').map((arg) => arg.trim());
  } else {
    const mcpUrlEl = document.getElementById('mcp-url');
    serverData.mcpUrl = mcpUrlEl instanceof HTMLInputElement ? mcpUrlEl.value.trim() : '';
    const headers = getHeadersFromRows();
    if (headers) {
      serverData.headers = headers;
    }
  }

  try {
    setVisible(els.loading, true);
    setVisible(els.serverFormContainer, false);
    setVisible(els.serverInfo, false);
    setVisible(els.toolsInfo, false);

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

    hideServerForm();
    await reloadServerConfig();
  } catch (error) {
    console.error('服务器操作失败:', error);
    showErrorToast(error, '操作失败');
    setVisible(els.loading, false);
    setVisible(els.serverFormContainer, true);
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
  });

  if (!confirmed) {
    return;
  }

  try {
    setVisible(els.loading, true);
    setVisible(els.serverInfo, false);
    setVisible(els.toolsInfo, false);

    await requestJson(`/api/server/delete/${serverId}`, { method: 'DELETE' });
    await reloadServerConfig();
  } catch (error) {
    console.error('删除服务器失败:', error);
    showErrorToast(error, '删除失败');
    setVisible(els.loading, false);
    if (currentData) {
      setVisible(els.serverInfo, true);
      if (currentData.server.status === '已连接') {
        setVisible(els.toolsInfo, true);
      }
    }
  }
}

/**
 * @param {InfoData} data
 */
function updatePageInfo(data) {
  currentData = data;

  updateServerTabs(data.availableServers, data.currentServerId);

  const isConnected = data.server.status === '已连接';

  if (isConnected) {
    setVisible(els.serverConnectedInfo, true);
    if (els.serverInternalName) {
      els.serverInternalName.textContent = data.server.internalName || data.server.name;
    }
    if (els.serverVersion) {
      els.serverVersion.textContent = data.server.version || '';
    }
  } else {
    setVisible(els.serverConnectedInfo, false);
  }

  if (els.connectionToggle instanceof HTMLInputElement) {
    els.connectionToggle.onchange = null;
    els.connectionToggle.checked = isConnected;
    els.connectionToggle.disabled = false;
    els.connectionToggle.onchange = function handleToggle() {
      if (!(this instanceof HTMLInputElement)) {
        return;
      }
      if (this.checked) {
        void connectServer(data.server.id);
      } else {
        void disconnectServer(data.server.id);
      }
    };
  }

  setVisible(els.toolsInfo, isConnected);

  const connectionType = data.server.connectionDetails.connectionType;
  let connectionTypeName = connectionType || '未知';
  if (connectionType === 'STDIO') {
    connectionTypeName = 'Stdio (标准输入输出)';
  } else if (connectionType === 'HTTP') {
    connectionTypeName = '远程 HTTP（MCP Streamable HTTP）';
  }

  if (els.serverConnectionType) {
    els.serverConnectionType.textContent = connectionTypeName;
  }
  if (els.serverCommand) {
    els.serverCommand.textContent = data.server.connectionDetails.displayCommand || '';
  }

  renderTools(data, isConnected);

  setVisible(els.loading, false);
  setVisible(els.serversSelector, true);
  setVisible(els.serverInfo, true);
  setVisible(els.toolsInfo, isConnected);
}

/**
 * @param {InfoData} data
 * @param {boolean} isConnected
 */
function renderTools(data, isConnected) {
  if (!els.toolsContainer) {
    return;
  }

  const currentServerTools =
    data.serverTools && data.currentServerId ? data.serverTools[data.currentServerId] : [];

  if (isConnected && currentServerTools && currentServerTools.length > 0) {
    const toolsList = document.createElement('ul');
    toolsList.className = 'tool-list';

    currentServerTools.forEach((tool) => {
      const toolItem = document.createElement('li');
      toolItem.className = 'tool-item';

      const toolHeader = document.createElement('div');
      toolHeader.className = 'tool-header';

      const toolName = document.createElement('div');
      toolName.className = 'tool-name';
      toolName.textContent = tool.name;

      if (tool.codeName) {
        const codeNameSpan = document.createElement('span');
        codeNameSpan.className = 'tool-code-name';
        codeNameSpan.textContent = ` (${tool.codeName})`;
        toolName.appendChild(codeNameSpan);
      }

      toolHeader.appendChild(toolName);
      toolItem.appendChild(toolHeader);

      const toolDesc = document.createElement('p');
      toolDesc.textContent = tool.description;
      toolItem.appendChild(toolDesc);

      if (tool.parameters && tool.parameters.length > 0) {
        const table = document.createElement('table');
        table.className = 'param-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        for (const text of ['参数名', '类型', '描述', '是否必需']) {
          const th = document.createElement('th');
          th.textContent = text;
          headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        tool.parameters.forEach((param) => {
          const row = document.createElement('tr');
          for (const value of [param.name, param.type, param.description, param.required ? '是' : '否']) {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
          }
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        toolItem.appendChild(table);
      }

      toolsList.appendChild(toolItem);
    });

    els.toolsContainer.innerHTML = '';
    els.toolsContainer.appendChild(toolsList);
  } else {
    els.toolsContainer.textContent = '没有可用的工具';
  }
}

/**
 * @param {ServerSummary[]} servers
 * @param {string | null} currentServerId
 */
function updateServerTabs(servers, currentServerId) {
  if (!els.serverTabsList) {
    return;
  }

  els.serverTabsList.innerHTML = '';

  if (!servers || !Array.isArray(servers)) {
    return;
  }

  servers.forEach((server) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'server-tab';
    tab.setAttribute('role', 'tab');
    if (server.id === currentServerId) {
      tab.classList.add('active');
    }

    const serverName = document.createElement('span');
    serverName.textContent = server.name;
    tab.appendChild(serverName);

    const statusBadge = document.createElement('span');
    statusBadge.className = `server-status-badge ${server.status === '已连接' ? 'server-status-connected' : 'server-status-disconnected'}`;
    tab.appendChild(statusBadge);

    const actionContainer = document.createElement('span');
    actionContainer.className = 'server-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'server-action-btn edit-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = '编辑服务器';
    editBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      showEditForm(server);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'server-action-btn delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = '删除服务器';
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      void deleteServer(server.id, server.name);
    });

    actionContainer.appendChild(editBtn);
    actionContainer.appendChild(deleteBtn);
    tab.appendChild(actionContainer);

    tab.addEventListener('click', () => {
      void switchServer(server.id);
    });

    els.serverTabsList.appendChild(tab);
  });
}

/**
 * @param {string} serverId
 */
async function switchServer(serverId) {
  if (els.serverFormContainer && !els.serverFormContainer.classList.contains('hidden')) {
    setVisible(els.serverFormContainer, false);
  }

  try {
    setVisible(els.loading, true);
    setVisible(els.serverInfo, false);
    setVisible(els.toolsInfo, false);

    /** @type {InfoData} */
    const data = await requestJson(`/api/server/switch/${serverId}`, { method: 'POST' });
    updatePageInfo(data);
  } catch (error) {
    console.error('切换服务器失败:', error);
    showLoadingError(error instanceof Error ? error.message : '切换服务器失败');
  }
}

/**
 * @param {string} serverId
 */
async function connectServer(serverId) {
  if (!(els.connectionToggle instanceof HTMLInputElement)) {
    return;
  }

  try {
    els.connectionToggle.disabled = true;

    /** @type {InfoData} */
    const data = await requestJson(`/api/server/connect/${serverId}`, { method: 'POST' });

    if (data.server.status !== '已连接') {
      throw new Error('服务器连接未成功建立');
    }

    await updateServerActiveStatus(serverId, true);
    await fetchServerInfo();
  } catch (error) {
    console.error('连接服务器失败:', error);
    els.connectionToggle.disabled = false;
    els.connectionToggle.checked = false;
    showErrorToast(error, '连接服务器失败');
  }
}

/**
 * @param {string} serverId
 */
async function disconnectServer(serverId) {
  if (!(els.connectionToggle instanceof HTMLInputElement)) {
    return;
  }

  try {
    els.connectionToggle.disabled = true;

    await requestJson(`/api/server/disconnect/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    await updateServerActiveStatus(serverId, false);
    await fetchServerInfo();
  } catch (error) {
    console.error('断开服务器连接失败:', error);
    els.connectionToggle.disabled = false;
    els.connectionToggle.checked = true;
    showErrorToast(error, '断开服务器连接失败');
  }
}

/**
 * @param {string} serverId
 * @param {boolean} isActive
 */
async function updateServerActiveStatus(serverId, isActive) {
  try {
    await requestJson(`/api/server/update/${serverId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
  } catch {
    /* non-fatal */
  }
}

/**
 * @returns {Promise<void>}
 */
async function fetchServerInfo() {
  try {
    setVisible(els.loading, true);
    setVisible(els.serverInfo, false);
    setVisible(els.toolsInfo, false);

    /** @type {InfoData} */
    const data = await requestJson('/api/info');

    if (data.availableServers && data.availableServers.length > 0) {
      if (data.currentServerId) {
        updatePageInfo(data);
      } else {
        await switchServer(data.availableServers[0].id);
      }
    } else {
      updateServerTabs([], null);
      setVisible(els.loading, false);
      setVisible(els.serversSelector, true);
    }
  } catch (error) {
    console.error('获取服务信息失败:', error);
    showLoadingError(error instanceof Error ? error.message : '获取服务信息失败');
  }
}

/**
 * @returns {Promise<void>}
 */
async function reloadServerConfig() {
  try {
    setVisible(els.loading, true);
    setVisible(els.serverInfo, false);
    setVisible(els.toolsInfo, false);

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
}
