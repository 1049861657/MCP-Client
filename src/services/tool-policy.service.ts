import { createHash } from 'node:crypto';

import { isSystemTool } from '../core/agent-harness/system-tools/system-tool-registry.js';
import type { ChatTool } from '../core/agent-harness/types.js';
import { mcpClient } from '../core/mcp/index.js';
import type { ResolvedChatProfile } from '../types/config-plane.types.js';
import type { ToolInfo } from '../types/mcp.types.js';
import type { McpToolPreferencesStore } from '../types/tool-preferences.types.js';
import { ToolPreferencesService } from './tool-preferences.service.js';

/** 工具启用策略 SSOT：Schema / Prompt / Web 入站 / 执行层共用 */
export class ToolPolicyService {
  /** 未显式写入 preference 时视为启用（opt-out 产品语义） */
  static isToolEnabled(
    store: McpToolPreferencesStore,
    serverId: string,
    toolName: string
  ): boolean {
    const serverPrefs = store[serverId];
    if (!serverPrefs || serverPrefs[toolName] === undefined) {
      return true;
    }
    return serverPrefs[toolName];
  }

  static resolveEnabledCodeNames(
    serverIds: string[],
    serverTools: Record<string, ToolInfo[]>,
    store: McpToolPreferencesStore
  ): string[] {
    const codeNames: string[] = [];
    for (const serverId of serverIds) {
      for (const tool of serverTools[serverId] ?? []) {
        if (this.isToolEnabled(store, serverId, tool.name)) {
          codeNames.push(tool.codeName);
        }
      }
    }
    return codeNames;
  }

  static buildEnabledSetHash(serverIds: string[], enabledCodeNames: string[]): string {
    const payload = JSON.stringify({
      serverIds: [...serverIds].sort(),
      toolCodeNames: [...enabledCodeNames].sort()
    });
    return createHash('sha256').update(payload).digest('hex').slice(0, 16);
  }

  /** 从本轮发给 LLM 的 chatTools 构建可执行白名单（function.name = codeName） */
  static buildAllowedCodeNames(chatTools: ChatTool[]): Set<string> {
    const allowed = new Set<string>();
    for (const tool of chatTools) {
      const name = tool.function?.name;
      if (typeof name === 'string' && name.length > 0) {
        allowed.add(name);
      }
    }
    return allowed;
  }

  /**
   * 执行层硬拦截：必须在 chatTools 白名单内（system 工具由 ToolsConfig 单独控制）
   */
  static assertToolCallable(
    codeName: string,
    allowedCodeNames: Set<string>
  ): { allowed: true } | { allowed: false; message: string } {
    if (isSystemTool(codeName)) {
      return { allowed: true };
    }
    if (allowedCodeNames.has(codeName)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      message:
        `工具「${codeName}」未启用或未在本轮可用工具列表中，无法执行。` +
        '请仅调用系统提示中「启用工具（摘要）」列出的工具。'
    };
  }

  /** 按 Profile + toolPreferences 解析启用工具 codeName */
  static async resolveEnabledCodeNamesForProfile(
    resolvedProfile?: Pick<ResolvedChatProfile, 'mcpServerIds' | 'enabledToolNames'>
  ): Promise<string[] | undefined> {
    if (resolvedProfile?.enabledToolNames !== undefined) {
      return [...resolvedProfile.enabledToolNames];
    }
    const serverIds = resolvedProfile?.mcpServerIds;
    if (!serverIds?.length) {
      return undefined;
    }
    const [serverInfo, store] = await Promise.all([
      mcpClient.getServerInfo(),
      ToolPreferencesService.getAll()
    ]);
    return this.resolveEnabledCodeNames(
      serverIds,
      serverInfo.serverTools ?? {},
      store
    );
  }

  /** Web 入站 enabledToolNames：仅保留指定服务器上已启用的 MCP 工具 */
  static async sanitizeWebEnabledToolNames(
    names: string[],
    mcpServerIds: string[]
  ): Promise<string[]> {
    if (!mcpServerIds.length) {
      return [];
    }
    const enabled = await this.resolveEnabledCodeNamesForProfile({ mcpServerIds });
    if (!enabled?.length) {
      return [];
    }
    const allowed = new Set(enabled);
    return names.filter((name) => allowed.has(name));
  }

  static collectEnabledTools(
    serverIds: string[],
    serverTools: Record<string, ToolInfo[]>,
    store: McpToolPreferencesStore
  ): ToolInfo[] {
    const enabledTools: ToolInfo[] = [];
    for (const serverId of serverIds) {
      for (const tool of serverTools[serverId] ?? []) {
        if (this.isToolEnabled(store, serverId, tool.name)) {
          enabledTools.push(tool);
        }
      }
    }
    return enabledTools;
  }

  static countEnabledTools(
    serverId: string,
    serverTools: Record<string, ToolInfo[]>,
    store: McpToolPreferencesStore
  ): { enabled: number; total: number } {
    const tools = serverTools[serverId] ?? [];
    let enabled = 0;
    for (const tool of tools) {
      if (this.isToolEnabled(store, serverId, tool.name)) {
        enabled += 1;
      }
    }
    return { enabled, total: tools.length };
  }

  static async collectEnabledToolsForServerIds(serverIds: string[]): Promise<ToolInfo[]> {
    const [serverInfo, store] = await Promise.all([
      mcpClient.getServerInfo(),
      ToolPreferencesService.getAll()
    ]);
    return this.collectEnabledTools(serverIds, serverInfo.serverTools ?? {}, store);
  }
}
