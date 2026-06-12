import './style.css';
import { iconBind, iconMessage, iconSeed, iconUser, iconUsers } from './icons.js';
import {
  applyAccountDefaultsToForm,
  clampMaxToolCallRounds,
  collectChannelConfigForm,
  flashMcpProbeFailures,
  renderChannelConfigPanel,
  syncMcpToolsEnabled,
  syncModelSelects,
  syncToolPromptCharCount,
  syncToolPromptEnabled,
} from './channel-config-panel.js';
import { mountNavbar } from '../shared/navbar.js';
import { openAuthModal } from '../auth/auth-modal.js';
import { getSession } from '../auth/session.js';
import {
  mountDropdownSelectsIn,
  refreshDropdownSelect,
  syncDropdownSelectState,
} from '../shared/ui/dropdown-select.js';
import { renderStatusPill } from '../shared/ui/status-pill.js';
import { showToast } from '../shared/ui/toast.js';

mountNavbar();

const ADMIN_API = '/api/admin';
const USERS_API = '/api/users';

const IM_CHANNELS = [
  { key: 'dingtalk', label: '钉钉', badge: '钉', iconClass: 'channel-item__icon--ding' },
  { key: 'feishu', label: '飞书', badge: '飞', iconClass: 'channel-item__icon--feishu' },
];

const SUPERADMIN_ROLE = 'SUPERADMIN';

const CONFIG_RELOAD_DEBOUNCE_MS = 300;
const CHANNEL_STATUS_POLL_INTERVAL_MS = 2000;
const CHANNEL_STATUS_POLL_DURATION_MS = 30000;

const els = {
  emptyState: document.getElementById('empty-state'),
  forbiddenState: document.getElementById('forbidden-state'),
  workspace: document.getElementById('workspace'),
  authMount: document.getElementById('auth-mount'),
  authError: document.getElementById('auth-error'),
  sectionTabs: document.getElementById('section-tabs'),
  channelRail: document.getElementById('channel-rail'),
  channelMain: document.getElementById('channel-main'),
  seedPanel: document.getElementById('seed-panel'),
  usersPanel: document.getElementById('users-panel'),
};

const state = {
  currentUser: null,
  activeTab: 'users',
  activeChannel: 'dingtalk',
  channelStatus: { dingtalk: 'skipped', feishu: 'skipped' },
  allUsers: [],
  routesByChannel: {},
  seedFollow: { userId: null, username: null },
  bindingDraft: {},
  channelConfigByChannel: {},
  configDebounceTimers: {},
  configRequestGen: {},
  channelsMounted: false,
  channelStacks: {},
};

/** @type {ReturnType<typeof setInterval> | null} */
let channelStatusPollId = null;

