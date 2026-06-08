/**
 * AI 聊天应用核心模块 — ESM 工厂，编排 data / api / ui / utils
 */

import { createChatApi } from './api.js';
import { createChatData } from './data.js';
import { buildApiMessagesFromHistory } from './message-history-builder.js';
import { compactBaselineStorageKey } from './storage-contract.js';
import { TurnCollector } from './turn-collector.js';
import { bindChatModalClose, closeChatModal, openChatModal } from './ui/modal-host.js';
import {
  calculateElapsedTime,
  formatElapsedTime,
  getFullTimeString,
  getTimeString,
  saveThinkingTimeData,
  updateThinkingTime,
} from './time.js';
import { createChatUtils } from './utils.js';

/**
 * @typedef {object} CreateChatAppOptions
 * @property {object} [ui] 聊天 UI 模块（完整 init 需要；未注入时使用 stub）
 * @property {object} [renderers] 可选渲染器模块
 */

/**
 * @returns {object}
 */
function createDefaultUiStub() {
  const noop = () => {};

  return {
    loadSettings: noop,
    showHistoryModal: noop,
    showSettingsModal: noop,
    showMCPServersModal: noop,
    showQuickMessagesModal: noop,
    showTooltip: (message) => {
      console.info('[chat ui stub]', message);
    },
    updateUIForMode: noop,
    updateMCPButtonCounter: noop,
    showRandomQuickMessages: noop,
    showAppendedQuickMessages: noop,
    saveMcpServerIds: noop,
    addUserMessage: noop,
    addAIMessage: noop,
    finalizeAIMessage: noop,
    setCompactDraft: noop,
  };
}

/**
 * @returns {object}
 */
function createInitialState() {
  return {
    isStreamMode: true,
    isConfigLoaded: false,
    providers: {},
    isThinking: false,
    thinkingModels: [
      'claude-3-5-sonnet-20240620',
      'gpt-4-0314',
      'gpt-4-0613',
      'gpt-4-1106-preview',
      'gpt-4-vision-preview',
      'gpt-4-turbo',
    ],
    showReasoning: true,
    enableMCPTools: true,
    enablePrompts: true,
    messageHistory: [],
    mcpTools: [],
    enableMessageHistory: true,
    messageHistoryCount: 20,
    maxToolCallRounds: 25,
    permissionMode: 'open',
    sessionId: '',
    isEventsInitialized: false,
    isLoading: false,
    enabledServerIds: [],
    enabledSystemToolNames: [],
    systemToolCatalog: [],
    mcpServers: [],
    apiContextOverride: null,
    contextCompactedActive: false,
    compactedBaseline: null,
    compactDraft: null,
    enableAutoCompact: false,
    compactModel: '',
    skipMemory: false,
    hindsightMemoryEnabled: false,
    isStreaming: false,
  };
}

/**
 * @returns {object}
 */
function createTimeManager() {
  return {
    getTimeString,
    getFullTimeString,
    calculateElapsedTime,
    updateThinkingTime,
    saveThinkingTimeData,
    formatElapsedTime,
  };
}

/**
 * @param {CreateChatAppOptions} [options]
 * @returns {object}
 */
export function createChatApp(options = {}) {
  const injectedUi = options.ui ?? createDefaultUiStub();
  const renderers = options.renderers ?? null;

  /** @type {object} */
  const app = {
    elements: {},
    state: createInitialState(),
    db: { isReady: false },
    renderers,
    ui: injectedUi,
    api: null,
    data: null,
    utils: null,
    timeManager: createTimeManager(),
  };

  app.data = createChatData(app);
  app.db = app.data.db;

  app.api = createChatApi({
    getApp: () => app,
    getUI: () => app.ui,
    TurnCollector,
    buildApiMessagesFromHistory,
    compactBaselineStorageKey,
  });

  app.utils = createChatUtils(app);

  app.saveMessageHistory = () => {
    app.data.saveMessageHistory();
  };

  Object.assign(app, createAppMethods());

  return app;
}

/**
 * @returns {Record<string, Function>}
 */
