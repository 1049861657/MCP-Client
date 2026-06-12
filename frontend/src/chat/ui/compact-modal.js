import { escapeHtml } from '../../shared/escape-html.js';
import { enhanceCodeBlocks } from '../code-blocks.js';
import { marked } from '../renderers.js';
import { bindChatModalClose, openChatModal } from './modal-host.js';

const CONTEXT_COMPACTED_LABEL = '已压缩';

/**
 * @param {() => object} getApp
 * @param {{ showTooltip: Function, updateContextCompactControls?: Function }} ui
 */
export function createCompactModalApi(getApp, ui) {
  function showContextModal() {
    openChatModal('context-modal');
    bindChatModalClose('context-modal');
  }

  function isContextCompacted() {
    const app = getApp();
    return !!(
      app?.state?.apiContextOverride?.length ||
      app?.state?.contextCompactedActive
    );
  }

  function hasContextCompactState() {
    const app = getApp();
    return (
      isContextCompacted() ||
      !!app?.state?.compactedBaseline ||
      !!app?.state?.compactDraft
    );
  }

  function updateContextCompactControls(isPendingCompacted) {
    const app = getApp();
    const genBtn = document.getElementById('context-generate-summary');
    const applyBtn = document.getElementById('context-apply-summary');
    const clearBtn = document.getElementById('context-clear-override');
    const hasDraft = !!app?.state?.compactDraft;
    const isGenerating = genBtn?.dataset.generating === '1';
    const canClear =
      !!app?.state?.apiContextOverride?.length ||
      !!app?.state?.contextCompactedActive ||
      !!app?.state?.compactedBaseline;

    if (genBtn) {
      genBtn.disabled = isPendingCompacted || isGenerating;
    }
    if (applyBtn) {
      applyBtn.disabled = isPendingCompacted || !hasDraft || isGenerating;
    }
    if (clearBtn) {
      clearBtn.disabled = !canClear || isGenerating;
    }
  }

  /**
   * @param {boolean} isGenerating
   */
  function setContextCompactGenerating(isGenerating) {
    const genBtn = document.getElementById('context-generate-summary');
    const applyBtn = document.getElementById('context-apply-summary');
    const clearBtn = document.getElementById('context-clear-override');

    if (isGenerating) {
      if (genBtn) {
        genBtn.dataset.generating = '1';
        genBtn.classList.add('is-generating');
        genBtn.innerHTML =
          '<span class="ui-spinner ui-spinner--sm" aria-hidden="true"></span>生成中…';
        genBtn.disabled = true;
      }
      if (applyBtn) {
        applyBtn.disabled = true;
      }
      if (clearBtn) {
        clearBtn.disabled = true;
      }
      return;
    }

    if (genBtn) {
      delete genBtn.dataset.generating;
      genBtn.classList.remove('is-generating');
      genBtn.textContent = '生成摘要';
    }

    syncContextDraftPreview();
    refreshCompactSectionUi();
  }

  /**
   * @param {object} preview
   * @param {{ hasOverride?: boolean, hasDraft?: boolean }} [options]
   */
  function renderContextPreview(preview, options = {}) {
    const statusEl = document.getElementById('context-status');
    const dashboardEl = document.getElementById('context-dashboard');
    const listEl = document.getElementById('context-messages-list');
    const badgeEl = document.getElementById('context-compact-badge');
    const footerEl = document.getElementById('context-modal-footer');
    const msgCountEl = document.getElementById('context-msg-count');

    if (!statusEl || !preview) {
      return;
    }

    const app = getApp();
    const threshold = preview.compactThresholdTokens;
    const tokens = preview.estimatedTokens || 0;
    const pct = threshold > 0 ? Math.min(100, (tokens / threshold) * 100) : 0;

    const isPendingCompacted =
      preview.contextOverrideActive ||
      options.hasOverride ||
      isContextCompacted();
    const hasBaseline = !!app?.state?.compactedBaseline;

    const needsBanner = preview.pendingAutoCompact || preview.wouldAutoCompact;
    if (needsBanner) {
      statusEl.className = `context-status ${preview.pendingAutoCompact ? 'context-status-danger' : 'context-status-warn'}`;
      statusEl.textContent = preview.pendingAutoCompact
        ? '上下文较长，发送时将自动摘要。建议先生成并应用摘要，或在设置中关闭自动压缩。'
        : '上下文较长，建议生成摘要并应用。';
      statusEl.classList.remove('hidden');
    } else {
      statusEl.classList.add('hidden');
    }

    renderDashboard(preview, tokens, threshold, pct, isPendingCompacted, hasBaseline);

    if (dashboardEl) {
      dashboardEl.classList.remove('hidden');
    }

    if (listEl && Array.isArray(preview.messages)) {
      const total = preview.messages.length;
      listEl.innerHTML = total
        ? preview.messages.map((m, index) => renderContextMessageRow(m, index, total)).join('')
        : '<p class="context-empty">暂无消息</p>';
    }

    if (msgCountEl) {
      msgCountEl.textContent = preview.messageCount > 0 ? `${preview.messageCount} 条` : '';
    }

    if (footerEl) {
      footerEl.classList.remove('hidden');
    }

    if (badgeEl) {
      if (isPendingCompacted) {
        badgeEl.textContent = CONTEXT_COMPACTED_LABEL;
        badgeEl.className = 'context-compact-badge context-compact-badge--active';
        badgeEl.classList.remove('hidden');
      } else if (hasBaseline) {
        badgeEl.textContent = '压缩基线';
        badgeEl.className = 'context-compact-badge context-compact-badge--active';
        badgeEl.classList.remove('hidden');
      } else if (options.hasDraft || app?.state?.compactDraft) {
        badgeEl.textContent = '草稿待应用';
        badgeEl.className = 'context-compact-badge';
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.className = 'context-compact-badge hidden';
      }
    }

    updateContextCompactControls(isPendingCompacted);
    syncContextDraftPreview();
  }

  /**
   * 预览 API 失败时仍展示操作区
   * @param {Error | unknown} error
   */
  function renderContextPreviewError(error) {
    const statusEl = document.getElementById('context-status');
    const dashboardEl = document.getElementById('context-dashboard');
    const listEl = document.getElementById('context-messages-list');
    const footerEl = document.getElementById('context-modal-footer');

    const message = error instanceof Error ? error.message : '未知错误';
    const isPendingCompacted = isContextCompacted();

    if (statusEl) {
      statusEl.className = 'context-status context-status-danger';
      statusEl.textContent = `预览加载失败：${message}`;
      statusEl.classList.remove('hidden');
    }

    if (dashboardEl) {
      dashboardEl.classList.add('hidden');
    }

    if (listEl) {
      listEl.innerHTML = '<p class="context-empty context-empty--error">无法加载消息预览，您仍可使用下方操作生成或管理摘要。</p>';
    }

    if (footerEl) {
      footerEl.classList.remove('hidden');
    }

    updateContextCompactControls(isPendingCompacted);
    syncContextDraftPreview();
  }

  function syncCompactSectionVisibility(hasText) {
    const compactSectionEl = document.getElementById('context-compact-section');
    if (!compactSectionEl) {
      return;
    }
    compactSectionEl.classList.toggle('hidden', !hasText);
    compactSectionEl.hidden = !hasText;
  }

  function refreshCompactSectionUi() {
    const app = getApp();
    const badgeEl = document.getElementById('context-compact-badge');
    const isPendingCompacted = isContextCompacted();
    const hasBaseline = !!app?.state?.compactedBaseline;
    const hasDraft = !!app?.state?.compactDraft;
    const hasText = resolveCompactPreviewText().trim().length > 0;

    syncCompactSectionVisibility(hasText);

    if (badgeEl) {
      if (isPendingCompacted) {
        badgeEl.textContent = CONTEXT_COMPACTED_LABEL;
        badgeEl.className = 'context-compact-badge context-compact-badge--active';
        badgeEl.classList.remove('hidden');
      } else if (hasBaseline) {
        badgeEl.textContent = '压缩基线';
        badgeEl.className = 'context-compact-badge context-compact-badge--active';
        badgeEl.classList.remove('hidden');
      } else if (hasDraft) {
        badgeEl.textContent = '草稿待应用';
        badgeEl.className = 'context-compact-badge';
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.className = 'context-compact-badge hidden';
      }
    }

    updateContextCompactControls(isPendingCompacted);
  }

  /**
   * @param {object} preview
   * @param {number} threshold
   * @param {number} pct
   * @param {boolean} isPendingCompacted
   * @param {boolean} hasBaseline
   */
  function renderDashboard(preview, tokens, threshold, pct, isPendingCompacted, hasBaseline) {
    const tokenValueEl = document.getElementById('context-token-value');
    const tokenLimitEl = document.getElementById('context-token-limit');
    const tokenPctEl = document.getElementById('context-token-pct');
    const barFillEl = document.getElementById('context-token-bar-fill');
    const breakdownEl = document.getElementById('context-role-breakdown');
    const chipEl = document.getElementById('context-state-chip');

    if (tokenValueEl) {
      tokenValueEl.textContent = tokens.toLocaleString();
    }
    if (tokenLimitEl) {
      tokenLimitEl.textContent = `/ ${threshold.toLocaleString()} tokens`;
    }
    if (tokenPctEl) {
      tokenPctEl.textContent = `${pct.toFixed(1)}%`;
    }
    if (barFillEl) {
      barFillEl.style.width = `${pct}%`;
      barFillEl.className = `context-token-bar-fill${pct >= 80 ? ' context-token-bar-fill--warn' : ''}`;
    }
    if (breakdownEl) {
      breakdownEl.innerHTML = renderPayloadCompositionHtml(
        preview.roleCounts,
        preview.messageCount,
        preview.compactedToolCount,
      );
    }
    if (chipEl) {
      if (isPendingCompacted) {
        chipEl.textContent = CONTEXT_COMPACTED_LABEL;
        chipEl.className = 'context-state-chip context-state-chip--ok';
        chipEl.classList.remove('hidden');
      } else if (hasBaseline) {
        chipEl.textContent = '压缩基线';
        chipEl.className = 'context-state-chip context-state-chip--ok';
        chipEl.classList.remove('hidden');
      } else if (preview.pendingAutoCompact) {
        chipEl.textContent = '将自动摘要';
        chipEl.className = 'context-state-chip context-state-chip--danger';
        chipEl.classList.remove('hidden');
      } else if (preview.wouldAutoCompact) {
        chipEl.textContent = '建议压缩';
        chipEl.className = 'context-state-chip context-state-chip--warn';
        chipEl.classList.remove('hidden');
      } else {
        chipEl.className = 'context-state-chip hidden';
      }
    }
  }

  function resolveCompactPreviewText() {
    const state = getApp()?.state;
    if (!state) {
      return '';
    }
    for (const item of [
      state.apiContextOverride?.[0]?.content,
      state.compactDraft?.content,
      state.compactedBaseline?.summaryContent,
    ]) {
      if (typeof item === 'string' && item.trim()) {
        return item;
      }
    }
    return '';
  }

  function syncContextDraftPreview() {
    const wrapEl = document.getElementById('context-compact-draft-wrap');
    const draftEl = document.getElementById('context-compact-draft');
    const labelEl = document.getElementById('context-draft-label');
    if (!wrapEl || !draftEl) {
      return;
    }

    const text = resolveCompactPreviewText();
    const hasText = text.trim().length > 0;
    const isPending = isContextCompacted();
    const hasBaseline = !!getApp()?.state?.compactedBaseline;

    draftEl.innerHTML = hasText ? renderContextMarkdown(text) : '';
    wrapEl.classList.toggle('hidden', !hasText);
    wrapEl.hidden = !hasText;

    if (hasText) {
      enhanceCodeBlocks(draftEl);
    }

    if (labelEl) {
      if (!hasText) {
        labelEl.textContent = '';
        labelEl.classList.add('hidden');
      } else if (isPending) {
        labelEl.textContent = '摘要（已应用）';
        labelEl.classList.remove('hidden');
      } else if (hasBaseline) {
        labelEl.textContent = '摘要（当前基线）';
        labelEl.classList.remove('hidden');
      } else {
        labelEl.textContent = '摘要预览';
        labelEl.classList.remove('hidden');
      }
    }

    syncCompactSectionVisibility(hasText);
  }

  /**
   * @param {string} text
   */
  function setCompactDraft(_text) {
    syncContextDraftPreview();
    refreshCompactSectionUi();
  }

  return {
    CONTEXT_COMPACTED_LABEL,
    showContextModal,
    renderContextPreview,
    renderContextPreviewError,
    syncContextDraftPreview,
    setCompactDraft,
    refreshCompactSectionUi,
    setContextCompactGenerating,
    updateContextCompactControls,
    isContextCompacted,
    hasContextCompactState,
  };
}

