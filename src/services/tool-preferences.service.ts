import type { McpToolPreferencesStore } from '../types/tool-preferences.types.js';
import { ConfigService } from './config.service.js';

const SETTING_KEY = 'mcpToolPreferences';

/** per-server 工具偏好持久化（读写 only；启用语义见 ToolPolicyService） */
export class ToolPreferencesService {
  static async getAll(): Promise<McpToolPreferencesStore> {
    const raw = await ConfigService.getSetting(SETTING_KEY);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }
    return raw as McpToolPreferencesStore;
  }

  static async getForServer(serverId: string): Promise<Record<string, boolean>> {
    const all = await this.getAll();
    return { ...(all[serverId] ?? {}) };
  }

  static async saveForServer(
    serverId: string,
    preferences: Record<string, boolean>
  ): Promise<void> {
    const all = await this.getAll();
    all[serverId] = { ...preferences };
    await ConfigService.saveSetting(SETTING_KEY, all);
  }
}
