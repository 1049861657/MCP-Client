/**
 * Web 聊天 MCP 选择 — `enabledServerIds` 为唯一 SSOT（localStorage）。
 * 可选列表仅含账号配置中已启用的 MCP（API scope=pool-enabled）。
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

/**
 * 顶栏 MCP 数量：与用户勾选（enabledServerIds）一致，不要求 toolsEnabled>0。
 * 实际发消息时由 getSelectableMcpServerIds 再过滤可用工具。
 * @param {string[]} enabledIds @param {{ id: string }[]} servers
 */
export function countKnownEnabledMcpServers(enabledIds, servers) {
  return filterEnabledToKnownServers(enabledIds, servers).length;
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
