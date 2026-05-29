import { fetchJson } from '../shared/fetch-json.js';
import { confirmModal } from '../shared/ui/modal.js';
import { showToast } from '../shared/ui/toast.js';

/** @typedef {{ value: string; label: string }} ProviderType */
/** @typedef {{ value: string; label: string }} ModelEntry */
/** @typedef {{ name: string; type: string; apiUrl: string; apiKey: string; defaultModel: string; models: ModelEntry[] }} Provider */
/** @typedef {{ providers: Provider[]; defaultProvider: string }} ProvidersData */

const els = {
  providersContainer: document.getElementById('providers-container'),
  sidebarProvidersList: document.getElementById('sidebar-providers-list'),
  defaultProviderSelect: document.getElementById('default-provider'),
  saveProvidersButton: document.getElementById('save-providers'),
  addProviderButton: document.getElementById('add-provider'),
};

/** @type {ProvidersData | null} */
let providersData = null;

/** @type {ProviderType[]} */
let providerTypes = [];

let activeProviderIndex = 0;

const EYE_OPEN_ICON = `<svg class="toggle-password-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>`;

const EYE_SLASH_ICON = `<svg class="toggle-password-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/></svg>`;

/**
 * @param {string} url
 * @param {RequestInit} init
 * @returns {Promise<unknown>}
 */
