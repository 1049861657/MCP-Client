import type { MCPServerInfo } from '../types/mcp.types.js';
import { mcpClientForConfigUser } from './mcp-context.service.js';
import { ToolPreferencesService } from './tool-preferences.service.js';

/** Info 页 API 响应组装：runtime 状态 + toolPreferences（契约必填字段） */
export class McpInfoAssembler {
  static async assembleForInfoPage(configUserId: string | null): Promise<MCPServerInfo> {
    const client = mcpClientForConfigUser(configUserId);
    const [info, toolPreferences] = await Promise.all([
      client.getServerInfo(),
      ToolPreferencesService.getAll()
    ]);
    return { ...info, toolPreferences };
  }
}