function show(el, visible) {
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

function setText(el, text) {
  if (!el) return;
  if (text) {
    el.textContent = text;
    show(el, true);
  } else {
    el.textContent = '';
    show(el, false);
  }
}

async function apiFetch(base, path, init) {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(base + path, { ...init, headers, credentials: 'include' });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  if (!res.ok) {
    const msg = data?.details || data?.error || res.statusText || '请求失败';
    throw new Error(String(msg));
  }
  return data;
}

const adminFetch = (path, init) => apiFetch(ADMIN_API, path, init);
const usersFetch = (path, init) => apiFetch(USERS_API, path, init);

function renderAuthPanel() {
  if (!els.authMount) return;
  const prompt = document.createElement('div');
  prompt.className = 'flex flex-col items-center gap-4 text-center';
  prompt.innerHTML =
    '<p class="text-sm leading-relaxed text-[var(--color-text-muted)]">登录后管理用户账号与 IM 渠道绑定</p>';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-primary btn-block min-h-11 text-sm';
  btn.textContent = '登录';
  btn.addEventListener('click', () =>
    openAuthModal({ onSuccess: () => void bootstrap(), lead: '登录后管理高级配置' })
  );
  prompt.appendChild(btn);
  els.authMount.replaceChildren(prompt);
}

function setView(mode) {
  const connected = mode === 'ready';
  show(els.emptyState, mode === 'guest');
  show(els.forbiddenState, mode === 'forbidden');
  show(els.workspace, mode === 'ready');
  document.getElementById('app')?.classList.toggle('admin-shell--connected', connected);
  document.body.classList.toggle('admin-page--connected', connected);
  if (mode === 'guest') renderAuthPanel();
}

function linkDotClass(status) {
  if (status === 'connected') return 'channel-link-dot channel-link-dot--ok';
  if (status === 'connecting') return 'channel-link-dot channel-link-dot--pending';
  if (status === 'disconnected') return 'channel-link-dot channel-link-dot--err';
  return 'channel-link-dot channel-link-dot--off';
}

function linkDotTitle(status) {
  if (status === 'connected') return 'SDK 已连接';
  if (status === 'connecting') return 'SDK 连接中';
  if (status === 'disconnected') return 'SDK 连接失败';
  return '未配置凭证';
}

function hasConnectingChannelStatus() {
  return IM_CHANNELS.some((ch) => state.channelStatus[ch.key] === 'connecting');
}

function stopChannelStatusPoll() {
  if (channelStatusPollId) {
    clearInterval(channelStatusPollId);
    channelStatusPollId = null;
  }
}

async function syncChannelStatus() {
  const status = await adminFetch('/channel-status');
  const next = {
    dingtalk: status?.dingtalk ?? 'skipped',
    feishu: status?.feishu ?? 'skipped',
  };
  const changed =
    next.dingtalk !== state.channelStatus.dingtalk || next.feishu !== state.channelStatus.feishu;
  state.channelStatus = next;
  if (state.channelsMounted) {
    refreshChannelRailStatus();
  }
  return changed;
}

function startChannelStatusPoll() {
  stopChannelStatusPoll();
  const deadline = Date.now() + CHANNEL_STATUS_POLL_DURATION_MS;
  let unchangedStreak = 0;

  const poll = async () => {
    if (Date.now() > deadline) {
      stopChannelStatusPoll();
      return;
    }
    try {
      const changed = await syncChannelStatus();
      unchangedStreak = changed ? 0 : unchangedStreak + 1;
      if (!hasConnectingChannelStatus() && unchangedStreak >= 2) {
        stopChannelStatusPoll();
      }
    } catch {
      // 轮询期间忽略瞬时网络错误
    }
  };

  channelStatusPollId = setInterval(() => {
    void poll();
  }, CHANNEL_STATUS_POLL_INTERVAL_MS);
  void poll();
}

/**
 * 渠道通配路由（matchKey=*）。RouteRule 已全局化，不再按 userId 过滤。
 * @param {string} channel
 * @returns {{ id: string; boundUserId?: string | null; matchKey: string } | undefined}
 */
function getWildcardRoute(channel) {
  const routes = state.routesByChannel[channel] ?? [];
  return routes.find((r) => r.matchKey === '*');
}

function getSavedBoundUserId(channel) {
  return getWildcardRoute(channel)?.boundUserId ?? null;
}

/**
 * 与绑定面板展示一致：草稿 → 已保存 → 下拉当前值 → 种子/首用户。
 * @param {string} channel
 * @returns {string | null}
 */
function resolveBindingUserId(channel) {
  const draftId = state.bindingDraft[channel];
  if (draftId !== undefined && draftId !== '') {
    return draftId;
  }

  const savedId = getSavedBoundUserId(channel);
  if (savedId) {
    return savedId;
  }

  const select = getBindingSelect(channel);
  if (select?.value) {
    return select.value;
  }

  const fallbackId = state.seedFollow.userId ?? state.allUsers[0]?.id ?? null;
  return fallbackId || null;
}

function usernameById(userId) {
  if (!userId) return null;
  const user = state.allUsers.find((u) => u.id === userId);
  return user?.username ?? userId.slice(0, 8);
}

function switchTab(tab) {
  state.activeTab = tab;
  els.sectionTabs?.querySelectorAll('.section-tab').forEach((btn) => {
    const selected = btn.getAttribute('data-tab') === tab;
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    const paneId = btn.getAttribute('aria-controls');
    const pane = paneId ? document.getElementById(paneId) : null;
    if (pane) {
      pane.hidden = !selected;
      pane.classList.toggle('hidden', !selected);
    }
  });
  if (tab === 'users') renderUsersTab();
  if (tab === 'channels') void showChannelsTab();
}

function getChannelStack(channel) {
  return state.channelStacks[channel] ?? null;
}

function getBindingSelect(channel) {
  const stack = getChannelStack(channel);
  const select = stack?.querySelector(`.bound-user-select[data-channel="${channel}"]`);
  return select instanceof HTMLSelectElement ? select : null;
}

function renderChannelRailButton(ch) {
  const status = state.channelStatus[ch.key] ?? 'skipped';
  const active = state.activeChannel === ch.key;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'channel-item' + (active ? ' is-active' : '');
  btn.dataset.channel = ch.key;
  btn.innerHTML =
    `<span class="channel-item__icon ${ch.iconClass}" aria-hidden="true">${ch.badge}</span>` +
    '<span>' +
    '<span class="channel-item__name-row">' +
    `<span class="${linkDotClass(status)}" data-link-dot title="${linkDotTitle(status)}" aria-label="${linkDotTitle(status)}"></span>` +
    `<span class="channel-item__name">${ch.label}</span>` +
    '</span>' +
    '<span class="channel-item__meta">default</span>' +
    '</span>';
  return btn;
}

function mountChannelRail() {
  if (!els.channelRail || els.channelRail.dataset.mounted === '1') return;
  els.channelRail.dataset.mounted = '1';
  els.channelRail.replaceChildren(...IM_CHANNELS.map((ch) => renderChannelRailButton(ch)));
}

function updateChannelRailActive() {
  els.channelRail?.querySelectorAll('.channel-item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.channel === state.activeChannel);
  });
}

