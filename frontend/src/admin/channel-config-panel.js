import { escapeAttr, escapeHtml } from '../shared/escape-html.js';
import { refreshDropdownSelect } from '../shared/ui/dropdown-select.js';
import { renderToggleSwitchHtml } from '../shared/ui/toggle.js';
import { iconConfig } from './icons.js';

const PERM_OPTIONS = [
  { value: 'open', label: '自动', hint: '除黑名单外自动执行，对话中不询问' },
  { value: 'locked', label: '只读', hint: '仅只读工具可执行，其余一律拒绝' },
];

const MAX_TOOL_CALL_ROUNDS_MIN = 1;
const MAX_TOOL_CALL_ROUNDS_MAX = 100;

const MCP_FLASH_MS = 1400;
const TOOL_PROMPT_MAX_LENGTH = 1000;

/**
 * @param {number} length
 */
function formatToolPromptCharCount(length) {
  return `${length} / ${TOOL_PROMPT_MAX_LENGTH}`;
}

const MCP_ICON_TONES = ['emerald', 'sky', 'teal', 'violet', 'amber', 'rose'];

/**
 * @param {string} name
 */
function mcpNameInitial(name) {
  const trimmed = String(name).trim();
  return trimmed ? trimmed.charAt(0) : '?';
}

/**
 * @param {string} channel
 * @param {Record<string, unknown>} state
 * @returns {string}
 */
