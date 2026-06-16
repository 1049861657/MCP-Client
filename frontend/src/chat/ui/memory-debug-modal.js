import { fetchJson, postApiJson } from '../../shared/fetch-json.js';
import { formatMemoryMentionedAt } from '../time.js';
import { bindChatModalClose, openChatModal } from './chat-modals-host.js';

const API_BASE = '/api/memory/debug';
const MODAL_ID = 'memory-debug-modal';

/** @type {Record<'recall'|'prompt'|'reflect', { apiPath: string; failLabel: string }>} */
const MODES = {
  recall: { apiPath: '/recall', failLabel: '检索失败' },
  prompt: { apiPath: '/prompt', failLabel: '预览失败' },
  reflect: { apiPath: '/reflect', failLabel: '推理失败' },
};

/** @param {string} text */
function esc(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** @param {number} ms */
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return '';
  }
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/** @param {HTMLElement} el @param {'loading'|'error'|'empty'} state @param {string} [msg] */
function setResultsState(el, state, msg = '') {
  const map = {
    loading:
      '<div class="md-results-loading"><span class="ui-spinner ui-spinner--md" aria-hidden="true"></span>正在请求…</div>',
    error: `<div class="md-results-error">${esc(msg || '请求失败')}</div>`,
    empty: `<div class="md-results-empty">${esc(msg || '暂无结果')}</div>`,
  };
  el.innerHTML = map[state];
}

const MENTIONED_AT_ICON =
  '<svg class="md-recall-mentioned-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>';

/**
 * @param {string} iso
 */
function renderMentionedAt(iso) {
  const formatted = formatMemoryMentionedAt(iso);
  if (!formatted) {
    return '';
  }
  return `<time class="md-recall-mentioned" datetime="${esc(iso)}" title="${esc(iso)}">${MENTIONED_AT_ICON}<span class="md-recall-mentioned-text">${esc(formatted)}</span></time>`;
}

/**
 * @param {{ entities?: string[]; context?: string | null }} item
 */
function renderRecallMeta(item) {
  const chips = [];
  if (item.entities?.length) {
    chips.push(
      `<span class="md-recall-meta-chip"><span class="md-recall-meta-chip-label">entities</span><span class="md-recall-meta-chip-value">${esc(item.entities.join(', '))}</span></span>`
    );
  }
  if (item.context) {
    chips.push(
      `<span class="md-recall-meta-chip"><span class="md-recall-meta-chip-label">context</span><span class="md-recall-meta-chip-value">${esc(item.context)}</span></span>`
    );
  }
  return chips.length ? `<div class="md-recall-meta">${chips.join('')}</div>` : '';
}

/** @param {Array<{ type: string; text: string; context?: string | null; entities?: string[]; mentionedAt?: string | null }>} results */
function renderRecall(results) {
  if (!results.length) {
    return '<div class="md-results-empty">未检索到相关记忆</div>';
  }
  const knownTypes = new Set(['observation', 'world', 'experience']);
  return `<ul class="md-recall-list">${results
    .map((item) => {
      const typeCls = knownTypes.has(item.type) ? `md-recall-type--${item.type}` : 'md-recall-type--unknown';
      const mentioned = item.mentionedAt ? renderMentionedAt(item.mentionedAt) : '';
      const meta = renderRecallMeta(item);
      return `<li class="md-recall-item"><div class="md-recall-top"><span class="md-recall-type ${typeCls}">${esc(item.type)}</span>${mentioned}</div><p class="md-recall-text">${esc(item.text)}</p>${meta}</li>`;
    })
    .join('')}</ul>`;
}

/** @param {{ text?: string; references?: Array<{ type: string; text: string }> }} data */
function renderReflect(data) {
  const answer = (data.text ?? '').trim();
  const refs = (data.references ?? [])
    .map((r) => `<p class="md-reflect-source-item">[${esc(r.type)}] ${esc(r.text)}</p>`)
    .join('');
  if (!answer && !refs) {
    return '<div class="md-results-empty">未生成回答</div>';
  }
  return `<div class="md-reflect-body"><p class="md-reflect-answer">${esc(answer)}</p>${refs ? `<div class="md-reflect-sources"><p class="md-reflect-sources-title">参考记忆</p>${refs}</div>` : ''}</div>`;
}

/** @param {string} content */
function renderPrompt(content) {
  const text = (content ?? '').trim();
  if (!text) {
    return '<div class="md-results-empty">本轮不会注入记忆（无相关内容）</div>';
  }
  return `<pre class="md-prompt-preview">${esc(text)}</pre>`;
}

