import './style.css';
import { icon } from './icons.js';
import { mountNavbar } from '../shared/navbar.js';

mountNavbar();

const API = '/api/admin';
const SESSION_TOKEN_KEY = 'mcp-admin-token';

const IM_CHANNELS = [
  { key: 'dingtalk', profileId: 'dingtalk-default', label: '钉钉', badge: '钉' },
  { key: 'feishu', profileId: 'feishu-default', label: '飞书', badge: '飞' }
];

const els = {
  shell: document.querySelector('.admin-shell'),
  pageHeader: document.getElementById('page-header'),
  authForm: document.getElementById('auth-form'),
  token: document.getElementById('admin-token'),
  authError: document.getElementById('auth-error'),
  authStatus: document.getElementById('auth-status'),
  btnLogout: document.getElementById('btn-logout'),
  emptyState: document.getElementById('empty-state'),
  workspace: document.getElementById('workspace'),
  channelRail: document.getElementById('channel-rail'),
  channelBadge: document.getElementById('channel-badge'),
  channelTitle: document.getElementById('channel-title'),
  dirtyBadge: document.getElementById('dirty-badge'),
  vendor: document.getElementById('fld-vendor'),
  model: document.getElementById('fld-model'),
  temperature: document.getElementById('fld-temperature'),
  maxTokens: document.getElementById('fld-max-tokens'),
  enableTools: document.getElementById('fld-enable-tools'),
  mcpPanel: document.getElementById('mcp-panel'),
  mcpChips: document.getElementById('mcp-chips'),
  mcpEmptyWarn: document.getElementById('mcp-empty-warn'),
  enablePrompts: document.getElementById('fld-enable-prompts'),
  promptPanel: document.getElementById('prompt-panel'),
  toolPrompt: document.getElementById('fld-tool-prompt'),
  enableCompact: document.getElementById('fld-enable-compact'),
  compactModelWrap: document.getElementById('compact-model-wrap'),
  compactModel: document.getElementById('fld-compact-model'),
  maxRounds: document.getElementById('fld-max-rounds'),
  editorHeader: document.getElementById('editor-header'),
  saveOk: document.getElementById('save-ok'),
  saveErr: document.getElementById('save-err'),
  btnSave: document.getElementById('btn-save'),
  btnDiscard: document.getElementById('btn-discard'),
  btnConnect: document.getElementById('btn-connect')
};

const state = {
  connected: false,
  connecting: false,
  activeChannel: 'dingtalk',
  providers: [],
  defaultProvider: '',
  mcpServers: [],
  profilesById: {},
  form: emptyForm(),
  serverSnapshot: '',
  dirtyChannels: new Set(),
  draftsByChannel: {},
  mcpSaveFailedIds: new Set(),
  mcpFailTimer: null
};

function emptyForm() {
  return {
    vendor: '',
    defaultModel: '',
    temperature: '',
    maxTokens: '',
    enableTools: true,
    enablePrompts: false,
    enableAutoCompact: true,
    compactModel: '',
    maxToolCallRounds: 25,
    mcpIds: [],
    toolPrompt: ''
  };
}

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

function channelMeta(key) {
  return IM_CHANNELS.find((c) => c.key === key) ?? IM_CHANNELS[0];
}

function formSnapshot(f) {
  return JSON.stringify({
    vendor: f.vendor,
    defaultModel: f.defaultModel,
    temperature: f.temperature,
    maxTokens: f.maxTokens,
    enableTools: f.enableTools,
    enablePrompts: f.enablePrompts,
    enableAutoCompact: f.enableAutoCompact,
    compactModel: f.compactModel,
    maxToolCallRounds: f.maxToolCallRounds,
    mcpIds: [...f.mcpIds].sort(),
    toolPrompt: f.toolPrompt
  });
}

