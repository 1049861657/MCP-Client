/**
 * Web 聊天 MCP 选择 — 单一状态源 `app.state.enabledServerIds`。
 * UI 只读/写入该数组；禁止在 server 对象上挂 isEnabled。
 */

const MCP_CHECKBOX_PREFIX = 'mcp-server-';

/**
 * @param {string[]} enabledIds
 * @param {string} serverId
 * @returns {boolean}
 */
export function isMcpServerEnabled(enabledIds, serverId) {
  return enabledIds.includes(serverId);
}

/**
 * @param {string[]} enabledIds
 * @param {{ id: string }[]} servers
 * @returns {string[]}
 */
export function filterEnabledToKnownServers(enabledIds, servers) {
  const known = new Set(servers.map((server) => server.id));
  return enabledIds.filter((id) => known.has(id));
}

/**
 * @param {object} app
 * @param {string[]} enabledIds
 * @param {{ saveMcpServerIds?: Function, updateMCPButtonCounter?: Function }} ui
 * @returns {string[]}
 */
export function commitMcpSelection(app, enabledIds, ui) {
  const committed = filterEnabledToKnownServers(enabledIds, app.state.mcpServers || []);
  app.state.enabledServerIds = committed;
  ui.saveMcpServerIds?.();
  ui.updateMCPButtonCounter?.();
  return committed;
}

/**
 * @param {{ id: string }[]} servers
 * @param {string[]} enabledIds
 */
export function syncMcpCheckboxes(servers, enabledIds) {
  const enabled = new Set(enabledIds);
  for (const server of servers) {
    const checkbox = document.getElementById(`${MCP_CHECKBOX_PREFIX}${server.id}`);
    if (checkbox instanceof HTMLInputElement) {
      checkbox.checked = enabled.has(server.id);
    }
  }
}

/**
 * @param {{ id: string }[]} servers
 * @returns {string[]}
 */
export function readEnabledIdsFromMcpCheckboxes(servers) {
  const enabledIds = [];
  for (const server of servers) {
    const checkbox = document.getElementById(`${MCP_CHECKBOX_PREFIX}${server.id}`);
    if (checkbox instanceof HTMLInputElement && checkbox.checked) {
      enabledIds.push(server.id);
    }
  }
  return enabledIds;
}

export { MCP_CHECKBOX_PREFIX };