/**
 * @param {Record<string, number> | undefined} roleCounts
 * @param {number} messageCount
 * @param {number} compactedToolCount
 */
function renderPayloadCompositionHtml(roleCounts, messageCount, compactedToolCount) {
  const roles = [
    { key: 'user', short: 'U', count: roleCounts?.user ?? 0 },
    { key: 'assistant', short: 'A', count: roleCounts?.assistant ?? 0 },
    { key: 'tool', short: 'T', count: roleCounts?.tool ?? 0 },
    { key: 'system', short: 'S', count: roleCounts?.system ?? 0 },
  ].filter((item) => item.count > 0);

  const keys = roles.map((item) =>
    `<span class="context-composition-key context-composition-key--${item.key}">${item.short}<sup>${item.count}</sup></span>`,
  ).join('');

  const extra = compactedToolCount > 0
    ? `<span class="context-composition-extra">+${compactedToolCount} 占位</span>`
    : '';

  return `
    <div class="context-composition-meta">
      <span class="context-composition-total">${messageCount} 条载荷</span>
      ${keys ? `<span class="context-composition-keys">${keys}</span>` : ''}
      ${extra}
    </div>
  `;
}

/**
 * @param {{ role?: string, preview?: string, charLength?: number, estimatedTokens?: number, index?: number }} m
 * @param {number} index
 */