export function renderChannelConfigPanel(channel, state) {
  const profile = /** @type {Record<string, unknown>} */ (state.profile ?? {});
  const resources = /** @type {Record<string, unknown>} */ (state.resources ?? {});
  const providers = /** @type {Array<{ name: string; defaultModel: string; models: Array<{ value: string; label: string }> }>} */ (
    resources.providers ?? []
  );
  const mcpServers = /** @type {Array<{ id: string; name: string; poolEnabled: boolean }>} */ (
    resources.mcpServers ?? []
  );

  const savedVendor = typeof profile.vendor === 'string' ? profile.vendor : '';
  const effectiveVendor =
    savedVendor && providers.some((p) => p.name === savedVendor)
      ? savedVendor
      : (providers[0]?.name ?? '');
  const providerOptions = providers
    .map(
      (p) =>
        `<option value="${escapeAttr(p.name)}"${effectiveVendor === p.name ? ' selected' : ''}>${escapeHtml(p.name)}</option>`
    )
    .join('');

  const activeProvider = providers.find((p) => p.name === effectiveVendor) ?? providers[0];
  const modelOptions = renderModelOptions(activeProvider, profile.defaultModel);

  const toolsOn = Boolean(profile.enableTools);
  const selectedMcp = new Set(
    Array.isArray(profile.mcpServerIds) ? profile.mcpServerIds : []
  );
  const mcpChips =
    mcpServers.length > 0
      ? mcpServers
          .map((s, index) => {
            const selected = toolsOn && selectedMcp.has(s.id);
            const tone = MCP_ICON_TONES[index % MCP_ICON_TONES.length];
            const cardClass =
              'channel-mcp-card' +
              (selected ? ' is-selected' : '') +
              (toolsOn ? '' : ' channel-mcp-card--disabled');
            return (
              `<button type="button" class="${cardClass}" data-mcp-id="${escapeAttr(s.id)}"` +
              ` aria-pressed="${selected ? 'true' : 'false'}"${toolsOn ? '' : ' disabled'}>` +
              `<span class="channel-mcp-card__icon channel-mcp-card__icon--${tone}" aria-hidden="true">${escapeHtml(mcpNameInitial(s.name))}</span>` +
              `<span class="channel-mcp-card__name">${escapeHtml(s.name)}</span>` +
              '</button>'
            );
          })
          .join('')
      : '<p class="channel-config-empty">绑定账号尚未添加 MCP 服务，请先在「MCP 服务」中配置。</p>';

  const poolEmpty =
    providers.length === 0
      ? '<p class="channel-config-empty">绑定账号尚未配置 AI 供应商，请先在「配置管理」中配置。</p>'
      : '';

  const compactOn = Boolean(profile.enableAutoCompact);
  const compactModelOptions = renderModelOptions(activeProvider, profile.compactModel || profile.defaultModel);
  const promptsOn = Boolean(profile.enablePrompts);
  const savedToolPrompt = typeof profile.toolPrompt === 'string' ? profile.toolPrompt : '';
  const accountToolPrompt =
    typeof state.accountToolPrompt === 'string' ? state.accountToolPrompt : '';

  return (
    '<section class="panel" data-channel-config-panel>' +
    '<header class="panel__head">' +
    `<span class="panel__icon panel__icon--config" aria-hidden="true">${iconConfig}</span>` +
    '<div class="panel__head-main">' +
    '<h2 class="panel__title">渠道运行配置</h2>' +
    '<p class="panel__desc">自定义本渠道的模型、工具与安全策略；保存后仅对本渠道生效。</p>' +
    '</div></header>' +
    '<div class="panel__body channel-config-body">' +
    poolEmpty +
    '<div class="channel-config-bento">' +
    '<div class="channel-config-zone">' +
    '<h3 class="channel-config-zone__title">对话模型</h3>' +
    '<div class="channel-config-model-grid">' +
    '<div class="channel-config-field">' +
    '<label class="field-label">供应商</label>' +
    '<div class="select-wrap">' +
    `<select class="field-select channel-cfg-vendor" data-channel="${escapeAttr(channel)}"${providers.length ? '' : ' disabled'}>` +
    providerOptions +
    '</select></div></div>' +
    '<div class="channel-config-field">' +
    '<label class="field-label">模型</label>' +
    '<div class="select-wrap">' +
    `<select class="field-select channel-cfg-model" data-channel="${escapeAttr(channel)}"${providers.length ? '' : ' disabled'}>` +
    modelOptions +
    '</select></div></div>' +
    '<div class="channel-config-field">' +
    '<label class="field-label">温度</label>' +
    `<input type="number" class="field-input channel-cfg-temperature" step="0.1" min="0" max="2" value="${numVal(profile.temperature, 0.7)}">` +
    '</div>' +
    '<div class="channel-config-field">' +
    '<label class="field-label">最大输出</label>' +
    `<input type="number" class="field-input channel-cfg-max-tokens" min="1" step="1" value="${numVal(profile.maxTokens, 2048)}">` +
    '</div></div></div>' +
    '<div class="channel-config-zone channel-config-zone--compact">' +
    '<h3 class="channel-config-zone__title">上下文管理</h3>' +
    '<div class="channel-config-context-head">' +
    '<span class="field-label">压缩模型</span>' +
    '</div>' +
    '<div class="channel-config-context-row">' +
    '<label class="channel-config-context-chip channel-toggle">' +
    `<input type="checkbox" class="channel-cfg-auto-compact"${compactOn ? ' checked' : ''}>` +
    '<span>自动压缩</span></label>' +
    '<div class="channel-cfg-compact-wrap' +
    (compactOn ? '' : ' channel-cfg-compact-wrap--off') +
    '">' +
    '<div class="select-wrap">' +
    `<select class="field-select channel-cfg-compact-model"${!compactOn || !providers.length ? ' disabled' : ''}>` +
    compactModelOptions +
    '</select></div></div></div>' +
    '<p class="channel-config-context-foot">开启后，系统将根据上下文长度自动压缩历史消息</p></div>' +
    '<div class="channel-config-zone channel-config-zone--full">' +
    '<div class="channel-config-zone__head channel-mcp-head">' +
    '<div class="channel-mcp-head__text">' +
    '<h3 class="channel-config-zone__title">MCP 工具</h3>' +
    '<p class="channel-config-zone__hint">选择在本渠道启用的服务，支持多选</p>' +
    '</div>' +
    '<div class="channel-mcp-enable-row">' +
    '<span class="channel-mcp-enable-label">启用 MCP 工具</span>' +
    renderToggleSwitchHtml({ checked: toolsOn, inputClass: 'channel-cfg-enable-tools' }) +
    '</div></div>' +
    `<div class="channel-mcp-list${toolsOn ? '' : ' channel-mcp-list--off'}" data-mcp-list>${mcpChips}</div>` +
    '</div>' +
    '<div class="channel-config-zone channel-config-zone--full">' +
    '<h3 class="channel-config-zone__title">工具调用</h3>' +
    '<div class="channel-config-strip channel-config-strip--tools">' +
    '<div class="channel-config-tools-row">' +
    '<div class="channel-config-tools-perms">' +
    '<span class="field-label">工具权限</span>' +
    '<div class="channel-perm-cards" role="radiogroup" aria-label="工具权限">' +
    PERM_OPTIONS.map((opt) => {
      const active = profile.permissionMode === opt.value;
      return (
        `<button type="button" class="channel-perm-card${active ? ' is-selected' : ''}" data-perm="${opt.value}"` +
        ` aria-pressed="${active ? 'true' : 'false'}">` +
        '<span class="channel-perm-card__radio" aria-hidden="true"></span>' +
        `<span class="channel-perm-card__title">${escapeHtml(opt.label)}</span>` +
        `<span class="channel-perm-card__hint">${escapeHtml(opt.hint)}</span>` +
        '</button>'
      );
    }).join('') +
    '</div></div>' +
    '<div class="channel-config-tools-limit">' +
    `<label class="field-label" for="channel-max-rounds-${channel}">单轮工具上限</label>` +
    '<div class="channel-cfg-stepper">' +
    `<button type="button" class="channel-cfg-stepper__btn" data-step="-1" aria-label="减少">−</button>` +
    `<input id="channel-max-rounds-${channel}" type="number" class="channel-cfg-stepper__input channel-cfg-max-rounds" min="${MAX_TOOL_CALL_ROUNDS_MIN}" max="${MAX_TOOL_CALL_ROUNDS_MAX}" step="1" value="${numVal(profile.maxToolCallRounds, 25)}">` +
    `<button type="button" class="channel-cfg-stepper__btn" data-step="1" aria-label="增加">+</button>` +
    '</div>' +
    '<p class="channel-config-tools-limit__hint">单轮对话中最多允许调用的工具次数</p></div></div>' +
    '<div class="channel-cfg-prompt-card" data-account-tool-prompt="' +
    escapeAttr(accountToolPrompt) +
    '">' +
    '<label class="channel-cfg-prompt-head channel-toggle">' +
    `<input type="checkbox" class="channel-cfg-enable-prompts"${promptsOn ? ' checked' : ''}>` +
    '<span class="channel-cfg-prompt-title">用户提示词</span></label>' +
    '<div class="channel-cfg-prompt-editor' +
    (promptsOn ? '' : ' channel-cfg-prompt-editor--off') +
    '">' +
    `<textarea class="channel-cfg-tool-prompt" rows="5" maxlength="${TOOL_PROMPT_MAX_LENGTH}"` +
    ` placeholder="可编写本渠道最终注入的提示词，保存后生效"${promptsOn ? '' : ' disabled'}>${escapeHtml(savedToolPrompt)}</textarea>` +
    `<span class="channel-cfg-prompt-count">${formatToolPromptCharCount(savedToolPrompt.length)}</span>` +
    '</div></div></div></div></div>' +
    '<footer class="channel-config-actions">' +
    '<div class="channel-config-actions__btns">' +
    `<button type="button" class="channel-config-btn channel-config-btn--secondary channel-cfg-fill-defaults" data-channel="${escapeAttr(channel)}">恢复默认配置</button>` +
    `<button type="button" class="channel-config-btn channel-config-btn--primary channel-cfg-save" data-channel="${escapeAttr(channel)}">保存配置</button>` +
    '</div>' +
    `<p class="save-feedback save-feedback--ok hidden" data-config-ok="${escapeAttr(channel)}"></p>` +
    `<p class="save-feedback save-feedback--err hidden" data-config-err="${escapeAttr(channel)}"></p>` +
    '</footer></div></section>'
  );
}