function profileToForm(row) {
  const vendor =
    row.vendor && String(row.vendor).trim()
      ? String(row.vendor)
      : state.defaultProvider || (state.providers[0] ? String(state.providers[0].name) : '');

  const mcpIds = Array.isArray(row.mcpServerIds) ? row.mcpServerIds.map(String) : [];

  return {
    vendor,
    defaultModel: String(row.defaultModel || ''),
    temperature: row.temperature != null ? row.temperature : '',
    maxTokens: row.maxTokens != null ? row.maxTokens : '',
    enableTools: Boolean(row.enableTools),
    enablePrompts: Boolean(row.enablePrompts),
    enableAutoCompact: row.enableAutoCompact === true,
    compactModel: row.compactModel ? String(row.compactModel) : String(row.defaultModel || ''),
    maxToolCallRounds: row.maxToolCallRounds ?? 25,
    mcpIds: row.enableTools ? mcpIds : [],
    toolPrompt: row.toolPrompt != null ? String(row.toolPrompt) : ''
  };
}

function isDirty() {
  return state.serverSnapshot !== formSnapshot(state.form);
}

function updateDirtyUI() {
  const dirty = isDirty();
  if (dirty) {
    state.dirtyChannels.add(state.activeChannel);
    state.draftsByChannel[state.activeChannel] = {
      ...state.form,
      mcpIds: [...state.form.mcpIds]
    };
  } else {
    state.dirtyChannels.delete(state.activeChannel);
    delete state.draftsByChannel[state.activeChannel];
  }

  show(els.dirtyBadge, dirty);
  show(els.btnDiscard, dirty);
  if (els.editorHeader) {
    els.editorHeader.classList.toggle('editor-header--dirty', dirty);
  }
  if (els.btnSave) els.btnSave.disabled = !dirty;
  renderChannelRail();
}

function chatModels(vendor) {
  const p = state.providers.find((x) => String(x.name) === vendor);
  if (!p) return [];
  const models = Array.isArray(p.models) ? p.models : [];
  if (models.length === 0) {
    const v = String(p.defaultModel || 'default');
    return [{ value: v, label: v }];
  }
  return models
    .map((m) => ({
      value: String(m.value || m.label || ''),
      label: String(m.label || m.value || '')
    }))
    .filter((m) => m.value);
}

function fillSelect(selectEl, options, value) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  options.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    selectEl.appendChild(opt);
  });
  if (value != null && value !== '') {
    selectEl.value = value;
  } else if (options.length) {
    selectEl.value = options[0].value;
  }
}

function profileSummary(profileId) {
  const row = state.profilesById[profileId];
  if (!row) return { model: '—', tools: false };
  const model = String(row.defaultModel || '—');
  const short = model.length > 22 ? model.slice(0, 20) + '…' : model;
  return { model: short, tools: Boolean(row.enableTools) };
}

function renderChannelRail() {
  if (!els.channelRail) return;
  els.channelRail.innerHTML = '';
  IM_CHANNELS.forEach((ch) => {
    const active = state.activeChannel === ch.key;
    const sum = profileSummary(ch.profileId);
    const hasDirty = state.dirtyChannels.has(ch.key) && !active;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
    btn.className = 'channel-nav-item';

    const tags = [];
    if (hasDirty) {
      tags.push('<span class="channel-tag channel-tag--dirty">未保存</span>');
    }
    tags.push(
      sum.tools
        ? '<span class="channel-tag channel-tag--on">MCP 开</span>'
        : '<span class="channel-tag channel-tag--off">MCP 关</span>'
    );

    btn.innerHTML =
      '<span class="channel-badge-sm">' +
      ch.badge +
      '</span>' +
      '<span class="channel-nav-body">' +
      '<span class="channel-nav-label">' +
      ch.label +
      '</span>' +
      '<span class="channel-nav-meta">' +
      sum.model +
      '</span>' +
      '<span class="channel-nav-tags">' +
      tags.join('') +
      '</span>' +
      '</span>';

    btn.addEventListener('click', () => switchChannel(ch.key));
    els.channelRail.appendChild(btn);
  });
}

