/**
 * Web 聊天 MCP 选择 — `enabledServerIds` 为唯一 SSOT（localStorage）。
 * 保存时嗅探，仅持久化「连上且启用工具>0」的 reachableIds。
 */

export const MCP_CHECKBOX_PREFIX = 'mcp-server-';

/** @param {string[]} enabledIds @param {string} serverId */
export function isMcpServerEnabled(enabledIds, serverId) {
  return enabledIds.includes(serverId);
}

/** @param {string[]} enabledIds @param {{ id: string }[]} servers */
export function filterEnabledToKnownServers(enabledIds, servers) {
  const known = new Set(servers.map((server) => server.id));
  return enabledIds.filter((id) => known.has(id));
}

/** @param {string[]} enabledIds @param {{ id: string, toolsEnabled?: number }[]} servers */
export function filterServersWithUsableTools(enabledIds, servers) {
  const byId = new Map(servers.map((server) => [server.id, server]));
  return enabledIds.filter((id) => {
    const server = byId.get(id);
    if (!server) {
      return false;
    }
    const enabled = typeof server.toolsEnabled === 'number' ? server.toolsEnabled : 0;
    return enabled > 0;
  });
}

/**
 * 列表刷新后对齐 localStorage：去掉无启用工具的服。
 * @param {object} app
 * @param {{ saveMcpServerIds?: () => void, updateMCPButtonCounter?: () => void }} ui
 */
export function reconcileMcpSelectionFromList(app, ui) {
  const servers = app.state.mcpServers || [];
  const before = filterEnabledToKnownServers(app.state.enabledServerIds || [], servers);
  const after = filterServersWithUsableTools(before, servers);
  const changed = after.length !== before.length || after.some((id, index) => id !== before[index]);
  if (changed) {
    app.state.enabledServerIds = after;
    ui.saveMcpServerIds?.();
    ui.updateMCPButtonCounter?.();
  }
  return after;
}

/**
 * @param {object} app
 * @param {string[]} enabledIds 嗅探后的 reachableIds
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

/** @param {{ id: string }[]} servers @param {string[]} enabledIds */
export function syncMcpCheckboxes(servers, enabledIds) {
  const enabled = new Set(enabledIds);
  for (const server of servers) {
    const checkbox = document.getElementById(`${MCP_CHECKBOX_PREFIX}${server.id}`);
    if (checkbox instanceof HTMLInputElement) {
      checkbox.checked = enabled.has(server.id);
    }
  }
}

/** @param {{ id: string }[]} servers */
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
