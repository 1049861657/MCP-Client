/**
 * Web 聊天 MCP 选择 — 状态源 `app.state.enabledServerIds`。
 * 仅 `commitMcpSelection` 写入状态与 localStorage；`loadMCPServers` 只刷新目录。
 */

export const MCP_CHECKBOX_PREFIX = 'mcp-server-';

/**
 * @param {string[]} enabledIds
 * @param {string} serverId
 */
export function isMcpServerEnabled(enabledIds, serverId) {
  return enabledIds.includes(serverId);
}

/**
 * @param {string[]} enabledIds
 * @param {{ id: string }[]} servers
 */
export function filterEnabledToKnownServers(enabledIds, servers) {
  const known = new Set(servers.map((server) => server.id));
  return enabledIds.filter((id) => known.has(id));
}

/**
 * @param {object} app
 * @param {string[]} enabledIds
 * @param {{ saveMcpServerIds?: () => void, updateMCPButtonCounter?: () => void }} ui
 */
export function commitMcpSelection(app, enabledIds, ui) {
  const servers = app.state.mcpServers || [];
  if (servers.length === 0) {
    throw new Error('MCP 服务器列表未就绪，无法保存选择');
  }

  const committed = filterEnabledToKnownServers(enabledIds, servers);
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