/**
 * @param {{ name: string; defaultModel: string; models: Array<{ value: string; label: string }> } | undefined} provider
 * @param {unknown} selected
 * @returns {string}
 */
function renderModelOptions(provider, selected) {
  if (!provider) {
    return '<option value="">—</option>';
  }
  const values = new Map();
  values.set(provider.defaultModel, provider.defaultModel);
  for (const m of provider.models) {
    values.set(m.value, m.label || m.value);
  }
  const selectedVal = typeof selected === 'string' ? selected : provider.defaultModel;
  return [...values.entries()]
    .map(
      ([value, label]) =>
        `<option value="${escapeAttr(value)}"${value === selectedVal ? ' selected' : ''}>${escapeHtml(label)}</option>`
    )
    .join('');
}

/**
 * @param {HTMLElement} panel
 * @param {Record<string, unknown>} state
 */
export function syncModelSelects(panel, state) {
  const resources = /** @type {Record<string, unknown>} */ (state.resources ?? {});
  const providers = /** @type {Array<{ name: string; defaultModel: string; models: Array<{ value: string; label: string }> }>} */ (
    resources.providers ?? []
  );
  const vendorSelect = panel.querySelector('.channel-cfg-vendor');
  const modelSelect = panel.querySelector('.channel-cfg-model');
  const compactSelect = panel.querySelector('.channel-cfg-compact-model');
  if (!(vendorSelect instanceof HTMLSelectElement)) return;

  const provider = providers.find((p) => p.name === vendorSelect.value);
  if (modelSelect instanceof HTMLSelectElement) {
    const prev = modelSelect.value;
    modelSelect.innerHTML = renderModelOptions(provider, prev);
    refreshDropdownSelect(modelSelect);
  }
  if (compactSelect instanceof HTMLSelectElement) {
    const prev = compactSelect.value;
    compactSelect.innerHTML = renderModelOptions(provider, prev);
    refreshDropdownSelect(compactSelect);
  }
}

