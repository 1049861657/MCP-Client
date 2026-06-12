import { bindChipGroup, clearChipGroupActive, syncChipGroup } from '../../shared/ui/chip-group.js';
import { mountDropdownSelectsIn, refreshDropdownSelect } from '../../shared/ui/dropdown-select.js';
import { bindSegmentedControl, syncSegmentedControl } from '../../shared/ui/segmented.js';
import { bindStepper } from '../../shared/ui/stepper.js';
import { bindToggle, syncToggleFromCheckbox } from '../../shared/ui/toggle.js';
import { CHAT_SETTINGS_KEY } from '../storage-contract.js';
import { bindChatModalClose, openChatModal } from './modal-host.js';

/** @type {boolean} */
let settingsUiBound = false;

const TOKEN_MIN = 512;
const TOKEN_MAX = 8192;
const TOKEN_STEP = 512;

/**
 * @param {HTMLInputElement | null} temperatureInput
 */
function syncTemperatureUi(temperatureInput) {
  const slider = document.getElementById('settings-temp-slider');
  const valueEl = document.getElementById('settings-temp-val');
  if (!temperatureInput || !(slider instanceof HTMLInputElement) || !valueEl) {
    return;
  }
  const value = parseFloat(temperatureInput.value);
  if (Number.isNaN(value)) {
    return;
  }
  valueEl.textContent = value.toFixed(1);
  slider.value = String(Math.round(value * 10));
  syncChipGroup(
    document.getElementById('settings-temp-chips'),
    value,
    'temp',
    (raw) => parseFloat(raw),
    (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 0.05,
  );
}

/**
 * @param {HTMLInputElement | null} temperatureInput
 */
function bindTemperatureControls(temperatureInput) {
  const slider = document.getElementById('settings-temp-slider');
  const valueEl = document.getElementById('settings-temp-val');
  if (!temperatureInput || !(slider instanceof HTMLInputElement) || !valueEl) {
    return;
  }

  slider.addEventListener('input', () => {
    const value = parseInt(slider.value, 10) / 10;
    temperatureInput.value = value.toFixed(1);
    valueEl.textContent = value.toFixed(1);
    clearChipGroupActive(document.getElementById('settings-temp-chips'), 'temp');
  });

  bindChipGroup(document.getElementById('settings-temp-chips'), {
    attributeName: 'temp',
    onSelect: (raw) => {
      const value = parseFloat(raw);
      if (Number.isNaN(value)) {
        return;
      }
      temperatureInput.value = value.toFixed(1);
      syncTemperatureUi(temperatureInput);
    },
  });
}

/**
 * @param {HTMLInputElement | null} maxTokensInput
 */
function syncTokensUi(maxTokensInput) {
  const slider = document.getElementById('settings-tokens-slider');
  const valueEl = document.getElementById('settings-tokens-val');
  if (!maxTokensInput || !(slider instanceof HTMLInputElement) || !valueEl) {
    return;
  }
  const raw = parseInt(maxTokensInput.value, 10);
  const value = Number.isNaN(raw)
    ? 2048
    : Math.min(TOKEN_MAX, Math.max(TOKEN_MIN, Math.round(raw / TOKEN_STEP) * TOKEN_STEP));
  maxTokensInput.value = String(value);
  slider.value = String(value);
  valueEl.innerHTML = `${value}<span class="settings-value-unit"> tokens</span>`;
  syncChipGroup(
    document.getElementById('settings-tokens-chips'),
    value,
    'tokens',
    (tokenRaw) => parseInt(tokenRaw, 10),
  );
}

/**
 * @param {HTMLInputElement | null} maxTokensInput
 */
function bindTokensControls(maxTokensInput) {
  const slider = document.getElementById('settings-tokens-slider');
  if (!maxTokensInput || !(slider instanceof HTMLInputElement)) {
    return;
  }

  slider.addEventListener('input', () => {
    maxTokensInput.value = slider.value;
    syncTokensUi(maxTokensInput);
  });

  bindChipGroup(document.getElementById('settings-tokens-chips'), {
    attributeName: 'tokens',
    onSelect: (raw) => {
      const value = parseInt(raw, 10);
      if (Number.isNaN(value)) {
        return;
      }
      maxTokensInput.value = String(value);
      syncTokensUi(maxTokensInput);
    },
  });
}

function updateSettingsModelPill() {
  const pill = document.getElementById('settings-model-pill');
  const provider = document.getElementById('provider');
  const model = document.getElementById('model');
  if (!pill || !(provider instanceof HTMLSelectElement) || !(model instanceof HTMLSelectElement)) {
    return;
  }
  const providerLabel = provider.options[provider.selectedIndex]?.textContent?.trim() || provider.value;
  const modelLabel = model.options[model.selectedIndex]?.textContent?.trim() || model.value;
  pill.textContent = providerLabel && modelLabel ? `${providerLabel} · ${modelLabel}` : '—';
}

/**
 * @param {() => object} getApp
 */
function syncSettingsUi(getApp) {
  const app = getApp();
  const { elements } = app;

  syncToggleFromCheckbox(
    elements.enableMessageHistory,
    document.getElementById('ui-toggle-history'),
    document.getElementById('settings-history-nested'),
  );
  syncHindsightMemorySettingsUi(getApp());
  syncToggleFromCheckbox(
    elements.skipMemory,
    document.getElementById('ui-toggle-skip-memory'),
    null,
  );
  syncToggleFromCheckbox(
    elements.enableAutoCompact,
    document.getElementById('ui-toggle-compact'),
    document.getElementById('settings-compact-nested'),
  );
  syncToggleFromCheckbox(
    elements.enableMCPTools,
    document.getElementById('ui-toggle-mcp'),
    null,
  );
  syncToggleFromCheckbox(
    elements.enablePrompts,
    document.getElementById('ui-toggle-prompts'),
    null,
  );

  const histVal = document.getElementById('settings-hist-val');
  if (histVal && elements.messageHistoryCount) {
    histVal.textContent = elements.messageHistoryCount.value;
  }

  const toolVal = document.getElementById('settings-tool-val');
  if (toolVal && elements.maxToolCallRounds) {
    toolVal.textContent = elements.maxToolCallRounds.value;
  }

  syncTemperatureUi(elements.temperature);
  syncTokensUi(elements.maxTokens);
  updateSettingsModelPill();
  syncPermissionModeUi(app.state.permissionMode || 'open');
}

const VALID_PERMISSION_MODES = ['open', 'interactive', 'locked'];

/** @type {Record<'open'|'interactive'|'locked', string>} 允许范围；交互方式 */
const PERMISSION_MODE_FOOTNOTES = {
  open: '除黑名单外自动执行；对话中不询问。',
  interactive: '只读自动放行；其余工具需确认，可本会话记住。',
  locked: '仅只读工具可执行；其余一律拒绝、不询问。',
};

/**
 * @param {'open'|'interactive'|'locked'} mode
 */
/**
 * @param {object} app
 */
function syncHindsightMemorySettingsUi(app) {
  // T4-05：guest 无稳定身份关闭外接记忆，整个跨会话记忆模块（含调试）变灰不可点
  const isAuthed = app.sessionStore?.isAuthed?.() === true;
  const memoryConfigured = app.state.hindsightMemoryEnabled === true;
  const enabled = memoryConfigured && isAuthed;
  const card = document.getElementById('settings-hindsight-memory-card');
  const statusDot = document.getElementById('settings-hindsight-memory-status');
  const statusLabel = document.getElementById('settings-hindsight-memory-status-text');
  const debugLink = document.getElementById('settings-hindsight-memory-debug');
  const toggle = document.getElementById('ui-toggle-skip-memory');

  if (card) {
    card.classList.toggle('is-disabled', !enabled);
  }
  if (statusDot) {
    statusDot.classList.toggle('settings-hindsight-status-dot--on', enabled);
    statusDot.classList.toggle('settings-hindsight-status-dot--off', !enabled);
  }
  if (statusLabel) {
    if (enabled) {
      statusLabel.hidden = true;
    } else {
      statusLabel.hidden = false;
      statusLabel.textContent = !memoryConfigured ? '未配置' : '登录后可用';
    }
  }
  if (debugLink instanceof HTMLButtonElement) {
    debugLink.hidden = !enabled;
    debugLink.disabled = !enabled;
    debugLink.classList.toggle('is-disabled', !enabled);
  }
  if (toggle instanceof HTMLButtonElement) {
    toggle.disabled = !enabled;
    if (!enabled && app.elements.skipMemory) {
      app.elements.skipMemory.checked = false;
      app.state.skipMemory = false;
      syncToggleFromCheckbox(app.elements.skipMemory, toggle, null);
    }
  }
}

function syncPermissionModeUi(mode) {
  syncSegmentedControl(
    document.getElementById('settings-permission-mode'),
    mode,
    'permission-mode',
  );

  const footnote = document.getElementById('settings-permission-footnote');
  if (footnote && PERMISSION_MODE_FOOTNOTES[mode]) {
    footnote.textContent = PERMISSION_MODE_FOOTNOTES[mode];
    footnote.dataset.mode = mode;
  }
}

/**
 * @param {() => object} getApp
 */
function bindPermissionMode(getApp) {
  bindSegmentedControl(document.getElementById('settings-permission-mode'), {
    attributeName: 'permission-mode',
    onSelect: (mode) => {
      if (!VALID_PERMISSION_MODES.includes(mode)) {
        return;
      }
      getApp().state.permissionMode = mode;
      syncPermissionModeUi(mode);
      saveSettings();
    },
  });
}

/**
 * @param {() => object} getApp
 */
/**
 * @param {HTMLElement | null} settingsModal
 */
function ensureSettingsDropdowns(settingsModal) {
  if (!settingsModal) {
    return;
  }
  mountDropdownSelectsIn(settingsModal, 'select.field-select');
  settingsModal.querySelectorAll('select.field-select').forEach((select) => {
    if (select instanceof HTMLSelectElement && select.dataset.fbSelectMounted === '1') {
      refreshDropdownSelect(select);
    }
  });
}

function bindSettingsModalUi(getApp) {
  if (settingsUiBound) {
    return;
  }
  settingsUiBound = true;

  bindChatModalClose('settings-modal', () => saveSettings());

  const app = getApp();
  const { elements } = app;

  document.querySelectorAll('[data-settings-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-settings-tab');
      if (!tab) {
        return;
      }
      document.querySelectorAll('[data-settings-tab]').forEach((item) => {
        const active = item === btn;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('.settings-panel').forEach((panel) => {
        const active = panel.id === `settings-panel-${tab}`;
        panel.classList.toggle('active', active);
        panel.toggleAttribute('hidden', !active);
      });
    });
  });

  if (elements.enableMessageHistory) {
    bindToggle(
      /** @type {HTMLButtonElement} */ (document.getElementById('ui-toggle-history')),
      elements.enableMessageHistory,
      document.getElementById('settings-history-nested'),
    );
  }
  if (elements.skipMemory) {
    const skipToggle = /** @type {HTMLButtonElement} */ (
      document.getElementById('ui-toggle-skip-memory')
    );
    bindToggle(skipToggle, elements.skipMemory, null);
    if (elements.skipMemory.dataset.changeBound !== '1') {
      elements.skipMemory.dataset.changeBound = '1';
      elements.skipMemory.addEventListener('change', () => {
        const app = getApp();
        app.state.skipMemory = elements.skipMemory.checked;
        syncHindsightMemorySettingsUi(app);
        app.loadPromptPreview?.();
      });
    }
  }
  if (elements.enableAutoCompact) {
    bindToggle(
      /** @type {HTMLButtonElement} */ (document.getElementById('ui-toggle-compact')),
      elements.enableAutoCompact,
      document.getElementById('settings-compact-nested'),
    );
  }
  if (elements.enableMCPTools) {
    bindToggle(
      /** @type {HTMLButtonElement} */ (document.getElementById('ui-toggle-mcp')),
      elements.enableMCPTools,
      null,
    );
  }
  if (elements.enablePrompts) {
    bindToggle(
      /** @type {HTMLButtonElement} */ (document.getElementById('ui-toggle-prompts')),
      elements.enablePrompts,
      null,
    );
  }

  bindStepper(
    document.getElementById('settings-hist-val'),
    elements.messageHistoryCount,
    1,
    50,
    1,
  );
  bindStepper(
    document.getElementById('settings-tool-val'),
    elements.maxToolCallRounds,
    1,
    100,
    1,
  );

  bindTemperatureControls(elements.temperature);
  bindTokensControls(elements.maxTokens);
  bindPermissionMode(getApp);

  elements.provider?.addEventListener('change', updateSettingsModelPill);
  elements.model?.addEventListener('change', updateSettingsModelPill);
}

