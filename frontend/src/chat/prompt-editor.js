/**
 * 工具提示词编辑器 — 从 core 拆出的 UI + 预览/保存流程
 */

import { getSession } from '../auth/session.js';
import { closeChatModal, openChatModal } from './ui/modal-host.js';

/**
 * @returns {Record<string, Function>}
 */
export function createPromptEditorMethods() {
  return {
    async openPromptEditor() {
      try {
        const promptsModal = document.getElementById('prompts-modal');
        const promptTextarea = document.getElementById('tool-prompt-content');

        if (!promptsModal || !promptTextarea) {
          console.error('找不到提示词编辑器元素');
          return;
        }

        promptTextarea.value = '加载中...';
        promptTextarea.disabled = true;

        const previewDetails = document.getElementById('prompt-sections-preview');
        if (previewDetails) {
          previewDetails.open = false;
        }
        this.paintAssembledPreview('loading');

        openChatModal('prompts-modal');

        const response = await fetch('/api/settings/tool-prompt', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status}`);
        }

        const data = await response.json();

        promptTextarea.value = data.prompt || '';
        promptTextarea.disabled = false;

        this.bindPromptPreviewHandlers();
        void this.loadPromptPreview();
      } catch (error) {
        console.error('打开提示词编辑器失败:', error);
        this.ui.showTooltip?.('加载提示词失败，请重试');
      }
    },

    hasAnyToolsEnabled() {
      const mcpOn = this.state.enableMCPTools !== false;
      const systemOn = (this.state.enabledSystemToolNames ?? []).length > 0;
      return mcpOn || systemOn;
    },

    buildPromptPreviewParams() {
      const params = new URLSearchParams({
        enableTools: String(this.hasAnyToolsEnabled()),
        enablePrompts: String(this.state.enablePrompts !== false),
      });
      const textarea = document.getElementById('tool-prompt-content');
      if (textarea) {
        params.set('toolPrompt', textarea.value);
      }
      const ids = this.getSelectableMcpServerIds?.() ?? [];
      if (ids.length > 0) {
        params.set('mcpServerIds', ids.join(','));
      }
      return params;
    },

    bindPromptPreviewHandlers() {
      const details = document.getElementById('prompt-sections-preview');
      if (details?.dataset.bound !== '1') {
        details.dataset.bound = '1';
        details.addEventListener('toggle', () => {
          if (details.open) {
            void this.loadPromptPreview();
          }
        });
      }

      const textarea = document.getElementById('tool-prompt-content');
      if (!textarea || textarea.dataset.previewBound === '1') {
        return;
      }
      textarea.dataset.previewBound = '1';
      let debounceTimer = null;
      textarea.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => void this.loadPromptPreview(), 400);
      });
    },

    paintAssembledPreview(mode, assembled = null) {
      const panel = document.getElementById('prompt-assembled-preview');
      const body = document.getElementById('prompt-assembled-body');
      const status = document.getElementById('prompt-assembled-status');
      const meta = document.getElementById('prompt-assembled-meta');
      if (!panel || !body || !meta) {
        return;
      }

      const statusLabels = {
        loading: '加载中',
        off: '未开启工具',
        idle: '暂无提示词',
        ready: '有提示词',
        error: '加载失败',
      };

      panel.classList.remove('is-disabled', 'is-empty');
      panel.classList.toggle('is-collapsed', mode !== 'ready');
      panel.classList.toggle('is-disabled', mode === 'off');
      panel.classList.toggle('is-empty', mode === 'idle' || mode === 'error');

      body.className =
        mode === 'loading' ? 'prompt-assembled-body is-loading' : 'prompt-assembled-body';
      body.textContent =
        mode === 'ready' ? assembled.content : mode === 'error' ? '请稍后重试' : '';

      if (status) {
        status.className = `prompt-assembled-status prompt-assembled-status--${mode}`;
        status.setAttribute('aria-label', statusLabels[mode] ?? '');
      }

      if (mode === 'ready') {
        const chars = assembled.charCount ?? assembled.content.length;
        meta.textContent = `约 ${chars.toLocaleString()} 字`;
      } else {
        meta.textContent = mode === 'error' ? '加载失败' : '';
      }
    },

    renderPromptSectionsList(sections) {
      const listEl = document.getElementById('prompt-sections-list');
      if (!listEl) {
        return;
      }

      if (!Array.isArray(sections) || sections.length === 0) {
        listEl.className = 'prompt-sections-list is-empty';
        listEl.replaceChildren();
        return;
      }

      const emptyHints = {
        core: '当前无内容(客户端自己硬编码)',
        skills_catalog: '暂未启用',
      };

      const makeIndicator = (variant) => {
        const el = document.createElement('span');
        el.className = `prompt-section-indicator prompt-section-indicator--${variant}`;
        el.setAttribute('role', 'status');
        return el;
      };

      listEl.className = 'prompt-sections-list';
      listEl.replaceChildren();

      for (const section of sections) {
        const text = (section.content || '').trim();
        const label = section.label || section.key;

        if (!text) {
          const row = document.createElement('div');
          row.className = 'prompt-section-row';
          const main = document.createElement('div');
          main.className = 'prompt-section-row-main';
          const labelEl = document.createElement('span');
          labelEl.className = 'prompt-section-row-label';
          labelEl.textContent = label;
          main.append(labelEl);
          const hint = emptyHints[section.key];
          if (hint) {
            const hintEl = document.createElement('span');
            hintEl.className = 'prompt-section-row-hint';
            hintEl.textContent = hint;
            main.append(hintEl);
          }
          row.append(main, makeIndicator('idle'));
          listEl.append(row);
          continue;
        }

        const item = document.createElement('details');
        item.className = 'prompt-section-item';
        if (section.includedInSystem !== false) {
          item.open = true;
        }

        const summary = document.createElement('summary');
        const labelEl = document.createElement('span');
        labelEl.className = 'prompt-section-item-label';
        labelEl.textContent = label;
        const indicatorVariant = section.includedInSystem === false ? 'skipped' : 'filled';
        summary.append(labelEl, makeIndicator(indicatorVariant));

        const bodyWrap = document.createElement('div');
        bodyWrap.className = 'prompt-section-item-body';
        const note = section.source?.trim();
        if (note) {
          const source = document.createElement('p');
          source.className = 'prompt-section-source';
          source.textContent = note;
          bodyWrap.append(source);
        }
        const content = document.createElement('pre');
        content.className = 'prompt-section-content';
        content.textContent = text;
        bodyWrap.append(content);
        item.append(summary, bodyWrap);
        listEl.append(item);
      }
    },

    async loadPromptPreview() {
      const listEl = document.getElementById('prompt-sections-list');
      this.paintAssembledPreview('loading');
      if (document.getElementById('prompt-sections-preview')?.open && listEl) {
        listEl.className = 'prompt-sections-list is-loading';
        listEl.replaceChildren();
      }

      try {
        const response = await fetch(
          `/api/settings/system-prompt-sections?${this.buildPromptPreviewParams()}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const assembled = data.assembled ?? null;

        if (!this.hasAnyToolsEnabled()) {
          this.paintAssembledPreview('off');
        } else if (!assembled?.content?.trim()) {
          this.paintAssembledPreview('idle');
        } else {
          this.paintAssembledPreview('ready', assembled);
        }

        if (document.getElementById('prompt-sections-preview')?.open) {
          this.renderPromptSectionsList(data.sections ?? []);
        } else if (listEl) {
          listEl.className = 'prompt-sections-list';
          listEl.replaceChildren();
        }
      } catch (error) {
        console.error('加载提示词预览失败:', error);
        this.paintAssembledPreview('error');
        if (listEl) {
          listEl.className = 'prompt-sections-list is-error';
          listEl.replaceChildren();
        }
      }
    },

    async saveToolPrompt() {
      try {
        const promptTextarea = document.getElementById('tool-prompt-content');

        if (!promptTextarea) {
          console.error('找不到提示词文本区域');
          return;
        }

        const promptContent = promptTextarea.value;

        const user = await getSession();
        if (!user) {
          this.ui.showTooltip?.('请先登录后再保存配置');
          return;
        }

        promptTextarea.disabled = true;

        const response = await fetch('/api/settings/tool-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ prompt: promptContent }),
        });

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status}`);
        }

        promptTextarea.disabled = false;

        closeChatModal('prompts-modal');

        this.ui.showTooltip?.('提示词保存成功');
      } catch (error) {
        console.error('保存提示词失败:', error);
        this.ui.showTooltip?.('保存提示词失败，请重试');

        const promptTextarea = document.getElementById('tool-prompt-content');
        if (promptTextarea) {
          promptTextarea.disabled = false;
        }
      }
    },
  };
}