function clearMcpSaveFailed() {
  if (state.mcpFailTimer) {
    clearTimeout(state.mcpFailTimer);
    state.mcpFailTimer = null;
  }
  if (state.mcpSaveFailedIds.size === 0) return;
  state.mcpSaveFailedIds.clear();
  renderMcpChips();
}

function markMcpSaveFailed(ids) {
  if (state.mcpFailTimer) clearTimeout(state.mcpFailTimer);
  state.mcpSaveFailedIds = new Set(ids);
  renderMcpChips();
  state.mcpFailTimer = setTimeout(() => {
    state.mcpFailTimer = null;
    state.mcpSaveFailedIds.clear();
    renderMcpChips();
  }, 3200);
}

function renderMcpChips() {
  if (!els.mcpChips) return;
  const selected = new Set(state.form.mcpIds);
  els.mcpChips.innerHTML = '';

  if (!state.mcpServers.length) {
    show(els.mcpEmptyWarn, true);
    return;
  }
  show(els.mcpEmptyWarn, false);

  state.mcpServers.forEach((srv) => {
    const on = selected.has(srv.id);
    const failed = state.mcpSaveFailedIds.has(srv.id);
    const label = document.createElement('label');
    label.className =
      'mcp-item' +
      (on ? ' mcp-item--on' : '') +
      (failed ? ' mcp-item--failed' : '');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = on;
    input.addEventListener('change', () => {
      clearMcpSaveFailed();
      const set = new Set(state.form.mcpIds);
      if (input.checked) set.add(srv.id);
      else set.delete(srv.id);
      state.form.mcpIds = [...set];
      renderMcpChips();
      onFormInput();
    });

    const body = document.createElement('span');
    body.className = 'min-w-0 flex-1';

    const name = document.createElement('span');
    name.className = 'mcp-item-name';
    name.textContent = srv.name;
    body.appendChild(name);

    if (!srv.isConnected) {
      const tag = document.createElement('span');
      tag.className = 'mcp-item-tag';
      tag.textContent = '未连接';
      body.appendChild(tag);
    }

    label.appendChild(input);
    label.appendChild(body);
    els.mcpChips.appendChild(label);
  });
}

function syncMcpVisibility() {
  show(els.mcpPanel, state.form.enableTools);
}

function syncCompactVisibility() {
  show(els.compactModelWrap, state.form.enableAutoCompact);
}

function syncPromptVisibility() {
  show(els.promptPanel, state.form.enablePrompts);
}

function updateChannelHeader() {
  const meta = channelMeta(state.activeChannel);
  if (els.channelBadge) els.channelBadge.textContent = meta.badge;
  if (els.channelTitle) els.channelTitle.textContent = meta.label;
}

function updateAuthTrigger() {
  const connected = state.connected;
  show(els.authStatus, connected);
  show(els.btnLogout, connected);
}

function logout() {
  if (state.dirtyChannels.size > 0) {
    const ok = window.confirm('有未保存的更改，确定退出？');
    if (!ok) return;
  }

  state.profilesById = {};
  state.providers = [];
  state.defaultProvider = '';
  state.mcpServers = [];
  state.dirtyChannels.clear();
  state.draftsByChannel = {};
  setText(els.saveOk, '');
  setText(els.saveErr, '');
  setText(els.authError, '');
  clearStoredToken();
  if (els.token) els.token.value = '';
  setConnectedUI(false);
}

function readStoredToken() {
  try {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    return token && token.trim() ? token.trim() : '';
  } catch {
    return '';
  }
}

