import { mcpClient } from '../mcp/index.js';
import { ConfigService } from '../../services/config.service.js';
import type { ResolvedChatProfile } from '../../types/config-plane.types.js';
import type { InternalMessage } from './types.js';

export const PROMPT_SECTION_ORDER = [
  'core',
  'tools',
  'skills_catalog',
  'memory',
  'project_rules'
] as const;

export type PromptSectionKey = (typeof PROMPT_SECTION_ORDER)[number];

export interface PromptPipelineOptions {
  enableTools: boolean;
  enablePrompts: boolean;
  resolvedProfile?: ResolvedChatProfile;
  /** 预览 API：覆盖 mcpToolPrompt / Profile.toolPrompt（仅影响分段展示，不改变实际发送） */
  toolPromptOverride?: string;
}

export interface AssembledSystemPreview {
  role: 'system';
  content: string;
  charCount: number;
}

export interface PromptSectionPreview {
  key: PromptSectionKey;
  label: string;
  source: string;
  content: string;
  includedInSystem: boolean;
}

export interface SystemPromptSections {
  core: string;
  tools: string;
  skills_catalog: string;
  memory: string;
  project_rules: string;
}

const SECTION_LABELS: Record<PromptSectionKey, string> = {
  core: '基础提示词',
  tools: '用户提示词',
  skills_catalog: '技能提示词',
  memory: '记忆提示词',
  project_rules: '服务提示词'
};

/** 展开详情时展示的短说明（面向用户，避免技术字段名） */
const SECTION_SOURCES: Record<PromptSectionKey, string> = {
  core: '系统预留，当前通常为空',
  tools: '来自本页编辑框或聊天设置中保存的内容',
  skills_catalog: '后续版本支持',
  memory: '后续版本支持',
  project_rules: '来自当前已启用连接服务自带的说明'
};

function joinNonEmpty(parts: string[]): string {
  return parts.filter(p => p.trim().length > 0).join('\n\n');
}

/**
 * System Prompt 组装流水线（对齐 s10：分段来源；稳定段进 system）
 */
export class SystemPromptBuilder {
  constructor(private readonly options: PromptPipelineOptions) {}

  async buildSections(): Promise<SystemPromptSections> {
    return {
      core: this._buildCore(),
      tools: await this._buildTools(),
      skills_catalog: this._buildSkillsCatalog(),
      memory: this._buildMemory(),
      project_rules: this._buildProjectRules()
    };
  }

  async buildStableContent(): Promise<string> {
    const s = await this.buildSections();
    return joinNonEmpty([
      s.core,
      s.tools,
      s.skills_catalog,
      s.memory,
      s.project_rules
    ]);
  }

  async buildSectionPreviews(): Promise<PromptSectionPreview[]> {
    const assembled = await this.buildSections();
    const userPrompt = await this.resolveUserToolPrompt();
    const display: SystemPromptSections = {
      ...assembled,
      tools: userPrompt
    };

    return PROMPT_SECTION_ORDER.map(key => {
      const content = display[key];
      const includedInSystem = this.isSectionIncludedInSystem(key, content);
      const source =
        key === 'tools' && !includedInSystem && content.trim()
          ? '提示词开关关闭，不会发给模型'
          : SECTION_SOURCES[key];
      return {
        key,
        label: SECTION_LABELS[key],
        source,
        content,
        includedInSystem
      };
    });
  }

  private isSectionIncludedInSystem(
    key: PromptSectionKey,
    content: string
  ): boolean {
    if (!content.trim() || !this.options.enableTools) {
      return false;
    }
    if (key === 'tools') {
      return this.options.enablePrompts;
    }
    if (key === 'project_rules') {
      return true;
    }
    return false;
  }

  private _buildCore(): string {
    return '';
  }

  /** 用户提示词正文（与是否注入 system 无关，供分段预览） */
  private async resolveUserToolPrompt(): Promise<string> {
    if (!this.options.enableTools) {
      return '';
    }
    if (this.options.toolPromptOverride !== undefined) {
      return this.options.toolPromptOverride.trim();
    }
    if (this.options.resolvedProfile) {
      return this.options.resolvedProfile.toolPrompt.trim();
    }
    const raw = await ConfigService.getSetting('mcpToolPrompt');
    return String(raw ?? '').trim();
  }

  private async _buildTools(): Promise<string> {
    if (!this.options.enableTools || !this.options.enablePrompts) {
      return '';
    }
    return this.resolveUserToolPrompt();
  }

  private _buildSkillsCatalog(): string {
    return '';
  }

  private _buildMemory(): string {
    return '';
  }

  private _buildProjectRules(): string {
    if (!this.options.enableTools) {
      return '';
    }
    return mcpClient
      .getInstructions(this.options.resolvedProfile?.mcpServerIds)
      .trim();
  }
}

/**
 * 将稳定段写入 system；已有 system 或 `_source: reminder` 的用户消息不并入 system
 */
export async function applyPromptPipelineToMessages(
  messages: InternalMessage[],
  options: PromptPipelineOptions
): Promise<InternalMessage[]> {
  const result: InternalMessage[] = [...messages];

  if (!options.enableTools) {
    return result;
  }

  const hasSystemMessage = result.some(
    m => m.role === 'system' && m._source !== 'reminder'
  );
  if (hasSystemMessage) {
    return result;
  }

  const builder = new SystemPromptBuilder(options);
  const stable = await builder.buildStableContent();
  if (stable.trim()) {
    result.unshift({
      role: 'system',
      content: stable,
      _source: 'system'
    });
  }

  return result;
}

export async function buildSystemPromptSectionPreviews(
  options: PromptPipelineOptions
): Promise<PromptSectionPreview[]> {
  const builder = new SystemPromptBuilder(options);
  return builder.buildSectionPreviews();
}

/** 与 `applyPromptPipelineToMessages` 注入的 system 正文一致 */
export async function buildAssembledSystemPreview(
  options: PromptPipelineOptions
): Promise<AssembledSystemPreview | null> {
  if (!options.enableTools) {
    return null;
  }
  const builder = new SystemPromptBuilder(options);
  const content = await builder.buildStableContent();
  if (!content.trim()) {
    return null;
  }
  return {
    role: 'system',
    content,
    charCount: content.length
  };
}