function refreshChannelRailStatus() {
  if (!els.channelRail) return;
  for (const ch of IM_CHANNELS) {
    const btn = els.channelRail.querySelector(`.channel-item[data-channel="${ch.key}"]`);
    const dot = btn?.querySelector('[data-link-dot]');
    if (!dot) continue;
    const status = state.channelStatus[ch.key] ?? 'skipped';
    dot.className = linkDotClass(status);
    dot.title = linkDotTitle(status);
    dot.setAttribute('aria-label', linkDotTitle(status));
  }
}

function bindChannelEvents() {
  if (els.channelRail && els.channelRail.dataset.bound !== '1') {
    els.channelRail.dataset.bound = '1';
    els.channelRail.addEventListener('click', (event) => {
      const btn = event.target.closest('.channel-item');
      if (!(btn instanceof HTMLButtonElement)) return;
      const channel = btn.dataset.channel;
      if (!channel || channel === state.activeChannel) return;
      state.activeChannel = channel;
      updateChannelRailActive();
      showChannelStack(channel);
    });
  }

  if (els.channelMain && els.channelMain.dataset.bound !== '1') {
    els.channelMain.dataset.bound = '1';
    els.channelMain.addEventListener('change', (event) => {
      const select = event.target.closest('.bound-user-select[data-channel]');
      if (select instanceof HTMLSelectElement) {
        const channel = select.dataset.channel;
        if (channel) {
          state.bindingDraft[channel] = select.value;
          scheduleChannelConfigReload(channel);
        }
        return;
      }
      const vendorSelect = event.target.closest('.channel-cfg-vendor');
      if (vendorSelect instanceof HTMLSelectElement) {
        const channel = vendorSelect.dataset.channel;
        const panel = vendorSelect.closest('[data-channel-config-panel]');
        if (channel && panel instanceof HTMLElement) {
          syncModelSelects(panel, state.channelConfigByChannel[channel] ?? {});
        }
        return;
      }
      const autoCompact = event.target.closest('.channel-cfg-auto-compact');
      if (autoCompact instanceof HTMLInputElement) {
        const panel = autoCompact.closest('[data-channel-config-panel]');
        const wrap = panel?.querySelector('.channel-cfg-compact-wrap');
        const select = panel?.querySelector('.channel-cfg-compact-model');
        const on = autoCompact.checked;
        wrap?.classList.toggle('channel-cfg-compact-wrap--off', !on);
        if (select instanceof HTMLSelectElement) {
          const vendorSelect = panel?.querySelector('.channel-cfg-vendor');
          const hasProviders =
            vendorSelect instanceof HTMLSelectElement && !vendorSelect.disabled;
          select.disabled = !on || !hasProviders;
          syncDropdownSelectState(select);
        }
      }
      const enableTools = event.target.closest('.channel-cfg-enable-tools');
      if (enableTools instanceof HTMLInputElement) {
        const panel = enableTools.closest('[data-channel-config-panel]');
        if (panel instanceof HTMLElement) {
          syncMcpToolsEnabled(panel, enableTools.checked);
        }
        return;
      }
      const enablePrompts = event.target.closest('.channel-cfg-enable-prompts');
      if (enablePrompts instanceof HTMLInputElement) {
        const panel = enablePrompts.closest('[data-channel-config-panel]');
        if (panel instanceof HTMLElement) {
          syncToolPromptEnabled(panel, enablePrompts.checked);
        }
        return;
      }
      const toolPromptInput = event.target.closest('.channel-cfg-tool-prompt');
      if (toolPromptInput instanceof HTMLTextAreaElement) {
        const panel = toolPromptInput.closest('[data-channel-config-panel]');
        if (panel instanceof HTMLElement) {
          syncToolPromptCharCount(panel);
        }
        return;
      }
      const maxRoundsInput = event.target.closest('.channel-cfg-max-rounds');
      if (maxRoundsInput instanceof HTMLInputElement) {
        clampMaxToolCallRounds(maxRoundsInput);
      }
    });
    els.channelMain.addEventListener('click', (event) => {
      const mcpChip = event.target.closest('.channel-mcp-card');
      if (mcpChip instanceof HTMLButtonElement && !mcpChip.disabled) {
        const selected = !mcpChip.classList.contains('is-selected');
        mcpChip.classList.toggle('is-selected', selected);
        mcpChip.setAttribute('aria-pressed', selected ? 'true' : 'false');
        return;
      }
      const saveBindingBtn = event.target.closest('[data-save-binding]');
      if (saveBindingBtn instanceof HTMLButtonElement) {
        const channel = saveBindingBtn.dataset.saveBinding;
        if (channel) void saveBinding(channel);
        return;
      }
      const saveConfigBtn = event.target.closest('.channel-cfg-save');
      if (saveConfigBtn instanceof HTMLButtonElement) {
        const channel = saveConfigBtn.dataset.channel;
        if (channel) void saveChannelConfig(channel);
        return;
      }
      const fillBtn = event.target.closest('.channel-cfg-fill-defaults');
      if (fillBtn instanceof HTMLButtonElement) {
        const channel = fillBtn.dataset.channel;
        if (!channel) return;
        const panel = getChannelStack(channel)?.querySelector('[data-channel-config-panel]');
        const cfg = state.channelConfigByChannel[channel];
        if (panel instanceof HTMLElement && cfg) {
          applyAccountDefaultsToForm(panel, cfg);
        }
        return;
      }
      const permCard = event.target.closest('.channel-perm-card');
      if (permCard instanceof HTMLButtonElement) {
        const panel = permCard.closest('[data-channel-config-panel]');
        panel?.querySelectorAll('.channel-perm-card').forEach((b) => {
          const on = b === permCard;
          b.classList.toggle('is-selected', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        return;
      }
      const stepperBtn = event.target.closest('.channel-cfg-stepper__btn');
      if (stepperBtn instanceof HTMLButtonElement) {
        const panel = stepperBtn.closest('[data-channel-config-panel]');
        const input = panel?.querySelector('.channel-cfg-max-rounds');
        const step = Number(stepperBtn.dataset.step);
        if (input instanceof HTMLInputElement && (step === 1 || step === -1)) {
          const current = Number(input.value);
          input.value = String((Number.isFinite(current) ? current : 25) + step);
          clampMaxToolCallRounds(input);
        }
      }
    });
  }
}

function mountChannelStacks() {
  if (!els.channelMain) return;
  for (const ch of IM_CHANNELS) {
    if (state.channelStacks[ch.key]) continue;
    const stack = document.createElement('div');
    stack.className = 'channel-stack flex flex-col gap-4';
    stack.dataset.channel = ch.key;
    stack.hidden = true;
    stack.innerHTML = renderBindingPanel(ch.key) + renderConfigPlaceholder();
    els.channelMain.appendChild(stack);
    state.channelStacks[ch.key] = stack;
    mountDropdownSelectsIn(stack);
  }
}

function ensureChannelsTabMounted() {
  if (state.channelsMounted) return;
  mountChannelRail();
  mountChannelStacks();
  bindChannelEvents();
  state.channelsMounted = true;
}

async function showChannelsTab() {
  ensureChannelsTabMounted();
  updateChannelRailActive();
  try {
    await syncChannelStatus();
  } catch {
    refreshChannelRailStatus();
  }
  startChannelStatusPoll();
  showChannelStack(state.activeChannel);
}

function showChannelStack(channel) {
  for (const [key, stack] of Object.entries(state.channelStacks)) {
    stack.hidden = key !== channel;
  }
  void ensureChannelConfigForChannel(channel);
}

/** 胶囊仅反映已保存绑定（与种子账号面板一致，下拉草稿不更新胶囊） */
function bindingPillHtml(channel) {
  const savedId = getSavedBoundUserId(channel);
  if (!savedId) {
    return renderStatusPill('未配置', 'warn');
  }
  return renderStatusPill(usernameById(savedId) ?? '', 'ok');
}

function renderBindingPanel(channel) {
  const savedId = getSavedBoundUserId(channel);
  const fallbackId = state.seedFollow.userId ?? state.allUsers[0]?.id ?? '';
  const draftId = state.bindingDraft[channel];
  const selectedId = draftId !== undefined ? draftId : (savedId ?? fallbackId);
  const options = state.allUsers
    .map((u) => `<option value="${u.id}"${selectedId === u.id ? ' selected' : ''}>${u.username || u.email}</option>`)
    .join('');

  return (
    '<section class="panel panel--bind-compact">' +
    '<div class="bind-toolbar">' +
    '<div class="bind-toolbar__lead">' +
    `<span class="bind-toolbar__icon" aria-hidden="true">${iconBind}</span>` +
    '<div class="bind-toolbar__text">' +
    '<h2 class="bind-toolbar__title">渠道绑定账号</h2>' +
    '<p class="bind-toolbar__desc">指定本渠道使用的服务账号，决定可选的模型与 MCP</p>' +
    '</div></div>' +
    '<div class="bind-toolbar__form">' +
    '<div class="bind-toolbar__field">' +
    '<label class="field-label" for="bound-user-' + channel + '">绑定账号</label>' +
    '<div class="select-wrap">' +
    `<select class="field-select bound-user-select" id="bound-user-${channel}" data-channel="${channel}">${options}</select>` +
    '</div></div>' +
    '<div class="bind-toolbar__actions">' +
    `<button type="button" class="btn-primary bind-toolbar__save" data-save-binding="${channel}">保存绑定</button>` +
    `<span data-binding-meta>${bindingPillHtml(channel)}</span>` +
    '</div></div></div>' +
    '<div class="bind-toolbar__feedback">' +
    `<p class="save-feedback save-feedback--ok hidden" data-binding-ok="${channel}"></p>` +
    `<p class="save-feedback save-feedback--err hidden" data-binding-err="${channel}"></p>` +
    '</div></section>'
  );
}

function renderConfigPlaceholder() {
  return (
    '<section class="panel" data-channel-config-panel data-config-loading>' +
    '<div class="panel__body text-sm text-[var(--color-text-muted)]">加载配置中…</div>' +
    '</section>'
  );
}

function updateBindingMeta(channel) {
  const stack = getChannelStack(channel);
  const meta = stack?.querySelector('[data-binding-meta]');
  if (meta) meta.innerHTML = bindingPillHtml(channel);
}

function refreshBindingSelect(channel) {
  const select = getBindingSelect(channel);
  if (!select) return;
  const savedId = getSavedBoundUserId(channel);
  const fallbackId = state.seedFollow.userId ?? state.allUsers[0]?.id ?? '';
  const draftId = state.bindingDraft[channel];
  const selectedId = draftId !== undefined ? draftId : (savedId ?? fallbackId);
  select.innerHTML = state.allUsers
    .map(
      (u) =>
        `<option value="${u.id}"${selectedId === u.id ? ' selected' : ''}>${u.username || u.email}</option>`
    )
    .join('');
  refreshDropdownSelect(select);
  updateBindingMeta(channel);
}

function refreshAllBindingPanels() {
  for (const ch of IM_CHANNELS) {
    refreshBindingSelect(ch.key);
  }
}

function updateConfigPanel(channel, configState) {
  const stack = getChannelStack(channel);
  const existing = stack?.querySelector('[data-channel-config-panel]');
  if (!existing) return;
  existing.outerHTML = renderChannelConfigPanel(channel, configState);
  const panel = stack.querySelector('[data-channel-config-panel]');
  if (panel) mountDropdownSelectsIn(panel);
}

function applyAccountDefaultsToChannelPanel(channel, configState) {
  const stack = getChannelStack(channel);
  const panel = stack?.querySelector('[data-channel-config-panel]');
  if (panel instanceof HTMLElement && configState) {
    applyAccountDefaultsToForm(panel, configState);
  }
}

function invalidateChannelConfig(channel) {
  delete state.channelConfigByChannel[channel];
  state.configRequestGen[channel] = (state.configRequestGen[channel] ?? 0) + 1;
}

async function loadChannelConfig(channel) {
  const boundUserId = resolveBindingUserId(channel);
  const qs = new URLSearchParams({ channel });
  if (boundUserId) qs.set('boundUserId', boundUserId);
  const configState = await adminFetch('/channel-config?' + qs.toString());
  state.channelConfigByChannel[channel] = configState;
  return configState;
}

async function ensureChannelConfigForChannel(channel, options = {}) {
  const { force = false, applyAccountDefaults = false } = options;
  const stack = getChannelStack(channel);
  if (!stack) return null;

  const cached = state.channelConfigByChannel[channel];
  if (cached && !force) {
    updateConfigPanel(channel, cached);
    return cached;
  }

  const requestGen = (state.configRequestGen[channel] ?? 0) + 1;
  state.configRequestGen[channel] = requestGen;

  const loading = stack.querySelector('[data-channel-config-panel]');
  if (loading) {
    loading.innerHTML =
      '<div class="panel__body text-sm text-[var(--color-text-muted)]">加载配置中…</div>';
  }

  try {
    const configState = await loadChannelConfig(channel);
    if (state.configRequestGen[channel] !== requestGen) return configState;
    if (state.activeTab === 'channels' && state.activeChannel === channel) {
      updateConfigPanel(channel, configState);
      if (applyAccountDefaults) {
        applyAccountDefaultsToChannelPanel(channel, configState);
      }
    }
    return configState;
  } catch (error) {
    if (state.configRequestGen[channel] !== requestGen) return null;
    if (state.activeTab === 'channels' && state.activeChannel === channel && loading) {
      loading.innerHTML =
        '<div class="panel__body text-sm text-[var(--color-danger,#c62828)]">' +
        (error instanceof Error ? error.message : String(error)) +
        '</div>';
    }
    throw error;
  }
}

function scheduleChannelConfigReload(channel) {
  const prev = state.configDebounceTimers[channel];
  if (prev) clearTimeout(prev);
  state.configDebounceTimers[channel] = setTimeout(() => {
    delete state.configDebounceTimers[channel];
    invalidateChannelConfig(channel);
    void ensureChannelConfigForChannel(channel, { force: true, applyAccountDefaults: true });
  }, CONFIG_RELOAD_DEBOUNCE_MS);
}

/**
 * @param {Record<string, unknown>} result
 * @returns {{ variant: 'success' | 'info'; message: string; inline: string }}
 */
function buildChannelConfigSaveNotice(result) {
  const skipped = /** @type {Array<{ id: string; name: string }>} */ (
    result?.skippedMcpServers ?? []
  );
  const skippedText = skipped.map((s) => s.name).join('、');

  if (skipped.length === 0) {
    return {
      variant: 'success',
      message: '渠道配置已保存',
      inline: '已保存',
    };
  }

  return {
    variant: 'info',
    message: `渠道配置已保存。${skippedText} 无法连接`,
    inline: `已保存，${skippedText} 无法连接`,
  };
}

async function saveChannelConfig(channel) {
  const stack = getChannelStack(channel);
  const panel = stack?.querySelector('[data-channel-config-panel]');
  const okEl = stack?.querySelector(`[data-config-ok="${channel}"]`);
  const errEl = stack?.querySelector(`[data-config-err="${channel}"]`);
  setText(okEl, '');
  setText(errEl, '');
  if (!(panel instanceof HTMLElement)) return;

  try {
    const boundUserId = resolveBindingUserId(channel);
    const form = collectChannelConfigForm(panel);
    if (!form.defaultModel) {
      setText(errEl, '请选择模型');
      return;
    }
    const result = await adminFetch('/channel-config', {
      method: 'PUT',
      body: JSON.stringify({
        channel,
        boundUserId,
        ...form,
      }),
    });
    if (result?.profile) {
      const cached = state.channelConfigByChannel[channel] ?? {};
      state.channelConfigByChannel[channel] = { ...cached, profile: result.profile };
    }
    await ensureChannelConfigForChannel(channel, { force: true });
    const freshPanel = stack?.querySelector('[data-channel-config-panel]');
    const skipped = result?.skippedMcpServers;
    const notice = buildChannelConfigSaveNotice(result);
    if (Array.isArray(skipped) && skipped.length > 0 && freshPanel instanceof HTMLElement) {
      flashMcpProbeFailures(freshPanel, skipped);
    }
    showToast(notice.message, notice.variant, notice.variant === 'success' ? 3200 : 5200);
    setText(okEl, notice.inline);
    setTimeout(() => setText(okEl, ''), 4000);
  } catch (e) {
    setText(errEl, e instanceof Error ? e.message : String(e));
  }
}

async function saveBinding(channel) {
  const stack = getChannelStack(channel);
  const okEl = stack?.querySelector(`[data-binding-ok="${channel}"]`);
  const errEl = stack?.querySelector(`[data-binding-err="${channel}"]`);
  setText(okEl, '');
  setText(errEl, '');
  try {
    const boundUserId = resolveBindingUserId(channel);
    if (!boundUserId) {
      setText(errEl, '请选择绑定账号');
      return;
    }
    let wildcard = getWildcardRoute(channel);
    if (!wildcard?.id) {
      await loadBindingData();
      wildcard = getWildcardRoute(channel);
    }
    if (!wildcard?.id) {
      setText(errEl, '通配路由缺失，请刷新页面后重试');
      return;
    }
    await adminFetch('/routes/' + encodeURIComponent(wildcard.id), {
      method: 'PUT',
      body: JSON.stringify({ boundUserId }),
    });
    delete state.bindingDraft[channel];
    await loadBindingData();
    refreshBindingSelect(channel);
    setText(okEl, `绑定已保存：${usernameById(boundUserId)}`);
    setTimeout(() => setText(okEl, ''), 3000);
    invalidateChannelConfig(channel);
    await ensureChannelConfigForChannel(channel, { force: true, applyAccountDefaults: true });
  } catch (e) {
    setText(errEl, e instanceof Error ? e.message : String(e));
  }
}

function renderSeedPanel() {
  if (!els.seedPanel) return;
  const selected = state.seedFollow.userId ?? '';
  const options = state.allUsers
    .map(
      (u) =>
        `<option value="${u.id}"${selected === u.id ? ' selected' : ''}>${u.username || u.email}</option>`
    )
    .join('');
  const pillLabel = state.seedFollow.userId ? (state.seedFollow.username ?? '已配置') : '未配置';

  els.seedPanel.innerHTML =
    '<header class="panel__head">' +
    `<span class="panel__icon panel__icon--seed" aria-hidden="true">${iconSeed}</span>` +
    '<div class="panel__head-main">' +
    '<h2 class="panel__title">默认配置归属</h2>' +
    '<p class="panel__desc">指定 guest 访客与未绑定 IM 路由所继承的有效配置</p>' +
    '</div>' +
    `<div class="panel__meta">${renderStatusPill(pillLabel, state.seedFollow.userId ? 'ok' : 'warn')}</div>` +
    '</header>' +
    '<div class="panel__body seed-panel__body">' +
    '<div class="seed-scope">' +
    '<p class="seed-scope__label">生效范围</p>' +
    '<ul class="seed-scope__list">' +
    '<li class="seed-scope__item">' +
    `<span class="seed-scope__item-icon" aria-hidden="true">${iconUser}</span>` +
    '<div><strong>Guest 访客</strong>未登录 Web 访问时的默认 AI / MCP 配置</div></li>' +
    '<li class="seed-scope__item">' +
    `<span class="seed-scope__item-icon" aria-hidden="true">${iconMessage}</span>` +
    '<div><strong>未绑定 IM 路由</strong>飞书 / 钉钉等渠道尚未映射到具体用户时</div></li>' +
    '</ul></div>' +
    '<div class="config-action-card">' +
    '<div class="config-action-card__field">' +
    '<label class="field-label" for="seed-account">种子账号</label>' +
    '<div class="select-wrap">' +
    `<select class="field-select" id="seed-account">${options}</select>` +
    '</div></div>' +
    '<div class="config-action-card__footer">' +
    '<button type="button" class="btn-primary btn-save" id="btn-save-seed">保存</button>' +
    '<p id="seed-ok" class="save-feedback save-feedback--ok hidden"></p>' +
    '<p id="seed-err" class="save-feedback save-feedback--err hidden"></p>' +
    '</div></div></div>';

  document.getElementById('btn-save-seed')?.addEventListener('click', () => void saveSeedFollow());
  mountDropdownSelectsIn(els.seedPanel);
}

function renderUsersList() {
  if (!els.usersPanel) return;
  const rows = state.allUsers
    .map((u) => {
      const isSelf = u.id === state.currentUser?.id;
      const isSuper = u.role === SUPERADMIN_ROLE;
      const initial = (u.username || u.email || '?').charAt(0).toUpperCase();
      const avatarClass = isSuper ? 'user-avatar--admin' : 'user-avatar--seed';
      const roleBtns =
        `<div class="role-toggle${isSelf ? ' role-toggle--locked' : ''}" role="group">` +
        `<button type="button" class="role-toggle__btn${isSuper ? ' is-active is-active--super' : ''}" data-role="${SUPERADMIN_ROLE}" data-user="${u.id}"${isSelf ? ' disabled' : ''}>超管</button>` +
        `<button type="button" class="role-toggle__btn${!isSuper ? ' is-active' : ''}" data-role="USER" data-user="${u.id}"${isSelf ? ' disabled' : ''}>用户</button>` +
        '</div>';
      return (
        '<tr>' +
        '<td><div class="user-identity">' +
        `<span class="user-avatar ${avatarClass}">${initial}</span>` +
        '<div><div class="user-name-row">' +
        `<span class="user-name">${u.username || '(无用户名)'}</span>` +
        (isSelf ? '<span class="tag-current">当前</span>' : '') +
        '</div>' +
        `<div class="user-meta">${new Date(u.createdAt).toLocaleDateString('zh-CN')}</div>` +
        '</div></div></td>' +
        `<td><span class="user-email">${u.email || ''}</span></td>` +
        `<td>${roleBtns}</td>` +
        `<td class="col-action"><button type="button" class="btn-outline" data-reset="${u.id}">重置密码</button></td>` +
        '</tr>'
      );
    })
    .join('');

  els.usersPanel.innerHTML =
    '<header class="panel__head">' +
    `<span class="panel__icon panel__icon--users" aria-hidden="true">${iconUsers}</span>` +
    '<div class="panel__head-main">' +
    '<h2 class="panel__title">用户列表</h2>' +
    '<p class="panel__desc">查看全部账号，调整角色或重置登录密码</p>' +
    '</div></header>' +
    '<div class="panel__body">' +
    '<table class="user-list-table">' +
    '<colgroup><col class="col-user"><col class="col-email"><col class="col-role"><col class="col-action"></colgroup>' +
    '<thead><tr><th>用户</th><th>邮箱</th><th>角色</th><th class="col-action-head">操作</th></tr></thead>' +
    `<tbody>${rows}</tbody></table></div>`;

  els.usersPanel.querySelectorAll('[data-role]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-user');
      const role = btn.getAttribute('data-role');
      if (!userId || !role || btn.disabled) return;
      try {
        await usersFetch('/' + encodeURIComponent(userId) + '/role', {
          method: 'POST',
          body: JSON.stringify({ role }),
        });
        await loadUsersData();
        renderUsersTab();
      } catch (e) {
        showToast(e instanceof Error ? e.message : String(e), 'error');
      }
    });
  });

  els.usersPanel.querySelectorAll('[data-reset]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-reset');
      if (!userId) return;
      const pwd = window.prompt('输入新密码（至少 8 位）');
      if (!pwd) return;
      try {
        await usersFetch('/' + encodeURIComponent(userId) + '/reset-password', {
          method: 'POST',
          body: JSON.stringify({ password: pwd }),
        });
        showToast('已重置并吊销该用户会话', 'success');
      } catch (e) {
        showToast(e instanceof Error ? e.message : String(e), 'error');
      }
    });
  });
}

