import { mcpClient } from '../core/mcp/index.js';
import type { MCPServerInfo } from '../types/mcp.types.js';
import { ToolPreferencesService } from './tool-preferences.service.js';

/** Info 页 API 响应组装：runtime 状态 + toolPreferences（契约必填字段） */
export class McpInfoAssembler {
  static async assembleForInfoPage(): Promise<MCPServerInfo> {
    const [info, toolPreferences] = await Promise.all([
      mcpClient.getServerInfo(),
      ToolPreferencesService.getAll()
    ]);
    return { ...info, toolPreferences };
  }
}