function renderContextMessageRow(m, index, totalCount) {
  const role = m.role || 'unknown';
  const roleLabel = formatContextRoleLabel(role);
  const meta = formatContextMsgMeta(m);
  const preview = m.preview || '';
  const seq = typeof m.index === 'number' ? m.index + 1 : index + 1;
  const openAttr = totalCount === 1 ? ' open' : '';

  const roleClass =
    role === 'user'
      ? 'user'
      : role === 'assistant'
        ? 'assistant'
        : role === 'tool'
          ? 'tool'
          : 'system';

  return `
    <details class="context-msg context-msg--${roleClass}"${openAttr}>
      <summary class="context-msg-summary">
        <span class="context-msg-seq">#${seq}</span>
        <span class="context-msg-role context-msg-role--${roleClass}">${escapeHtml(roleLabel)}</span>
        <span class="context-msg-meta">${escapeHtml(meta)}</span>
      </summary>
      <pre class="context-msg-raw">${escapeHtml(preview)}</pre>
    </details>
  `;
}

/**
 * @param {string} role
 */
function formatContextRoleLabel(role) {
  const map = { user: '用户', assistant: '助手', tool: '工具', system: '系统' };
  return map[role] || role;
}

/**
 * @param {{ charLength?: number, estimatedTokens?: number }} m
 */
function formatContextMsgMeta(m) {
  const chars = typeof m.charLength === 'number' ? m.charLength : 0;
  const tokens = m.estimatedTokens || 0;
  if (chars > 0) {
    return `${chars} 字 · 约 ${tokens} tokens`;
  }
  return `约 ${tokens} tokens`;
}

/**
 * @param {string} text
 */
function renderContextMarkdown(text) {
  return marked.parse(text);
}