function renderUsersTab() {
  renderSeedPanel();
  renderUsersList();
}

async function saveSeedFollow() {
  const select = document.getElementById('seed-account');
  const okEl = document.getElementById('seed-ok');
  const errEl = document.getElementById('seed-err');
  setText(okEl, '');
  setText(errEl, '');
  try {
    const userId = select?.value;
    if (!userId) {
      setText(errEl, '请选择种子账号');
      return;
    }
    const result = await usersFetch('/seed-follow', {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    });
    state.seedFollow = { userId: result.userId, username: result.username };
    setText(okEl, `已保存：${result.username ?? userId}`);
    setTimeout(() => setText(okEl, ''), 3000);
    renderSeedPanel();
    if (state.channelsMounted) {
      refreshAllBindingPanels();
      for (const ch of IM_CHANNELS) {
        invalidateChannelConfig(ch.key);
        if (state.activeTab === 'channels' && state.activeChannel === ch.key) {
          void ensureChannelConfigForChannel(ch.key, { force: true });
        }
      }
    }
  } catch (e) {
    setText(errEl, e instanceof Error ? e.message : String(e));
  }
}

async function loadBindingData() {
  const rows = await adminFetch('/routes');
  const routes = Array.isArray(rows) ? rows : [];
  state.routesByChannel = {
    dingtalk: routes.filter((row) => row.channel === 'dingtalk'),
    feishu: routes.filter((row) => row.channel === 'feishu'),
  };
}