/**
 * @param {HTMLElement} panel
 * @returns {Record<string, unknown>}
 */
export function collectChannelConfigForm(panel) {
  const vendorEl = panel.querySelector('.channel-cfg-vendor');
  const modelEl = panel.querySelector('.channel-cfg-model');
  const tempEl = panel.querySelector('.channel-cfg-temperature');
  const maxTokEl = panel.querySelector('.channel-cfg-max-tokens');
  const enableToolsEl = panel.querySelector('.channel-cfg-enable-tools');
  const enablePromptsEl = panel.querySelector('.channel-cfg-enable-prompts');
  const toolPromptEl = panel.querySelector('.channel-cfg-tool-prompt');
  const autoCompactEl = panel.querySelector('.channel-cfg-auto-compact');
  const compactModelEl = panel.querySelector('.channel-cfg-compact-model');
  const maxRoundsEl = panel.querySelector('.channel-cfg-max-rounds');
  const permBtn = panel.querySelector('.channel-perm-card.is-selected');

  const toolsEnabled = enableToolsEl instanceof HTMLInputElement ? enableToolsEl.checked : false;
  const mcpIds = toolsEnabled
    ? [...panel.querySelectorAll('.channel-mcp-card.is-selected')]
        .map((el) => (el instanceof HTMLButtonElement ? el.dataset.mcpId : ''))
        .filter(Boolean)
    : [];

  const promptsEnabled =
    enablePromptsEl instanceof HTMLInputElement ? enablePromptsEl.checked : false;

  const payload = {
    vendor: vendorEl instanceof HTMLSelectElement && vendorEl.value ? vendorEl.value : null,
    defaultModel: modelEl instanceof HTMLSelectElement ? modelEl.value : '',
    temperature: tempEl instanceof HTMLInputElement ? Number(tempEl.value) : 0.7,
    maxTokens: maxTokEl instanceof HTMLInputElement ? Number(maxTokEl.value) : 2048,
    enableTools: toolsEnabled,
    enablePrompts: promptsEnabled,
    permissionMode: permBtn instanceof HTMLButtonElement ? permBtn.dataset.perm : 'locked',
    enableAutoCompact: autoCompactEl instanceof HTMLInputElement ? autoCompactEl.checked : false,
    compactModel:
      autoCompactEl instanceof HTMLInputElement && autoCompactEl.checked && compactModelEl instanceof HTMLSelectElement
        ? compactModelEl.value
        : null,
    mcpServerIds: mcpIds,
    maxToolCallRounds: maxRoundsEl instanceof HTMLInputElement ? Number(maxRoundsEl.value) : 25,
  };

  if (promptsEnabled && toolPromptEl instanceof HTMLTextAreaElement) {
    payload.toolPrompt = toolPromptEl.value;
  }

  return payload;
}

