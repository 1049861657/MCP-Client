import { CHAT_SETTINGS_KEY } from '../storage-contract.js';
import { bindChatModalClose, closeChatModal, openChatModal } from './modal-host.js';

/** @type {boolean} */
let settingsUiBound = false;

const TOKEN_MIN = 512;
const TOKEN_MAX = 8192;
const TOKEN_STEP = 512;

/**
 * @param {HTMLInputElement | null} checkbox
 * @param {HTMLButtonElement | null} toggle
 * @param {HTMLElement | null} [nested]
 */
function syncToggleFromCheckbox(checkbox, toggle, nested) {
  if (!checkbox || !toggle) {
    return;
  }
  const on = checkbox.checked;
  toggle.classList.toggle('on', on);
  toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (nested) {
    nested.classList.toggle('hidden', !on);
  }
}

/**
 * @param {HTMLButtonElement} toggle
 * @param {HTMLInputElement} checkbox
 * @param {HTMLElement | null} [nested]
 */
function bindToggle(toggle, checkbox, nested) {
  toggle.addEventListener('click', () => {
    checkbox.checked = !checkbox.checked;
    syncToggleFromCheckbox(checkbox, toggle, nested);
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/**
 * @param {HTMLElement | null} display
 * @param {HTMLInputElement | null} input
 * @param {number} min
 * @param {number} max
 * @param {number} step
 */
function bindStepper(display, input, min, max, step) {
  if (!display || !input) {
    return;
  }
  const minus = display.previousElementSibling;
  const plus = display.nextElementSibling;
  const apply = (value) => {
    const clamped = Math.min(max, Math.max(min, value));
    display.textContent = String(clamped);
    input.value = String(clamped);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  if (minus instanceof HTMLButtonElement) {
    minus.addEventListener('click', () => apply(parseInt(display.textContent ?? '0', 10) - step));
  }
  if (plus instanceof HTMLButtonElement) {
    plus.addEventListener('click', () => apply(parseInt(display.textContent ?? '0', 10) + step));
  }
}

/**
 * @param {HTMLInputElement | null} temperatureInput
 */
function syncTemperatureUi(temperatureInput) {
  const slider = document.getElementById('settings-temp-slider');
  const valueEl = document.getElementById('settings-temp-val');
  const chips = document.querySelectorAll('#settings-temp-chips .settings-chip[data-temp]');
  if (!temperatureInput || !(slider instanceof HTMLInputElement) || !valueEl) {
    return;
  }
  const value = parseFloat(temperatureInput.value);
  if (Number.isNaN(value)) {
    return;
  }
  valueEl.textContent = value.toFixed(1);
  slider.value = String(Math.round(value * 10));
  chips.forEach((chip) => {
    if (chip instanceof HTMLButtonElement) {
      const preset = parseFloat(chip.dataset.temp ?? '');
      chip.classList.toggle('active', !Number.isNaN(preset) && Math.abs(preset - value) < 0.05);
    }
  });
}

/**
 * @param {HTMLInputElement | null} temperatureInput
 */
function bindTemperatureControls(temperatureInput) {
  const slider = document.getElementById('settings-temp-slider');
  const valueEl = document.getElementById('settings-temp-val');
  const chips = document.querySelectorAll('#settings-temp-chips .settings-chip[data-temp]');
  if (!temperatureInput || !(slider instanceof HTMLInputElement) || !valueEl) {
    return;
  }

  slider.addEventListener('input', () => {
    const value = parseInt(slider.value, 10) / 10;
    temperatureInput.value = value.toFixed(1);
    valueEl.textContent = value.toFixed(1);
    chips.forEach((chip) => chip.classList.remove('active'));
  });

  chips.forEach((chip) => {
    if (!(chip instanceof HTMLButtonElement)) {
      return;
    }
    chip.addEventListener('click', () => {
      const value = parseFloat(chip.dataset.temp ?? '');
      if (Number.isNaN(value)) {
        return;
      }
      temperatureInput.value = value.toFixed(1);
      syncTemperatureUi(temperatureInput);
    });
  });
}

/**
 * @param {HTMLInputElement | null} maxTokensInput
 */
function syncTokensUi(maxTokensInput) {
  const slider = document.getElementById('settings-tokens-slider');
  const valueEl = document.getElementById('settings-tokens-val');
  const chips = document.querySelectorAll('#settings-tokens-chips .settings-chip[data-tokens]');
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
  chips.forEach((chip) => {
    if (chip instanceof HTMLButtonElement) {
      chip.classList.toggle('active', parseInt(chip.dataset.tokens ?? '', 10) === value);
    }
  });
}

/**
 * @param {HTMLInputElement | null} maxTokensInput
 */
function bindTokensControls(maxTokensInput) {
  const slider = document.getElementById('settings-tokens-slider');
  const chips = document.querySelectorAll('#settings-tokens-chips .settings-chip[data-tokens]');
  if (!maxTokensInput || !(slider instanceof HTMLInputElement)) {
    return;
  }

  slider.addEventListener('input', () => {
    maxTokensInput.value = slider.value;
    syncTokensUi(maxTokensInput);
  });

  chips.forEach((chip) => {
    if (!(chip instanceof HTMLButtonElement)) {
      return;
    }
    chip.addEventListener('click', () => {
      const value = parseInt(chip.dataset.tokens ?? '', 10);
      if (Number.isNaN(value)) {
        return;
      }
      maxTokensInput.value = String(value);
      syncTokensUi(maxTokensInput);
    });
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
    document.getElementById('settings-toggle-history'),
    document.getElementById('settings-history-nested'),
  );
  syncToggleFromCheckbox(
    elements.enableAutoCompact,
    document.getElementById('settings-toggle-compact'),
    document.getElementById('settings-compact-nested'),
  );
  syncToggleFromCheckbox(
    elements.enableMCPTools,
    document.getElementById('settings-toggle-mcp'),
    null,
  );
  syncToggleFromCheckbox(
    elements.enablePrompts,
    document.getElementById('settings-toggle-prompts'),
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
function syncPermissionModeUi(mode) {
  const container = document.getElementById('settings-permission-mode');
  if (!container) {
    return;
  }
  container.querySelectorAll('[data-permission-mode]').forEach((btn) => {
    const active = btn.getAttribute('data-permission-mode') === mode;
    btn.classList.toggle('active', active);
  });

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
  const container = document.getElementById('settings-permission-mode');
  if (!container || container.dataset.bound === '1') {
    return;
  }
  container.dataset.bound = '1';
  container.querySelectorAll('[data-permission-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-permission-mode');
      if (!mode || !VALID_PERMISSION_MODES.includes(mode)) {
        return;
      }
      getApp().state.permissionMode = mode;
      syncPermissionModeUi(mode);
      saveSettings();
    });
  });
}

/**
 * @param {() => object} getApp
 */
function bindSettingsModalUi(getApp) {
  if (settingsUiBound) {
    return;
  }
  settingsUiBound = true;

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
      /** @type {HTMLButtonElement} */ (document.getElementById('settings-toggle-history')),
      elements.enableMessageHistory,
      document.getElementById('settings-history-nested'),
    );
  }
  if (elements.enableAutoCompact) {
    bindToggle(
      /** @type {HTMLButtonElement} */ (document.getElementById('settings-toggle-compact')),
      elements.enableAutoCompact,
      document.getElementById('settings-compact-nested'),
    );
  }
  if (elements.enableMCPTools) {
    bindToggle(
      /** @type {HTMLButtonElement} */ (document.getElementById('settings-toggle-mcp')),
      elements.enableMCPTools,
      null,
    );
  }
  if (elements.enablePrompts) {
    bindToggle(
      /** @type {HTMLButtonElement} */ (document.getElementById('settings-toggle-prompts')),
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
    bindChatModalClose('settings-modal', () => saveSettings());

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

      syncSettingsUi(getApp);
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
