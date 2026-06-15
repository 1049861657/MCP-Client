/**
 * AI 聊天应用核心模块 — ESM 工厂，编排 data / api / ui / utils
 */

import { createConfigFetchMethods } from './config-fetch.js';
import { createPromptEditorMethods } from './prompt-editor.js';
import { createChatApi } from './api.js';
import { createChatData } from './data.js';
import { createSessionStore } from './session-store.js';
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
import { filterEnabledToKnownServers, filterServersWithUsableTools, reconcileMcpSelectionFromList } from './mcp-selection.js';

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
  app.sessionStore = createSessionStore(app);

  app.api = createChatApi({
    getApp: () => app,
    getUI: () => app.ui,
    TurnCollector,
  });

  app.utils = createChatUtils(app);

  app.saveMessageHistory = () => {
    app.data.saveMessageHistory();
  };

  Object.assign(app, createAppMethods(), createPromptEditorMethods(), createConfigFetchMethods());

  return app;
}

/**
 * @returns {Record<string, Function>}
 */
function createAppMethods() {
  return {
    async init() {
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

      // 先判定 guest/authed 模式（登录/登出走整页 reload，运行时不切换）
      await this.sessionStore.init();
      this.state.sessionId = this.sessionStore.isAuthed()
        ? ''
        : `session_temp_${Date.now().toString(36)}`;
      console.log('会话模式:', this.sessionStore.isAuthed() ? 'authed' : 'guest');

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
        if (!this.sessionStore.isValidActiveSessionId(this.state.sessionId)) {
          if (this.sessionStore.isAuthed()) {
            // authed 待建会话：显示占位，绝不重生成服务端 ID（首发懒建）
            sessionNameElement.textContent = '新会话';
            sessionNameElement.title = '新会话（发送后创建）';
            return;
          }
          console.warn('会话ID无效，重新生成:', this.state.sessionId);
          this.state.sessionId = `session_${Math.random().toString(36).substring(2, 10)}`;
        }

        const displayId = this.sessionStore.displayId(this.state.sessionId);

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
      return filterServersWithUsableTools(
        filterEnabledToKnownServers(
          this.state.enabledServerIds || [],
          this.state.mcpServers || [],
        ),
        this.state.mcpServers || [],
      );
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
        reconcileMcpSelectionFromList(this, this.ui);
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
      return this.sessionStore.newSession();
    },
  };
}
