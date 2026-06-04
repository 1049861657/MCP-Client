/**
 * Info 页 MCP Resources / Prompts 只读列表与预览（不进聊天）
 */

import { showToast } from '../shared/ui/toast.js';

/** @typedef {{ uri: string; name?: string; description?: string; mimeType?: string }} McpResourceInfo */
/** @typedef {{ name: string; description?: string; arguments?: McpPromptArgumentInfo[] }} McpPromptInfo */
/** @typedef {{ name: string; description?: string; required?: boolean }} McpPromptArgumentInfo */

const ICON_COPY =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<{ ok: boolean; output: string; error?: string }>}
 */
async function previewRequest(url, init) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) {
    const message = body.error || body.details || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

/**
 * @param {string} text
 */
async function copyText(text) {
  await navigator.clipboard.writeText(text);
  showToast('已复制', 'success');
}

/**
 * @param {HTMLElement} container
 * @param {string} title
 * @param {string} output
 */
function showPreviewModal(container, title, output) {
  const overlay = document.createElement('div');
  overlay.className = 'rp-preview-overlay';
  overlay.innerHTML = `
    <div class="rp-preview-dialog" role="dialog" aria-modal="true">
      <div class="rp-preview-head">
        <h3>${escapeHtml(title)}</h3>
        <button type="button" class="icon-btn rp-preview-close" aria-label="关闭">×</button>
      </div>
      <pre class="rp-preview-body"></pre>
    </div>
  `;
  const pre = overlay.querySelector('.rp-preview-body');
  if (pre) {
    pre.textContent = output;
  }
  const close = () => overlay.remove();
  overlay.querySelector('.rp-preview-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  container.appendChild(overlay);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {HTMLElement | null} root
 * @param {McpResourceInfo[]} resources
 * @param {string} serverId
 */
export function renderResourcesPanel(root, resources, serverId) {
  if (!root) {
    return;
  }
  root.innerHTML = '';

  if (!resources.length) {
    root.innerHTML = '<div class="void-box">该服务器未暴露 MCP 资源，或尚未声明 resources 能力</div>';
    return;
  }

  resources.forEach((resource) => {
    const item = document.createElement('article');
    item.className = 'rp-item';
    const title = resource.name || resource.uri;
    const desc = resource.description || resource.mimeType || '';
    item.innerHTML = `
      <div class="rp-item-head">
        <div class="rp-item-title">${escapeHtml(title)}</div>
        <div class="rp-item-actions">
          <button type="button" class="bulk-btn rp-copy-uri" title="复制 URI">${ICON_COPY}</button>
          <button type="button" class="bulk-btn rp-preview-btn">预览</button>
        </div>
      </div>
      <div class="rp-item-uri mono">${escapeHtml(resource.uri)}</div>
      ${desc ? `<p class="rp-item-desc">${escapeHtml(desc)}</p>` : ''}
    `;

    item.querySelector('.rp-copy-uri')?.addEventListener('click', () => {
      void copyText(resource.uri).catch(() => showToast('复制失败', 'error'));
    });

    item.querySelector('.rp-preview-btn')?.addEventListener('click', () => {
      const btn = item.querySelector('.rp-preview-btn');
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = true;
        btn.textContent = '加载中…';
      }
      const url = `/api/server/${encodeURIComponent(serverId)}/mcp-resources/preview?uri=${encodeURIComponent(resource.uri)}`;
      previewRequest(url)
        .then((result) => {
          showPreviewModal(document.body, `Resource: ${title}`, result.output);
        })
        .catch((error) => {
          showToast(error instanceof Error ? error.message : '预览失败', 'error');
        })
        .finally(() => {
          if (btn instanceof HTMLButtonElement) {
            btn.disabled = false;
            btn.textContent = '预览';
          }
        });
    });

    root.appendChild(item);
  });
}

/**
 * @param {McpPromptArgumentInfo[]} argDefs
 * @returns {Record<string, unknown>}
 */
function collectPromptArguments(argDefs) {
  /** @type {Record<string, unknown>} */
  const args = {};
  for (const def of argDefs) {
    const raw = window.prompt(
      def.description ? `${def.name}（${def.description}）` : def.name,
      ''
    );
    if (raw === null) {
      return {};
    }
    if (def.required && raw.trim() === '') {
      showToast(`${def.name} 为必填`, 'error');
      return {};
    }
    if (raw.trim() !== '') {
      args[def.name] = raw;
    }
  }
  return args;
}

/**
 * @param {HTMLElement | null} root
 * @param {McpPromptInfo[]} prompts
 * @param {string} serverId
 */
export function renderPromptsPanel(root, prompts, serverId) {
  if (!root) {
    return;
  }
  root.innerHTML = '';

  if (!prompts.length) {
    root.innerHTML = '<div class="void-box">该服务器未暴露 MCP Prompt，或尚未声明 prompts 能力</div>';
    return;
  }

  prompts.forEach((prompt) => {
    const item = document.createElement('article');
    item.className = 'rp-item';
    const desc = prompt.description || '';
    item.innerHTML = `
      <div class="rp-item-head">
        <div class="rp-item-title mono">${escapeHtml(prompt.name)}</div>
        <div class="rp-item-actions">
          <button type="button" class="bulk-btn rp-copy-name" title="复制名称">${ICON_COPY}</button>
          <button type="button" class="bulk-btn rp-preview-btn">预览</button>
        </div>
      </div>
      ${desc ? `<p class="rp-item-desc">${escapeHtml(desc)}</p>` : ''}
    `;

    item.querySelector('.rp-copy-name')?.addEventListener('click', () => {
      void copyText(prompt.name).catch(() => showToast('复制失败', 'error'));
    });

    item.querySelector('.rp-preview-btn')?.addEventListener('click', () => {
      const argDefs = prompt.arguments ?? [];
      const args = argDefs.length > 0 ? collectPromptArguments(argDefs) : {};
      if (argDefs.length > 0 && Object.keys(args).length === 0) {
        return;
      }

      const btn = item.querySelector('.rp-preview-btn');
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = true;
        btn.textContent = '加载中…';
      }

      previewRequest(`/api/server/${encodeURIComponent(serverId)}/mcp-prompts/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: prompt.name, arguments: args }),
      })
        .then((result) => {
          showPreviewModal(document.body, `Prompt: ${prompt.name}`, result.output);
        })
        .catch((error) => {
          showToast(error instanceof Error ? error.message : '预览失败', 'error');
        })
        .finally(() => {
          if (btn instanceof HTMLButtonElement) {
            btn.disabled = false;
            btn.textContent = '预览';
          }
        });
    });

    root.appendChild(item);
  });
}

/**
 * @param {HTMLElement | null} tabBtn
 * @param {number} count
 */
export function updateRpTabCount(tabBtn, count) {
  const num = tabBtn?.querySelector('.tab-num');
  if (num) {
    num.textContent = String(count);
  }
}