/**
 * @param {() => object} getApp
 * @param {{ showTooltip: Function, updateUIForMode?: Function, updateMCPButtonCounter?: Function }} ui
 */
export function createSettingsModalApi(getApp, ui) {
  function showSettingsModal() {
    bindSettingsModalUi(getApp);
    syncSettingsUi(getApp);
    openChatModal('settings-modal');
    window.requestAnimationFrame(() => {
      ensureSettingsDropdowns(document.getElementById('settings-modal'));
    });

    const resetBtn = document.getElementById('reset-settings');
    if (resetBtn && resetBtn.dataset.bound !== '1') {
      resetBtn.dataset.bound = '1';
      resetBtn.addEventListener('click', () => {
        resetSettings();
        ui.showTooltip('设置已重置为默认值');
      });
    }
  }

  function saveSettings() {
    const app = getApp();
    const { elements, state } = app;

    if (elements.modeStream) {
      elements.modeStream.checked = true;
      state.isStreamMode = true;
    }
    if (elements.modeRegular) {
      elements.modeRegular.checked = false;
    }
    ui.updateUIForMode?.();

    if (elements.model) {
      state.model = elements.model.value;
    }
    if (elements.temperature) {
      state.temperature = parseFloat(elements.temperature.value);
    }
    if (elements.maxTokens) {
      state.maxTokens = parseInt(elements.maxTokens.value, 10);
    }
    if (elements.skipMemory) {
      state.skipMemory = elements.skipMemory.checked;
    }
    if (elements.enableAutoCompact) {
      state.enableAutoCompact = elements.enableAutoCompact.checked;
    }
    if (elements.compactModel) {
      state.compactModel = elements.compactModel.value;
    }
    if (elements.enableMCPTools) {
      state.enableMCPTools = elements.enableMCPTools.checked;
    }
    if (elements.enablePrompts) {
      state.enablePrompts = elements.enablePrompts.checked;
    }
    if (elements.enableMessageHistory) {
      state.enableMessageHistory = elements.enableMessageHistory.checked;
    }
    if (elements.messageHistoryCount) {
      state.messageHistoryCount = parseInt(elements.messageHistoryCount.value, 10);
    }
    if (elements.maxToolCallRounds) {
      const parsed = parseInt(elements.maxToolCallRounds.value, 10);
      if (!Number.isNaN(parsed)) {
        state.maxToolCallRounds = Math.min(100, Math.max(1, parsed));
      }
    }

    saveMcpServerIds();
  }

  function saveMcpServerIds() {
    const app = getApp();
    try {
      const settingsJson = localStorage.getItem(CHAT_SETTINGS_KEY);
      const settings = settingsJson ? JSON.parse(settingsJson) : {};
      const { state } = app;

      settings.isStreamMode = true;
      settings.model = state.model;
      settings.skipMemory = state.skipMemory === true;
      settings.enableAutoCompact = state.enableAutoCompact;
      settings.compactModel = state.compactModel;
      settings.temperature = state.temperature;
      settings.maxTokens = state.maxTokens;
      settings.enableMCPTools = state.enableMCPTools;
      settings.enablePrompts = state.enablePrompts;
      settings.enableMessageHistory = state.enableMessageHistory;
      settings.messageHistoryCount = state.messageHistoryCount;
      settings.maxToolCallRounds = state.maxToolCallRounds;
      if (VALID_PERMISSION_MODES.includes(state.permissionMode)) {
        settings.permissionMode = state.permissionMode;
      }
      settings.enabledServerIds = Array.isArray(state.enabledServerIds)
        ? [...state.enabledServerIds]
        : [];
      settings.enabledSystemToolNames = Array.isArray(state.enabledSystemToolNames)
        ? [...state.enabledSystemToolNames]
        : [];
      localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore storage errors */
    }
  }

  function resetSettings() {
    const app = getApp();
    const { elements, state } = app;

    if (elements.modeStream) {
      elements.modeStream.checked = true;
    }
    if (elements.modeRegular) {
      elements.modeRegular.checked = false;
    }
    if (elements.temperature) {
      elements.temperature.value = '0.7';
    }
    if (elements.maxTokens) {
      elements.maxTokens.value = '2048';
    }
    if (elements.enableMCPTools) {
      elements.enableMCPTools.checked = true;
    }
    if (elements.enablePrompts) {
      elements.enablePrompts.checked = true;
    }
    if (elements.skipMemory) {
      elements.skipMemory.checked = false;
    }
    state.skipMemory = false;
    if (elements.enableMessageHistory) {
      elements.enableMessageHistory.checked = true;
    }
    if (elements.messageHistoryCount) {
      elements.messageHistoryCount.value = '20';
    }
    if (elements.maxToolCallRounds) {
      elements.maxToolCallRounds.value = '25';
    }
    state.permissionMode = 'open';
    syncPermissionModeUi('open');
    if (elements.enableAutoCompact) {
      elements.enableAutoCompact.checked = state.enableAutoCompact;
    }
    state.enabledSystemToolNames = (app.state.systemToolCatalog ?? []).map(
      (tool) => tool.codeName,
    );

    app.updateCompactModelOptions?.();
    syncSettingsUi(getApp);
    saveSettings();
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(CHAT_SETTINGS_KEY);
      if (!raw) {
        syncSettingsUi(getApp);
        return;
      }

      const settings = JSON.parse(raw);
      const app = getApp();
      const { elements, state } = app;

      state.isStreamMode = true;
      if (elements.modeStream) {
        elements.modeStream.checked = true;
      }
      if (elements.modeRegular) {
        elements.modeRegular.checked = false;
      }
      ui.updateUIForMode?.();

      if (settings.model && elements.model?.querySelector(`option[value="${settings.model}"]`)) {
        elements.model.value = settings.model;
        state.model = settings.model;
      }

      app.updateCompactModelOptions?.();

      if (typeof settings.skipMemory === 'boolean' && elements.skipMemory) {
        elements.skipMemory.checked = settings.skipMemory;
        state.skipMemory = settings.skipMemory;
      }

      if (typeof settings.enableAutoCompact === 'boolean' && elements.enableAutoCompact) {
        elements.enableAutoCompact.checked = settings.enableAutoCompact;
        state.enableAutoCompact = settings.enableAutoCompact;
      }

      if (settings.compactModel && elements.compactModel?.querySelector(`option[value="${settings.compactModel}"]`)) {
        elements.compactModel.value = settings.compactModel;
        state.compactModel = settings.compactModel;
      }

      if (typeof settings.temperature === 'number' && elements.temperature) {
        elements.temperature.value = String(settings.temperature);
        state.temperature = settings.temperature;
      }

      if (typeof settings.maxTokens === 'number' && elements.maxTokens) {
        elements.maxTokens.value = String(settings.maxTokens);
        state.maxTokens = settings.maxTokens;
      }

      if (typeof settings.enableMCPTools === 'boolean' && elements.enableMCPTools) {
        elements.enableMCPTools.checked = settings.enableMCPTools;
        state.enableMCPTools = settings.enableMCPTools;
      }

      if (typeof settings.enablePrompts === 'boolean' && elements.enablePrompts) {
        elements.enablePrompts.checked = settings.enablePrompts;
        state.enablePrompts = settings.enablePrompts;
      }

      if (typeof settings.enableMessageHistory === 'boolean' && elements.enableMessageHistory) {
        elements.enableMessageHistory.checked = settings.enableMessageHistory;
        state.enableMessageHistory = settings.enableMessageHistory;
      }

      if (typeof settings.messageHistoryCount === 'number' && elements.messageHistoryCount) {
        elements.messageHistoryCount.value = String(settings.messageHistoryCount);
        state.messageHistoryCount = settings.messageHistoryCount;
      }

      if (typeof settings.maxToolCallRounds === 'number' && elements.maxToolCallRounds) {
        elements.maxToolCallRounds.value = String(settings.maxToolCallRounds);
        state.maxToolCallRounds = settings.maxToolCallRounds;
      }

      if (VALID_PERMISSION_MODES.includes(settings.permissionMode)) {
        state.permissionMode = settings.permissionMode;
      }

      if (Array.isArray(settings.enabledServerIds)) {
        state.enabledServerIds = settings.enabledServerIds.filter((id) => typeof id === 'string');
      }

      if (Array.isArray(settings.enabledSystemToolNames)) {
        state.enabledSystemToolNames = settings.enabledSystemToolNames.filter(
          (name) => typeof name === 'string',
        );
      } else if (app.state.systemToolCatalog?.length) {
        state.enabledSystemToolNames = app.state.systemToolCatalog.map((tool) => tool.codeName);
      }

      syncSettingsUi(getApp);
      ui.updateMCPButtonCounter?.();
    } catch (error) {
      console.error('加载聊天设置失败:', error);
    }
  }

  return {
    showSettingsModal,
    loadSettings,
    saveSettings,
    resetSettings,
    saveMcpServerIds,
  };
}