/** @param {'recall'|'prompt'|'reflect'} mode */
function setMode(mode) {
  const modal = document.getElementById(MODAL_ID);
  if (!modal) {
    return;
  }
  modal.querySelectorAll('.md-mode-tab').forEach((tab) => {
    const on = tab.getAttribute('data-mode') === mode;
    tab.classList.toggle('is-active', on);
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  modal.querySelectorAll('.md-mode-panel').forEach((panel) => {
    const on = panel.id === `memory-debug-panel-${mode}`;
    panel.classList.toggle('is-active', on);
    panel.hidden = !on;
  });
}

/**
 * @param {() => object} getApp
 */
export function createMemoryDebugModalApi(getApp) {
  let enabled = false;
  let activeMode = 'recall';
  /** @type {AbortController | null} */
  let abortController = null;

  const modal = () => document.getElementById(MODAL_ID);

  /** @param {boolean} on */
  function setSubmitsDisabled(on) {
    modal()
      ?.querySelectorAll('.md-btn-primary')
      .forEach((btn) => {
        if (btn instanceof HTMLButtonElement) {
          btn.disabled = on;
        }
      });
  }

  /** @param {string} message */
  function setUnavailable(message) {
    enabled = false;
    const el = modal();
    const banner = el?.querySelector('#memory-debug-unavailable');
    if (banner) {
      banner.textContent = message;
      banner.classList.remove('hidden');
    }
    setSubmitsDisabled(true);
  }

  async function loadMeta() {
    const el = modal();
    try {
      const meta = await fetchJson(`${API_BASE}/meta`);
      if (meta.enabled !== true) {
        setUnavailable('Hindsight 未配置，无法使用记忆调试。请在服务端配置 HINDSIGHT_API_KEY 后重试。');
        return;
      }
      enabled = true;
      el?.querySelector('#memory-debug-unavailable')?.classList.add('hidden');
      const pill = el?.querySelector('#memory-debug-bank');
      if (pill instanceof HTMLElement && typeof meta.bankId === 'string' && meta.bankId) {
        pill.textContent = `bank: ${meta.bankId}`;
        pill.classList.remove('hidden');
      } else {
        pill?.classList.add('hidden');
      }
      setSubmitsDisabled(false);
    } catch (error) {
      setUnavailable(error instanceof Error ? error.message : '无法加载调试信息');
    }
  }

  /** @param {'recall'|'prompt'|'reflect'} mode @param {AbortSignal} [signal] */
  async function runMode(mode, signal) {
    const cfg = MODES[mode];
    const root = modal();
    const queryEl = root?.querySelector(`#memory-debug-${mode}-query`);
    const resultsEl = root?.querySelector(`#memory-debug-${mode}-results`);
    const metaEl = root?.querySelector(`#memory-debug-${mode}-meta`);
    const submitEl = root?.querySelector(`#memory-debug-${mode}-submit`);
    if (!(queryEl instanceof HTMLTextAreaElement) || !resultsEl || !metaEl || !(submitEl instanceof HTMLButtonElement)) {
      return;
    }

    const query = queryEl.value.trim();
    if (!query) {
      setResultsState(resultsEl, 'error', '请输入提问内容');
      metaEl.textContent = '';
      return;
    }

    submitEl.disabled = true;
    setResultsState(resultsEl, 'loading');
    metaEl.textContent = '';

    try {
      const data = await postApiJson(`${API_BASE}${cfg.apiPath}`, { query }, signal);
      if (mode === 'recall') {
        const results = Array.isArray(data.results) ? data.results : [];
        resultsEl.innerHTML = renderRecall(results);
        const duration = formatDuration(Number(data.durationMs));
        metaEl.textContent = duration ? `${results.length} 条 · ${duration}` : `${results.length} 条`;
      } else if (mode === 'prompt') {
        const content = typeof data.content === 'string' ? data.content : '';
        resultsEl.innerHTML = renderPrompt(content);
        const chars = Number(data.charCount) || content.length;
        const duration = formatDuration(Number(data.durationMs));
        metaEl.textContent = duration
          ? `约 ${chars.toLocaleString()} 字 · ${duration}`
          : `约 ${chars.toLocaleString()} 字`;
      } else {
        resultsEl.innerHTML = renderReflect({
          text: typeof data.text === 'string' ? data.text : '',
          references: Array.isArray(data.references) ? data.references : [],
        });
        metaEl.textContent = formatDuration(Number(data.durationMs));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setResultsState(resultsEl, 'error', error instanceof Error ? error.message : cfg.failLabel);
    } finally {
      submitEl.disabled = !enabled;
    }
  }

  function bindUi() {
    const el = modal();
    if (!el || el.dataset.memoryDebugUiBound === '1') {
      return;
    }
    el.dataset.memoryDebugUiBound = '1';

    el.querySelectorAll('.md-mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode');
        if (mode === 'recall' || mode === 'prompt' || mode === 'reflect') {
          activeMode = mode;
          setMode(mode);
        }
      });
    });

    for (const mode of Object.keys(MODES)) {
      el.querySelector(`#memory-debug-${mode}-submit`)?.addEventListener('click', () => {
        if (enabled) {
          void runMode(mode, abortController?.signal);
        }
      });
    }
  }

  const trigger = document.getElementById('settings-hindsight-memory-debug');
  if (trigger && trigger.dataset.bound !== '1') {
    trigger.dataset.bound = '1';
    trigger.addEventListener('click', () => {
      if (!trigger.classList.contains('is-disabled')) {
        showMemoryDebugModal();
      }
    });
  }

  function showMemoryDebugModal() {
    if (getApp().state.hindsightMemoryEnabled !== true) {
      return;
    }
    abortController?.abort();
    abortController = new AbortController();
    bindChatModalClose(MODAL_ID, () => abortController?.abort());
    bindUi();
    setMode(activeMode);
    void loadMeta();
    openChatModal(MODAL_ID);
  }

  return { showMemoryDebugModal };
}