async function requestJson(url, init) {
  const response = await fetch(url, init);

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      /** @type {{ error?: string; details?: string }} */
      const body = await response.json();
      message = body.error || body.details || message;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * @returns {void}
 */
export function initSettingsApp() {
  void bootstrap();
}

/**
 * @returns {Promise<void>}
 */
async function bootstrap() {
  try {
    await loadProviderTypes();
    await loadProvidersData();
    setupEventListeners();
  } catch (error) {
    console.error('初始化失败:', error);
    showToast('加载配置失败，请刷新页面重试', 'error');
  }
}

/**
 * @returns {Promise<void>}
 */
async function loadProviderTypes() {
  try {
    /** @type {ProviderType[]} */
    const data = await fetchJson('/api/settings/provider-types');
    providerTypes = data;
  } catch (error) {
    console.error('加载提供商类型失败:', error);
  }
}

/**
 * @returns {Promise<void>}
 */
async function loadProvidersData() {
  /** @type {ProvidersData} */
  providersData = await fetchJson('/api/settings/providers');
  renderProvidersUI();
}

/**
 * @returns {void}
 */
function syncDefaultProviderFromSelectedProvider() {
  if (!providersData || !els.defaultProviderSelect || providersData.providers.length === 0) {
    return;
  }

  const index = els.defaultProviderSelect.selectedIndex;
  if (index >= 0 && index < providersData.providers.length) {
    const name = (providersData.providers[index].name || '').trim();
    if (name !== '') {
      providersData.defaultProvider = name;
      return;
    }
  }

  providersData.defaultProvider = els.defaultProviderSelect.value || '';
}

/**
 * @returns {void}
 */
function renderProvidersUI() {
  if (!els.providersContainer || !els.defaultProviderSelect || !els.sidebarProvidersList || !providersData) {
    return;
  }

  els.providersContainer.innerHTML = '';
  els.defaultProviderSelect.innerHTML = '';

  renderSidebarProviders();

  providersData.providers.forEach((provider, index) => {
    const card = createProviderCard(provider, index);
    els.providersContainer.appendChild(card);

    const option = document.createElement('option');
    option.value = provider.name;
    option.textContent = provider.name || '新提供商';
    els.defaultProviderSelect.appendChild(option);

    if (index !== activeProviderIndex) {
      card.style.display = 'none';
    }
  });

  if (providersData.defaultProvider) {
    els.defaultProviderSelect.value = providersData.defaultProvider;
  }

  syncDefaultProviderFromSelectedProvider();
  updateSaveButtonState();
  renderEmptyStateIfNeeded();
}

/**
 * @returns {void}
 */
function renderSidebarProviders() {
  if (!els.sidebarProvidersList || !providersData) {
    return;
  }

  els.sidebarProvidersList.innerHTML = '';

  providersData.providers.forEach((provider, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'sidebar-provider-item';
    item.dataset.index = String(index);
    item.setAttribute('role', 'tab');
    item.setAttribute('aria-selected', index === activeProviderIndex ? 'true' : 'false');

    if (index === activeProviderIndex) {
      item.classList.add('active');
    }

    const initial = (provider.name || '新').charAt(0).toUpperCase();
    const typeLabel =
      providerTypes.find((type) => type.value === provider.type)?.label || provider.type || '未设置类型';
    const isDefault = provider.name && provider.name === providersData.defaultProvider;
    const displayName = provider.name || '新提供商';

    item.innerHTML = `
      <span class="provider-icon">${initial}</span>
      <span class="provider-nav-body">
        <span class="provider-nav-name">${escapeHtml(displayName)}</span>
        <span class="provider-nav-meta">${escapeHtml(typeLabel)}</span>
      </span>
      ${isDefault ? '<span class="provider-default-tag">默认</span>' : ''}
    `;

    item.addEventListener('click', () => {
      activeProviderIndex = index;
      renderProvidersUI();
    });

    els.sidebarProvidersList.appendChild(item);
  });
}

/**
 * @param {Provider} provider
 * @param {number} index
 * @returns {HTMLElement}
 */
function createProviderCard(provider, index) {
  const card = document.createElement('article');
  card.className = 'provider-card';
  card.dataset.index = String(index);

  const typeOptions = providerTypes
    .map(
      (type) =>
        `<option value="${escapeAttr(type.value)}" ${provider.type === type.value ? 'selected' : ''}>${escapeHtml(type.label)}</option>`,
    )
    .join('');

  const modelsHtml =
    provider.models && provider.models.length > 0
      ? provider.models
          .map(
            (model, modelIndex) => {
              const isDefault = provider.defaultModel === model.value && Boolean(model.value);
              return `
        <div class="model-item ${isDefault ? 'default-model' : ''}" data-model-index="${modelIndex}">
          <div class="model-col-default">
            <input type="radio" id="model-default-${index}-${modelIndex}" name="default-model-${index}" value="${escapeAttr(model.value || '')}" ${isDefault ? 'checked' : ''} class="default-model-radio" aria-label="设为默认模型">
            <span class="model-default-badge${isDefault ? '' : ' hidden'}">默认</span>
          </div>
          <div class="model-col-id">
            <label class="model-field-label" for="model-value-${index}-${modelIndex}">模型 ID</label>
            <input type="text" id="model-value-${index}-${modelIndex}" placeholder="如 claude-3-opus" value="${escapeAttr(model.value || '')}" class="model-value-input">
          </div>
          <div class="model-col-label">
            <label class="model-field-label" for="model-label-${index}-${modelIndex}">显示名称</label>
            <input type="text" id="model-label-${index}-${modelIndex}" placeholder="如 Claude Opus（可选）" value="${escapeAttr(model.label || '')}" class="model-label-input">
          </div>
          <button type="button" class="delete-model" title="删除模型" aria-label="删除模型">&times;</button>
        </div>`;
            },
          )
          .join('')
      : `<p class="models-empty">暂无模型，点击下方按钮添加</p>`;

  card.innerHTML = `
    <header class="provider-card-header">
      <h3>${escapeHtml(provider.name || '新提供商')}</h3>
      <button type="button" class="btn-danger btn-sm delete-provider">删除</button>
    </header>
    <div class="provider-card-content">
      <section class="form-section">
        <div class="form-section-title">基本信息</div>
        <div class="form-grid">
          <div class="form-row">
            <label for="provider-name-${index}">提供商名称</label>
            <input type="text" id="provider-name-${index}" value="${escapeAttr(provider.name || '')}" placeholder="提供商名称">
          </div>
          <div class="form-row">
            <label for="provider-type-${index}">提供商类型</label>
            <select id="provider-type-${index}">${typeOptions}</select>
          </div>
        </div>
      </section>
      <section class="form-section">
        <div class="form-section-title">API 配置</div>
        <div class="form-grid">
          <div class="form-row">
            <label for="provider-api-url-${index}">API URL</label>
            <input type="text" id="provider-api-url-${index}" value="${escapeAttr(provider.apiUrl || '')}" placeholder="https://api.example.com/v1">
          </div>
          <div class="form-row">
            <label for="provider-api-key-${index}">API Key</label>
            <div class="api-key-field">
              <input type="password" id="provider-api-key-${index}" value="${escapeAttr(provider.apiKey || '')}" placeholder="sk-...">
              <button type="button" class="toggle-password" aria-label="显示 API Key" title="显示">${EYE_OPEN_ICON}</button>
            </div>
          </div>
        </div>
      </section>
      <section class="form-section">
        <div class="form-section-title">模型配置</div>
        <p class="form-section-hint">模型 ID 为调用 API 时使用的标识；显示名称仅用于界面展示，留空则与 ID 相同。</p>
        <div class="models-table">
          <div class="models-table-head" aria-hidden="true">
            <span class="model-col-default">默认</span>
            <span class="model-col-id">模型 ID</span>
            <span class="model-col-label">显示名称</span>
            <span class="model-col-actions"></span>
          </div>
          <div class="models-container">${modelsHtml}</div>
        </div>
        <button type="button" class="add-model" data-provider-index="${index}">+ 添加模型</button>
      </section>
    </div>
  `;

  return card;
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
 * @param {string} value
 * @returns {string}
 */
function escapeAttr(value) {
  return escapeHtml(value);
}

/**
 * @returns {void}
 */
function renderEmptyStateIfNeeded() {
  if (!els.providersContainer || !providersData || providersData.providers.length > 0) {
    return;
  }

  const empty = document.createElement('div');
  empty.className = 'empty-message';
  empty.innerHTML = `
    <h3>暂无提供商</h3>
    <p>请使用侧边栏的「添加新提供商」按钮添加您的第一个 AI 提供商</p>
  `;
  els.providersContainer.appendChild(empty);
}

/**
 * @returns {void}
 */
function updateSaveButtonState() {
  if (!els.saveProvidersButton || !providersData) {
    return;
  }

  const disabled = providersData.providers.length === 0;
  els.saveProvidersButton.disabled = disabled;
}

/**
 * @returns {void}
 */
function setupEventListeners() {
  els.saveProvidersButton?.addEventListener('click', () => {
    void saveProvidersConfig();
  });

  els.defaultProviderSelect?.addEventListener('change', () => {
    void saveDefaultProvider(els.defaultProviderSelect.value);
  });

  els.addProviderButton?.addEventListener('click', addNewProvider);

  els.providersContainer?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const toggleBtn = target.closest('.toggle-password');
    if (toggleBtn instanceof HTMLButtonElement) {
      event.preventDefault();
      togglePasswordVisibility(toggleBtn);
      return;
    }

    if (target.closest('.delete-provider')) {
      void deleteProvider(event);
      return;
    }

    const addModelButton = target.closest('.add-model');
    if (addModelButton instanceof HTMLElement && addModelButton.dataset.providerIndex) {
      addModel(Number(addModelButton.dataset.providerIndex));
      return;
    }

    if (target.closest('.delete-model')) {
      deleteModel(event);
    }
  });

  els.providersContainer?.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.classList.contains('default-model-radio')) {
      collectFormData();
      const card = target.closest('.provider-card');
      if (card instanceof HTMLElement) {
        updateDefaultModelVisual(card);
      }
    }
  });
}