async function loadUsersData() {
  const [users, seedFollow] = await Promise.all([usersFetch(''), usersFetch('/seed-follow')]);
  state.allUsers = Array.isArray(users) ? users : [];
  state.seedFollow = {
    userId: seedFollow?.userId ?? null,
    username: seedFollow?.username ?? null,
  };
  await syncChannelStatus();
  await loadBindingData();
  if (state.channelsMounted) {
    refreshAllBindingPanels();
    refreshChannelRailStatus();
  }
}

async function bootstrap() {
  setText(els.authError, '');
  try {
    const user = await getSession();
    if (!user) {
      setView('guest');
      return;
    }
    state.currentUser = user;
    if (user.role !== SUPERADMIN_ROLE) {
      setView('forbidden');
      return;
    }
    await loadUsersData();
    setView('ready');
    startChannelStatusPoll();
    if (state.activeTab === 'channels') {
      await showChannelsTab();
    } else if (state.activeTab === 'users') {
      renderUsersTab();
    }
  } catch (e) {
    setView('guest');
    setText(els.authError, e instanceof Error ? e.message : String(e));
  }
}

function init() {
  els.sectionTabs?.querySelectorAll('.section-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const key = tab.getAttribute('data-tab');
      if (key) switchTab(key);
    });
  });
  void bootstrap();
}

init();