function persistToken(token) {
  try {
    const value = token.trim();
    if (value) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, value);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

function clearStoredToken() {
  persistToken('');
}

function tryRestoreSession() {
  const stored = readStoredToken();
  if (!stored || !els.token) return;
  els.token.value = stored;
  void connect();
}

function bindFormToDom() {
  const f = state.form;
  if (els.vendor) els.vendor.value = f.vendor;
  fillSelect(els.model, chatModels(f.vendor), f.defaultModel);
  fillSelect(els.compactModel, chatModels(f.vendor), f.compactModel);
  if (els.temperature) els.temperature.value = f.temperature !== '' ? String(f.temperature) : '';
  if (els.maxTokens) els.maxTokens.value = f.maxTokens !== '' ? String(f.maxTokens) : '';
  if (els.enableTools) els.enableTools.checked = f.enableTools;
  if (els.enablePrompts) els.enablePrompts.checked = f.enablePrompts;
  if (els.toolPrompt) els.toolPrompt.value = f.toolPrompt;
  if (els.enableCompact) els.enableCompact.checked = f.enableAutoCompact;
  if (els.maxRounds) els.maxRounds.value = String(f.maxToolCallRounds);
  syncMcpVisibility();
  syncCompactVisibility();
  syncPromptVisibility();
  renderMcpChips();
  updateChannelHeader();
}

function readFormFromDom() {
  state.form.vendor = els.vendor ? els.vendor.value : '';
  state.form.defaultModel = els.model ? els.model.value : '';
  state.form.temperature =
    els.temperature && els.temperature.value !== '' ? Number(els.temperature.value) : '';
  state.form.maxTokens =
    els.maxTokens && els.maxTokens.value !== '' ? Number(els.maxTokens.value) : '';
  state.form.enableTools = els.enableTools ? els.enableTools.checked : false;
  state.form.enablePrompts = els.enablePrompts ? els.enablePrompts.checked : false;
  state.form.enableAutoCompact = els.enableCompact ? els.enableCompact.checked : false;
  state.form.compactModel = els.compactModel ? els.compactModel.value : '';
  state.form.toolPrompt = els.toolPrompt ? els.toolPrompt.value : '';
  state.form.maxToolCallRounds = Number(els.maxRounds?.value || 25);
  if (!state.form.enableTools) state.form.mcpIds = [];
}

function markSavedBaseline() {
  state.serverSnapshot = formSnapshot(state.form);
  state.dirtyChannels.delete(state.activeChannel);
  delete state.draftsByChannel[state.activeChannel];
  updateDirtyUI();
}

function loadFormForActive() {
  const meta = channelMeta(state.activeChannel);
  const row = state.profilesById[meta.profileId];
  if (!row) return;

  const serverForm = profileToForm(row);
  state.serverSnapshot = formSnapshot(serverForm);

  const draft = state.draftsByChannel[state.activeChannel];
  state.form = draft ? { ...draft, mcpIds: [...draft.mcpIds] } : { ...serverForm, mcpIds: [...serverForm.mcpIds] };

  const models = chatModels(state.form.vendor);
  if (!state.form.defaultModel && models.length) {
    state.form.defaultModel = models[0].value;
  }

  fillSelect(
    els.vendor,
    state.providers
      .map((p) => ({ value: String(p.name), label: String(p.name) }))
      .filter((o) => o.value),
    state.form.vendor
  );

  bindFormToDom();
  updateDirtyUI();
  renderChannelRail();
}

function switchChannel(key) {
  readFormFromDom();
  if (isDirty()) {
    state.dirtyChannels.add(state.activeChannel);
    state.draftsByChannel[state.activeChannel] = {
      ...state.form,
      mcpIds: [...state.form.mcpIds]
    };
  } else {
    delete state.draftsByChannel[state.activeChannel];
  }
  state.activeChannel = key;
  setText(els.saveOk, '');
  setText(els.saveErr, '');
  loadFormForActive();
}

function onFormInput() {
  readFormFromDom();
  updateDirtyUI();
}

function setConnectedUI(connected) {
  state.connected = connected;
  show(els.emptyState, !connected);
  show(els.workspace, connected);
  show(els.pageHeader, connected);
  els.shell?.classList.toggle('admin-shell--connected', connected);
  document.body.classList.toggle('admin-page--connected', connected);
  updateAuthTrigger();
  if (!connected) {
    window.requestAnimationFrame(() => {
      els.token?.focus({ preventScroll: true });
    });
  }
}

async function adminFetch(path, init) {
  const token = els.token ? els.token.value.trim() : '';
  if (!token) throw new Error('请填写密钥');
  const headers = new Headers(init?.headers ?? {});
  headers.set('X-Admin-Token', token);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(API + path, { ...init, headers });
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

async function connect() {
  if (state.connecting) return;
  state.connecting = true;
  setText(els.authError, '');
  setText(els.saveOk, '');
  setText(els.saveErr, '');
  if (els.btnConnect) {
    els.btnConnect.textContent = '连接中…';
    els.btnConnect.disabled = true;
  }

  try {
    const [profileList, provRes, mcpRes] = await Promise.all([
      adminFetch('/profiles'),
      fetch('/api/settings/providers'),
      fetch('/api/mcp/servers?scope=configured')
    ]);

    const profiles = Array.isArray(profileList) ? profileList : [];
    state.profilesById = {};
    for (const ch of IM_CHANNELS) {
      const row = profiles.find((p) => p.profileId === ch.profileId);
      if (!row) throw new Error('缺少渠道方案 ' + ch.profileId + '，请检查服务启动与数据库 seed');
      state.profilesById[ch.profileId] = row;
    }

    if (provRes.ok) {
      const cfg = await provRes.json();
      state.providers = Array.isArray(cfg.providers) ? cfg.providers : [];
      state.defaultProvider = cfg.defaultProvider || '';
    } else {
      state.providers = [];
      state.defaultProvider = '';
    }

    if (mcpRes.ok) {
      const mcp = await mcpRes.json();
      state.mcpServers = (mcp.servers || []).map((s) => ({
        id: String(s.id),
        name: String(s.name || s.id),
        isConnected: Boolean(s.isConnected)
      }));
    } else {
      state.mcpServers = [];
    }

    state.dirtyChannels.clear();
    persistToken(els.token ? els.token.value : '');
    setConnectedUI(true);
    loadFormForActive();
  } catch (e) {
    setConnectedUI(false);
    const message = e instanceof Error ? e.message : String(e);
    if (/未授权|401|无效|Unauthorized/i.test(message)) {
      clearStoredToken();
    }
    setText(els.authError, message);
  } finally {
    state.connecting = false;
    if (els.btnConnect) {
      els.btnConnect.disabled = false;
      els.btnConnect.textContent = '连接';
    }
  }
}

function buildPayload() {
  readFormFromDom();
  const meta = channelMeta(state.activeChannel);
  const row = state.profilesById[meta.profileId];
  const f = state.form;

  if (!f.vendor.trim()) throw new Error('请选择供应商');
  if (!f.defaultModel.trim()) throw new Error('请选择模型');

  const rounds = Number(f.maxToolCallRounds);
  if (!Number.isFinite(rounds) || rounds < 1 || rounds > 100) {
    throw new Error('单轮工具调用次数须为 1–100 的整数');
  }

  let compactModel = null;
  if (f.enableAutoCompact) {
    const cm = f.compactModel.trim();
    compactModel = cm && cm !== f.defaultModel.trim() ? cm : null;
  }

  const body = {
    displayName: row.displayName,
    vendor: f.vendor.trim(),
    defaultModel: f.defaultModel.trim(),
    enableTools: f.enableTools,
    enablePrompts: f.enablePrompts,
    enableAutoCompact: f.enableAutoCompact,
    compactModel,
    mcpServerIds: f.enableTools ? [...f.mcpIds] : [],
    toolPrompt: f.toolPrompt.trim() ? f.toolPrompt.trim() : null,
    maxToolCallRounds: Math.floor(rounds),
    temperature: f.temperature !== '' && f.temperature != null ? Number(f.temperature) : null,
    maxTokens: f.maxTokens !== '' && f.maxTokens != null ? Number(f.maxTokens) : null
  };

  return { profileId: meta.profileId, body };
}

async function save() {
  setText(els.saveOk, '');
  setText(els.saveErr, '');
  if (els.btnSave) els.btnSave.disabled = true;

  try {
    const { profileId, body } = buildPayload();
    const data = await adminFetch('/profiles/' + encodeURIComponent(profileId), {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    const removed = Array.isArray(data?.removedMcpServers) ? data.removedMcpServers : [];
    if (removed.length > 0) {
      const removedIds = removed.map((s) => String(s.id));
      state.form.mcpIds = state.form.mcpIds.filter((id) => !removedIds.includes(id));
      markMcpSaveFailed(removedIds);
    }
    const refreshed = await adminFetch('/profiles/' + encodeURIComponent(profileId));
    state.profilesById[profileId] = refreshed;
    delete state.draftsByChannel[state.activeChannel];
    loadFormForActive();
    markSavedBaseline();
    setText(els.saveOk, channelMeta(state.activeChannel).label + ' 已保存');
    setTimeout(() => setText(els.saveOk, ''), 3000);
  } catch (e) {
    setText(els.saveErr, e instanceof Error ? e.message : String(e));
    if (els.btnSave) els.btnSave.disabled = !isDirty();
  }
}

function discardChanges() {
  delete state.draftsByChannel[state.activeChannel];
  loadFormForActive();
  setText(els.saveOk, '');
  setText(els.saveErr, '');
}

function onVendorChange() {
  readFormFromDom();
  const models = chatModels(state.form.vendor);
  if (models.length && !models.some((m) => m.value === state.form.defaultModel)) {
    state.form.defaultModel = models[0].value;
  }
  if (state.form.enableAutoCompact) state.form.compactModel = state.form.defaultModel;
  bindFormToDom();
  onFormInput();
}

function onToolsToggle() {
  readFormFromDom();
  if (!state.form.enableTools) state.form.mcpIds = [];
  bindFormToDom();
  onFormInput();
}

function onCompactToggle() {
  readFormFromDom();
  if (state.form.enableAutoCompact) state.form.compactModel = state.form.defaultModel;
  bindFormToDom();
  onFormInput();
}

function onPromptsToggle() {
  readFormFromDom();
  syncPromptVisibility();
  onFormInput();
}

function setMcpSelection(ids) {
  clearMcpSaveFailed();
  state.form.mcpIds = ids;
  renderMcpChips();
  onFormInput();
}

function bindFormListeners() {
  const inputs = [
    els.vendor,
    els.model,
    els.temperature,
    els.maxTokens,
    els.toolPrompt,
    els.compactModel,
    els.maxRounds
  ];
  inputs.forEach((el) => {
    el?.addEventListener('input', onFormInput);
    el?.addEventListener('change', onFormInput);
  });

  els.enableTools?.addEventListener('change', () => {
    onToolsToggle();
  });
  els.enableCompact?.addEventListener('change', () => {
    onCompactToggle();
  });
  els.enablePrompts?.addEventListener('change', () => {
    onPromptsToggle();
  });
  els.vendor?.addEventListener('change', onVendorChange);

  document.getElementById('btn-mcp-all')?.addEventListener('click', () => {
    setMcpSelection(state.mcpServers.map((s) => s.id));
  });

  document.getElementById('btn-mcp-none')?.addEventListener('click', () => {
    setMcpSelection([]);
  });
}

function mountStaticIcons() {
  const map = {
    'sec-model-icon': 'cpu',
    'sec-mcp-icon': 'plug',
    'sec-behavior-icon': 'sliders'
  };
  for (const [id, name] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icon(name);
  }
}

function init() {
  mountStaticIcons();

  renderChannelRail();
  setConnectedUI(false);

  els.authForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    connect();
  });

  els.token?.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    els.token?.focus();
  });

  els.token?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      connect();
    }
  });

  els.btnConnect?.addEventListener('click', connect);
  els.btnLogout?.addEventListener('click', logout);

  els.btnSave?.addEventListener('click', save);
  els.btnDiscard?.addEventListener('click', discardChanges);

  bindFormListeners();
  tryRestoreSession();
}

init();