function createAppMethods() {
  return {
    init() {
      console.log('AI核心模块开始初始化...');

      if (!this.ui) {
        throw new Error('UI模块未找到，无法继续初始化');
      }
      console.log('UI模块引用设置完成');

      if (!this.api) {
        throw new Error('API模块未找到，无法继续初始化');
      }
      console.log('API模块引用设置完成');

      if (!this.timeManager) {
        throw new Error('时间管理器未找到，无法继续初始化');
      }
      console.log('时间管理器初始化完成');

      this.state.sessionId = `session_temp_${Date.now().toString(36)}`;
      console.log('设置临时会话ID:', this.state.sessionId);

      this.elements = {
        message: document.getElementById('message'),
        sendButton: document.getElementById('send-button'),
        chatMessages: document.getElementById('chat-messages'),
        provider: document.getElementById('provider'),
        model: document.getElementById('model'),
        skipMemory: document.getElementById('skip-memory'),
        enableAutoCompact: document.getElementById('enable-auto-compact'),
        compactModel: document.getElementById('compact-model'),
        temperature: document.getElementById('temperature'),
        maxTokens: document.getElementById('max-tokens'),
        modeStream: document.getElementById('mode-stream'),
        modeRegular: document.getElementById('mode-regular'),
        clearChat: document.getElementById('clear-chat'),
        compactChat: document.getElementById('compact-chat'),
        tooltip: document.getElementById('tooltip'),
        result: document.getElementById('result'),
        responseContent: document.getElementById('response-content'),
        responseTime: document.getElementById('response-time'),
        tokenUsage: document.getElementById('token-usage'),
        enableMCPTools: document.getElementById('enable-mcp-tools'),
        enablePrompts: document.getElementById('enable-prompts'),
        enableMessageHistory: document.getElementById('enable-message-history'),
        messageHistoryCount: document.getElementById('message-history-count'),
        maxToolCallRounds: document.getElementById('max-tool-call-rounds'),
        openSettings: document.getElementById('open-settings'),
        viewHistory: document.getElementById('view-history'),
        newSession: document.getElementById('new-session'),
        quickMessages: document.getElementById('quick-messages'),
        mcpQuickAccess: document.getElementById('mcp-quick-access'),
        stopButton: document.getElementById('stop-button'),
      };

      const missingElements = [];
      ['message', 'sendButton', 'provider', 'model'].forEach((key) => {
        if (!this.elements[key]) {
          missingElements.push(key);
        }
      });

      if (missingElements.length > 0) {
        throw new Error(`缺少关键UI元素: ${missingElements.join(', ')}`);
      }

      if (!this.data) {
        throw new Error('数据管理模块未找到，无法继续初始化');
      }
      this.data.init();
      this.db = this.data.db;
      console.log('数据管理模块初始化完成');

      if (!this.utils) {
        throw new Error('工具模块未找到，无法继续初始化');
      }
      this.utils.init();
      console.log('工具模块初始化完成');

      this.setupEventListeners();
      console.log('事件监听器初始化完成');

      return this.fetchFeatureConfig()
        .then(() => {
          console.log('特性配置加载完成，继续初始化');

          this.fetchThinkingConfig().catch((error) =>
            console.error('加载思考模式配置失败:', error),
          );

          return this.fetchProviderConfig();
        })
        .then(() => {
          console.log('供应商配置加载完成，初始化其余功能');

          this.updateSessionDisplay();
          this.ui.loadSettings?.();
          this.ui.updateMCPButtonCounter?.();
          this.scheduleMcpServersReload();

          const event = new CustomEvent('AIChatAppInitialized');
          document.dispatchEvent(event);
          console.log('已触发AIChatAppInitialized事件');
        })
        .catch((error) => {
          console.error('初始化失败:', error);
          throw error;
        });
    },

    setupEventListeners() {
      if (this.state.isEventsInitialized) {
        console.log('事件监听器已初始化，跳过重复绑定');
        return;
      }

      console.log('设置事件监听器...');

      const { modeStream, modeRegular } = this.elements;
      if (modeStream && modeRegular) {
        modeStream.addEventListener('change', () => {
          if (modeStream.checked) {
            this.setMode('stream');
          }
        });
        modeRegular.addEventListener('change', () => {
          if (modeRegular.checked) {
            this.setMode('regular');
          }
        });
      }

      const { clearChat, compactChat } = this.elements;
      if (clearChat) {
        clearChat.addEventListener('click', () => this.clearChat());
      }
      if (compactChat) {
        compactChat.addEventListener('click', () => this.handleOpenContextPanel());
      }

      this._bindContextPanelEvents();

      const { sendButton, stopButton, message } = this.elements;
      if (sendButton) {
        sendButton.addEventListener('click', () => this.handleSend());
      }
      if (stopButton) {
        stopButton.addEventListener('click', () => {
          this.api.abortCurrentStream();
        });
      }
      if (message) {
        message.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.handleSend();
          }
        });
      }

      const { provider } = this.elements;
      if (provider) {
        provider.addEventListener('change', () => {
          this.updateModelOptions();
        });
      }

      const { viewHistory } = this.elements;
      if (viewHistory) {
        viewHistory.addEventListener('click', () => this.ui.showHistoryModal?.());
      }

      const { newSession } = this.elements;
      if (newSession) {
        newSession.addEventListener('click', () => this.createNewSession());
      }

      const { openSettings } = this.elements;
      if (openSettings) {
        openSettings.addEventListener('click', () => this.ui.showSettingsModal?.());
      }

      const { mcpQuickAccess } = this.elements;
      if (mcpQuickAccess) {
        mcpQuickAccess.addEventListener('click', () => this.ui.showMCPServersModal?.());
      }

      const { quickMessages } = this.elements;
      if (quickMessages) {
        quickMessages.addEventListener('click', () => {
          try {
            this.ui.showQuickMessagesModal?.();
          } catch (error) {
            console.error('显示快捷消息失败:', error);
          }
        });

        quickMessages.style.cursor = 'pointer';
        quickMessages.addEventListener('mouseover', () => {
          quickMessages.style.opacity = '0.8';
        });
        quickMessages.addEventListener('mouseout', () => {
          quickMessages.style.opacity = '1';
        });
      } else {
        console.error('快捷消息按钮元素不存在');
      }

      const { enableMCPTools, enablePrompts, enableMessageHistory } = this.elements;
      if (enableMCPTools) {
        enableMCPTools.addEventListener('change', (event) => {
          this.state.enableMCPTools = event.target.checked;
        });
      }
      if (enablePrompts) {
        enablePrompts.addEventListener('change', (event) => {
          this.state.enablePrompts = event.target.checked;
        });
      }
      if (enableMessageHistory) {
        enableMessageHistory.addEventListener('change', (event) => {
          this.state.enableMessageHistory = event.target.checked;
        });
      }

      const { messageHistoryCount } = this.elements;
      if (messageHistoryCount) {
        messageHistoryCount.addEventListener('change', (event) => {
          const parsed = parseInt(event.target.value, 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            this.state.messageHistoryCount = parsed;
          }
        });
      }

      const openSystemToolsButton = document.getElementById('open-system-tools');
      if (openSystemToolsButton && openSystemToolsButton.dataset.bound !== '1') {
        openSystemToolsButton.dataset.bound = '1';
        openSystemToolsButton.addEventListener('click', () => {
          this.ui.showSystemToolsModal?.();
        });
      }

      const editPromptsButton = document.getElementById('edit-prompts');
      if (editPromptsButton) {
        editPromptsButton.addEventListener('click', () => {
          this.openPromptEditor();
        });

        bindChatModalClose('prompts-modal');

        const promptCancelButton = document.getElementById('prompt-cancel');
        if (promptCancelButton && promptCancelButton.dataset.bound !== '1') {
          promptCancelButton.dataset.bound = '1';
          promptCancelButton.addEventListener('click', () => {
            closeChatModal('prompts-modal');
          });
        }

        const promptSaveButton = document.getElementById('prompt-save');
        if (promptSaveButton) {
          promptSaveButton.addEventListener('click', () => {
            this.saveToolPrompt();
          });
        }
      }

      this.state.isEventsInitialized = true;
      console.log('事件监听器初始化完成');
    },

    updateSessionDisplay() {
      const sessionNameElement = document.getElementById('session-name');
      if (!sessionNameElement) {
        console.error('未找到会话名称显示元素，跳过显示更新');
        return;
      }

      try {
        if (
          !this.state.sessionId ||
          this.state.sessionId === 'session_NaN' ||
          !this.state.sessionId.startsWith('session_')
        ) {
          console.warn('会话ID无效，重新生成:', this.state.sessionId);
          this.state.sessionId = `session_${Math.random().toString(36).substring(2, 10)}`;
        }

        const displayId = this.state.sessionId.replace('session_', '');

        if (!displayId || displayId === 'NaN' || displayId === 'undefined') {
          console.warn('提取的显示ID无效:', displayId);
          const fallbackId = Date.now().toString(36);
          sessionNameElement.textContent = fallbackId;
          sessionNameElement.title = `会话ID: ${fallbackId}`;
          return;
        }

        sessionNameElement.textContent = displayId;
        sessionNameElement.title = `会话ID: ${displayId}`;
      } catch (error) {
        console.error('更新会话显示时出错:', error);
        sessionNameElement.textContent = '会话ID加载失败';
        sessionNameElement.title = `会话ID错误: ${error.message}`;
      }
    },

    async fetchFeatureConfig() {
      try {
        console.log('正在加载特性配置...');

        const response = await fetch('/api/config/features');

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`获取特性配置失败: ${data.error}`);
        }

        if (data.success && data.config) {
          if (Array.isArray(data.config.systemTools)) {
            this.state.systemToolCatalog = data.config.systemTools;
            if (!this.state.enabledSystemToolNames?.length) {
              this.state.enabledSystemToolNames = data.config.systemTools.map(
                (tool) => tool.codeName,
              );
            }
          }
          if (data.config.tools) {
            this.state.enableMCPTools = data.config.tools.enableMCPTools;
            this.state.enablePrompts = data.config.tools.enablePrompts;

            if (this.elements.enableMCPTools) {
              this.elements.enableMCPTools.checked = this.state.enableMCPTools;
            }
            if (this.elements.enablePrompts) {
              this.elements.enablePrompts.checked = this.state.enablePrompts;
            }

            console.log('已更新工具配置:', {
              enableMCPTools: this.state.enableMCPTools,
              enablePrompts: this.state.enablePrompts,
            });
          }

          if (data.config.tools && typeof data.config.tools.maxToolCallRounds === 'number') {
            this.state.maxToolCallRounds = data.config.tools.maxToolCallRounds;
            if (this.elements.maxToolCallRounds) {
              this.elements.maxToolCallRounds.value = this.state.maxToolCallRounds;
            }
          }

          if (data.config.history) {
            this.state.enableMessageHistory = data.config.history.enableMessageHistory;
            this.state.messageHistoryCount = data.config.history.defaultMessageHistoryCount;

            if (this.elements.enableMessageHistory) {
              this.elements.enableMessageHistory.checked = this.state.enableMessageHistory;
            }
            if (this.elements.messageHistoryCount) {
              this.elements.messageHistoryCount.value = this.state.messageHistoryCount;
            }

            console.log('已更新历史记录配置:', {
              enableMessageHistory: this.state.enableMessageHistory,
              messageHistoryCount: this.state.messageHistoryCount,
            });
          }

          if (data.config.context) {
            if (typeof data.config.context.enableAutoCompact === 'boolean') {
              this.state.enableAutoCompact = data.config.context.enableAutoCompact;
              if (this.elements.enableAutoCompact) {
                this.elements.enableAutoCompact.checked = this.state.enableAutoCompact;
              }
            }
          }

          if (data.config.memory) {
            this.state.hindsightMemoryEnabled = data.config.memory.enabled === true;
          }
        }
      } catch (error) {
        console.error('加载特性配置失败:', error);
        throw error;
      }
    },

    async fetchProviderConfig() {
      try {
        console.log('开始获取供应商配置');
        const response = await fetch('/api/settings/providers');

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status}`);
        }

        const config = await response.json();
        console.log('获取到供应商配置:', config);

        this.state.providers = {};
        config.providers.forEach((provider) => {
          const apiPath = '/api/chat';

          this.state.providers[provider.name] = {
            name: provider.name,
            apiPath,
            models: provider.models,
          };
        });

        this.state.isConfigLoaded = true;
        this.populateProviderSelect(config.defaultProvider);

        if (this.elements.provider && this.elements.provider.options.length > 0) {
          this.elements.provider.value = config.defaultProvider;
          this.updateModelOptions();
        }

        if (this.db.isReady && this.elements.provider) {
          console.log('尝试加载当前供应商的最新会话');

          setTimeout(() => {
            this.data
              .loadLatestProviderSession()
              .then(() => {
                this.updateSessionDisplay();
              })
              .catch((error) => console.error('自动加载最新会话失败:', error));
          }, 500);
        } else {
          console.log('数据库未就绪，创建新会话');
          this.data.createNewSession();
        }

        if (this.elements.sendButton) {
          this.elements.sendButton.disabled = false;
        }
      } catch (error) {
        console.error('加载供应商配置失败:', error);
        this.ui.showTooltip?.('无法加载供应商配置，请刷新页面重试');
        throw error;
      }
    },

    async fetchThinkingConfig() {
      try {
        console.log('获取思考模式配置');

        const thinkingConfig = {
          enabled: true,
          models: [
            'claude-3-5-sonnet-20240620',
            'gpt-4-0314',
            'gpt-4-0613',
            'gpt-4-1106-preview',
            'gpt-4-vision-preview',
            'gpt-4-turbo',
          ],
        };

        this.state.thinkingModels = thinkingConfig.models || [];
        this.state.showReasoning = thinkingConfig.enabled !== false;

        console.log('思考模式配置加载完成', {
          enabled: this.state.showReasoning,
          models: this.state.thinkingModels.length,
        });

        return thinkingConfig;
      } catch (error) {
        console.error('获取思考模式配置失败:', error);
        throw error;
      }
    },

    populateProviderSelect(defaultProviderName) {
      if (!this.elements.provider) {
        throw new Error('供应商下拉框元素不存在');
      }

      this.elements.provider.innerHTML = '';

      Object.keys(this.state.providers).forEach((providerName) => {
        const option = document.createElement('option');
        option.value = providerName;
        option.textContent = this.state.providers[providerName].name;
        this.elements.provider.appendChild(option);
      });

      if (defaultProviderName && this.state.providers[defaultProviderName]) {
        this.elements.provider.value = defaultProviderName;
      }
    },

    updateModelOptions() {
      if (!this.state.isConfigLoaded) {
        return;
      }

      if (!this.elements.provider || !this.elements.model) {
        throw new Error('更新模型选项失败: provider或model元素不存在');
      }

      const provider = this.elements.provider.value;
      if (!this.state.providers[provider]) {
        throw new Error(`更新模型选项失败: 未找到供应商配置 ${provider}`);
      }

      const models = this.state.providers[provider].models;

      this.elements.model.innerHTML = '';

      models.forEach((model) => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.label;
        this.elements.model.appendChild(option);
      });

      this.updateCompactModelOptions();
    },

    updateCompactModelOptions() {
      if (!this.state.isConfigLoaded || !this.elements.compactModel) {
        return;
      }
      if (!this.elements.provider) {
        return;
      }

      const provider = this.elements.provider.value;
      if (!this.state.providers[provider]) {
        return;
      }

      const models = this.state.providers[provider].models;
      const prev = this.elements.compactModel.value || this.state.compactModel;

      this.elements.compactModel.innerHTML = '';
      models.forEach((model) => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.label;
        this.elements.compactModel.appendChild(option);
      });

      if (prev && this.elements.compactModel.querySelector(`option[value="${prev}"]`)) {
        this.elements.compactModel.value = prev;
      } else if (models.length > 0) {
        this.elements.compactModel.value = models[0].value;
      }

      this.state.compactModel = this.elements.compactModel.value;
    },

    setMode(mode) {
      this.state.isStreamMode = mode === 'stream';
      this.ui.updateUIForMode?.();
      if (this.state.isStreamMode) {
        this.ui.showTooltip?.('已切换到流式响应模式');
      } else {
        this.ui.showTooltip?.('已切换到标准响应（已废弃，不经过消息总线，仅调试用）');
      }
    },

    getSelectableMcpServerIds() {
      const allowed = new Set((this.state.mcpServers || []).map((server) => server.id));
      return (this.state.enabledServerIds || []).filter((id) => allowed.has(id));
    },

    scheduleMcpServersReload(attempt = 0) {
      const maxAttempts = 8;
      const delayMs = 3000;

      this.loadMCPServers()
        .then((data) => {
          if (data.servers?.length || attempt >= maxAttempts) {
            return;
          }
          window.setTimeout(() => {
            this.scheduleMcpServersReload(attempt + 1);
          }, delayMs);
        })
        .catch(() => {
          if (attempt < maxAttempts) {
            window.setTimeout(() => {
              this.scheduleMcpServersReload(attempt + 1);
            }, delayMs);
          }
        });
    },

    async loadMCPServers() {
      try {
        const data = await this.api.getMCPServers();
        this.state.mcpServers = data.servers || [];
        this.ui.updateMCPButtonCounter?.();
        return data;
      } catch (error) {
        console.error('加载MCP服务器列表失败:', error);
        this.ui.showTooltip?.('获取MCP服务器列表失败，请检查网络连接');
        throw error;
      }
    },

    _bindContextPanelEvents() {
      const modal = document.getElementById('context-modal');
      if (!modal || modal.dataset.actionsBound === '1') {
        return;
      }
      modal.dataset.actionsBound = '1';

      const genBtn = document.getElementById('context-generate-summary');
      const applyBtn = document.getElementById('context-apply-summary');
      const clearBtn = document.getElementById('context-clear-override');

      if (genBtn) {
        genBtn.addEventListener('click', () => this.api?.generateCompactDraft?.());
      }
      if (applyBtn) {
        applyBtn.addEventListener('click', () => this.api?.applyCompactOverride?.());
      }
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.api?.clearContextOverride?.());
      }
    },

    async handleOpenContextPanel() {
      if (!this.api?.openContextPanel) {
        this.ui.showTooltip?.('上下文面板未就绪');
        return;
      }
      if (this.state.isStreaming) {
        this.ui.showTooltip?.('请等待当前回复完成');
        return;
      }
      await this.api.openContextPanel();
    },

    clearChat() {
      if (!this.elements.chatMessages) {
        throw new Error('聊天消息容器未找到');
      }

      if (this.elements.chatMessages.childElementCount === 0) {
        this.ui.showTooltip?.('没有对话可清除');
        return;
      }

      this.elements.chatMessages.innerHTML = '';
      this.ui.clearPlanning?.();
      this.ui.showTooltip?.('对话已清除');

      setTimeout(() => {
        this.ui.showRandomQuickMessages?.();
      }, 100);
    },

    setStreamingState(streaming) {
      this.state.isStreaming = streaming;
      const { sendButton, stopButton } = this.elements;
      if (!sendButton || !stopButton) {
        return;
      }
      sendButton.style.display = streaming ? 'none' : '';
      stopButton.style.display = streaming ? '' : 'none';
    },

    async handleSend() {
      if (!this.api) {
        throw new Error('API模块未初始化，无法发送消息');
      }

      const message = this.elements.message.value.trim();

      if (!message) {
        this.ui.showTooltip?.('请输入消息');
        return;
      }

      if (!this.state.isConfigLoaded) {
        this.ui.showTooltip?.('配置尚未加载完成，请稍后再试');
        return;
      }

      this.elements.sendButton.disabled = true;

      try {
        const model = this.elements.model.value;
        const temperature = parseFloat(this.elements.temperature.value);
        const maxTokens = parseInt(this.elements.maxTokens.value, 10);

        if (this.state.isStreamMode) {
          await this.api.sendStreamRequest(
            message,
            model,
            temperature,
            maxTokens,
            this.state.enableMCPTools,
          );
        } else {
          await this.api.sendRegularRequest(
            message,
            model,
            temperature,
            maxTokens,
            this.state.enableMCPTools,
          );
        }

        this.elements.message.value = '';
      } finally {
        this.elements.sendButton.disabled = false;
        this.elements.message.focus();
      }
    },

    createNewSession() {
      console.log('创建新的会话');
      return this.data.createNewSession();
    },

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

        const response = await fetch('/api/settings/tool-prompt');

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
        error: '加载失败'
      };

      panel.classList.remove('is-disabled', 'is-empty');
      panel.classList.toggle('is-collapsed', mode !== 'ready');
      panel.classList.toggle('is-disabled', mode === 'off');
      panel.classList.toggle('is-empty', mode === 'idle' || mode === 'error');

      body.className =
        mode === 'loading' ? 'prompt-assembled-body is-loading' : 'prompt-assembled-body';
      body.textContent = mode === 'ready' ? assembled.content : mode === 'error' ? '请稍后重试' : '';

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

      const makeIndicator = variant => {
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
        const indicatorVariant =
          section.includedInSystem === false ? 'skipped' : 'filled';
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
          `/api/settings/system-prompt-sections?${this.buildPromptPreviewParams()}`
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

        promptTextarea.disabled = true;

        const response = await fetch('/api/settings/tool-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