/**
 * @param {HTMLElement} panel
 * @param {boolean} enabled
 */
export function syncToolPromptEnabled(panel, enabled) {
  const editor = panel.querySelector('.channel-cfg-prompt-editor');
  const textarea = panel.querySelector('.channel-cfg-tool-prompt');
  editor?.classList.toggle('channel-cfg-prompt-editor--off', !enabled);
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.disabled = !enabled;
  }
}

/**
 * @param {HTMLElement} panel
 */
/**
 * @param {HTMLInputElement} input
 */
export function clampMaxToolCallRounds(input) {
  const raw = Number(input.value);
  const next = Number.isFinite(raw)
    ? Math.min(MAX_TOOL_CALL_ROUNDS_MAX, Math.max(MAX_TOOL_CALL_ROUNDS_MIN, Math.floor(raw)))
    : MAX_TOOL_CALL_ROUNDS_MIN;
  input.value = String(next);
}

export function syncToolPromptCharCount(panel) {
  const textarea = panel.querySelector('.channel-cfg-tool-prompt');
  const countEl = panel.querySelector('.channel-cfg-prompt-count');
  if (!(textarea instanceof HTMLTextAreaElement) || !(countEl instanceof HTMLElement)) {
    return;
  }
  countEl.textContent = formatToolPromptCharCount(textarea.value.length);
}

export function syncMcpToolsEnabled(panel, enabled) {
  const list = panel.querySelector('.channel-mcp-list');
  list?.classList.toggle('channel-mcp-list--off', !enabled);
  panel.querySelectorAll('.channel-mcp-card').forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    el.disabled = !enabled;
    if (!enabled) {
      el.classList.remove('is-selected');
      el.setAttribute('aria-pressed', 'false');
    }
    el.classList.toggle('channel-mcp-card--disabled', !enabled);
  });
}

/**
 * @param {HTMLElement} panel
 * @param {Array<{ id: string; name: string }>} unreachable
 */
export function flashMcpProbeFailures(panel, skipped) {
  if (!Array.isArray(skipped) || skipped.length === 0) return;
  const skippedIds = new Set(skipped.map((item) => item.id));
  panel.querySelectorAll('.channel-mcp-card').forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    if (!skippedIds.has(el.dataset.mcpId ?? '')) return;
    el.classList.add('channel-mcp-card--flash-fail');
    window.setTimeout(() => {
      el.classList.remove('channel-mcp-card--flash-fail');
    }, MCP_FLASH_MS);
  });
}

/**
 * @param {HTMLElement} panel
 * @param {Record<string, unknown>} state
 */
export function applyAccountDefaultsToForm(panel, state) {
  const defaults = /** @type {Record<string, unknown>} */ (state.accountDefaults ?? {});
  const vendorEl = panel.querySelector('.channel-cfg-vendor');
  if (vendorEl instanceof HTMLSelectElement && typeof defaults.vendor === 'string') {
    vendorEl.value = defaults.vendor;
    syncModelSelects(panel, state);
    refreshDropdownSelect(vendorEl);
  }
  const modelEl = panel.querySelector('.channel-cfg-model');
  if (modelEl instanceof HTMLSelectElement && typeof defaults.defaultModel === 'string') {
    modelEl.value = defaults.defaultModel;
    refreshDropdownSelect(modelEl);
  }
  const compactEl = panel.querySelector('.channel-cfg-compact-model');
  if (compactEl instanceof HTMLSelectElement && typeof defaults.defaultModel === 'string') {
    compactEl.value = defaults.defaultModel;
    refreshDropdownSelect(compactEl);
  }
  const accountPrompt =
    typeof state.accountToolPrompt === 'string'
      ? state.accountToolPrompt
      : (panel.querySelector('.channel-cfg-prompt-card')?.dataset.accountToolPrompt ?? '');
  const toolPromptEl = panel.querySelector('.channel-cfg-tool-prompt');
  if (toolPromptEl instanceof HTMLTextAreaElement) {
    toolPromptEl.value = accountPrompt.slice(0, TOOL_PROMPT_MAX_LENGTH);
    syncToolPromptCharCount(panel);
  }
}

/**
 * @param {number | null | undefined} value
 * @param {number} fallback
 */
function numVal(value, fallback) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
}