/**
 * @param {ProvidersData} data
 * @returns {Promise<void>}
 */
async function saveAndReloadProviders(data) {
  await requestJson('/api/settings/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  providersData = data;

  try {
    await requestJson('/api/settings/providers/reload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    showToast('配置已保存并应用，无需重启服务器', 'success');
  } catch {
    showToast('配置已保存，但需要重启服务器才能应用更改', 'error');
  }

  renderProvidersUI();
}

/**
 * @returns {boolean}
 */
function collectFormData() {
  if (!els.providersContainer || !providersData) {
    return false;
  }

  try {
    const cards = els.providersContainer.querySelectorAll('.provider-card');

    cards.forEach((card) => {
      const index = card.dataset.index;
      if (index === undefined) {
        return;
      }

      const provider = providersData.providers[Number(index)];
      if (!provider) {
        return;
      }

      const nameEl = document.getElementById(`provider-name-${index}`);
      const typeEl = document.getElementById(`provider-type-${index}`);
      const apiUrlEl = document.getElementById(`provider-api-url-${index}`);
      const apiKeyEl = document.getElementById(`provider-api-key-${index}`);

      if (!(nameEl instanceof HTMLInputElement) || !(typeEl instanceof HTMLSelectElement) || !(apiUrlEl instanceof HTMLInputElement) || !(apiKeyEl instanceof HTMLInputElement)) {
        return;
      }

      const defaultModelRadio = card.querySelector('.default-model-radio:checked');
      const defaultModel = defaultModelRadio instanceof HTMLInputElement ? defaultModelRadio.value : '';

      provider.name = nameEl.value.trim();
      provider.type = typeEl.value.trim();
      provider.apiUrl = apiUrlEl.value.trim();
      provider.apiKey = apiKeyEl.value.trim();
      provider.defaultModel = defaultModel;

      const models = [];
      card.querySelectorAll('.model-item').forEach((item) => {
        const valueInput = item.querySelector('.model-value-input');
        const labelInput = item.querySelector('.model-label-input');

        if (valueInput instanceof HTMLInputElement && labelInput instanceof HTMLInputElement) {
          const modelValue = valueInput.value.trim();
          const modelLabel = labelInput.value.trim();
          if (modelValue) {
            models.push({ value: modelValue, label: modelLabel || modelValue });
          }
        }
      });

      provider.models = models;
    });

    return true;
  } catch (error) {
    console.error('收集表单数据时出错:', error);
    return false;
  }
}

/**
 * @returns {Promise<void>}
 */
async function saveProvidersConfig() {
  if (!providersData) {
    return;
  }

  try {
    if (!collectFormData()) {
      throw new Error('收集表单数据失败');
    }

    for (const provider of providersData.providers) {
      if (!provider.name || !provider.apiUrl || !provider.apiKey) {
        throw new Error('提供商名称、API URL 和 API Key 不能为空');
      }
    }

    syncDefaultProviderFromSelectedProvider();
    await saveAndReloadProviders(providersData);
    showToast('配置保存成功', 'success');
  } catch (error) {
    console.error('保存配置失败:', error);
    showToast(error instanceof Error ? error.message : '保存配置失败', 'error');
  }
}

/**
 * @returns {void}
 */
function addNewProvider() {
  if (!providersData) {
    providersData = { providers: [], defaultProvider: '' };
  }

  let defaultType = 'openai';
  if (providerTypes.length > 0) {
    defaultType = providerTypes[0].value;
  }

  providersData.providers.push({
    name: '',
    type: defaultType,
    apiUrl: '',
    apiKey: '',
    defaultModel: '',
    models: [],
  });

  activeProviderIndex = providersData.providers.length - 1;
  renderProvidersUI();
  window.scrollTo(0, document.body.scrollHeight);
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function deleteProvider(event) {
  if (!providersData) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const card = target.closest('.provider-card');
  if (!(card instanceof HTMLElement) || card.dataset.index === undefined) {
    return;
  }

  const index = Number(card.dataset.index);
  const confirmed = await confirmModal({
    title: '删除确认',
    message: '确定要删除这个提供商吗？',
    confirmLabel: '删除',
    cancelLabel: '取消',
  });

  if (!confirmed) {
    return;
  }

  try {
    const nameEl = document.getElementById(`provider-name-${index}`);
    const deletedName = nameEl instanceof HTMLInputElement ? nameEl.value : '';

    providersData.providers.splice(index, 1);

    if (providersData.providers.length > 0 && providersData.defaultProvider === deletedName) {
      providersData.defaultProvider = providersData.providers[0].name;
    }

    if (activeProviderIndex >= providersData.providers.length) {
      activeProviderIndex = Math.max(0, providersData.providers.length - 1);
    }

    await saveAndReloadProviders(providersData);
  } catch (error) {
    console.error('删除提供商失败:', error);
    showToast(error instanceof Error ? error.message : '删除失败', 'error');
    renderProvidersUI();
  }
}

/**
 * @param {number} providerIndex
 * @returns {void}
 */
function addModel(providerIndex) {
  if (!providersData) {
    return;
  }

  collectFormData();

  const provider = providersData.providers[providerIndex];
  if (!provider) {
    showToast('添加模型失败：未找到提供商', 'error');
    return;
  }

  if (!provider.models) {
    provider.models = [];
  }

  provider.models.push({ value: '', label: '' });

  if (provider.models.length === 1) {
    provider.defaultModel = '';
  }

  renderProvidersUI();

  window.setTimeout(() => {
    const card = document.querySelector(`.provider-card[data-index="${providerIndex}"]`);
    const lastInput = card?.querySelector('.model-item:last-child .model-value-input');
    if (lastInput instanceof HTMLInputElement) {
      lastInput.focus();
    }
  }, 50);
}

/**
 * @param {Event} event
 * @returns {void}
 */
function deleteModel(event) {
  if (!providersData) {
    return;
  }

  collectFormData();

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const card = target.closest('.provider-card');
  const modelItem = target.closest('.model-item');

  if (!(card instanceof HTMLElement) || !(modelItem instanceof HTMLElement) || card.dataset.index === undefined || modelItem.dataset.modelIndex === undefined) {
    return;
  }

  const providerIndex = Number(card.dataset.index);
  const modelIndex = Number(modelItem.dataset.modelIndex);
  const provider = providersData.providers[providerIndex];

  if (!provider || !provider.models) {
    return;
  }

  const modelValue = provider.models[modelIndex]?.value;
  provider.models.splice(modelIndex, 1);

  if (provider.defaultModel === modelValue && provider.models.length > 0) {
    provider.defaultModel = provider.models[0].value;
  } else if (provider.models.length === 0) {
    provider.defaultModel = '';
  }

  renderProvidersUI();
}

/**
 * @param {HTMLElement} card
 * @returns {void}
 */
function updateDefaultModelVisual(card) {
  card.querySelectorAll('.model-item').forEach((item) => {
    const radio = item.querySelector('.default-model-radio');
    const isDefault = radio instanceof HTMLInputElement && radio.checked;
    item.classList.toggle('default-model', isDefault);
    const badge = item.querySelector('.model-default-badge');
    if (badge instanceof HTMLElement) {
      badge.classList.toggle('hidden', !isDefault);
    }
  });
}

/**
 * @param {HTMLButtonElement} button
 * @returns {void}
 */
function togglePasswordVisibility(button) {
  const field = button.closest('.api-key-field');
  const input = field?.querySelector('input');
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  if (input.type === 'password') {
    input.type = 'text';
    button.innerHTML = EYE_SLASH_ICON;
    button.setAttribute('aria-label', '隐藏 API Key');
    button.title = '隐藏';
  } else {
    input.type = 'password';
    button.innerHTML = EYE_OPEN_ICON;
    button.setAttribute('aria-label', '显示 API Key');
    button.title = '显示';
  }
}

/**
 * @param {string} providerName
 * @returns {Promise<void>}
 */
async function saveDefaultProvider(providerName) {
  if (!providersData) {
    return;
  }

  try {
    providersData.defaultProvider = providerName;

    await requestJson('/api/settings/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(providersData),
    });

    try {
      await requestJson('/api/settings/providers/reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.warn('重载配置失败:', error);
    }
  } catch (error) {
    console.error('保存默认提供商失败:', error);
    showToast(error instanceof Error ? error.message : '保存失败', 'error');
  }
}
