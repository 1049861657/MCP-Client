/**
 * AI 聊天应用核心模块 — ESM 工厂，编排 session-data / chat-api / ui / utils
 */

import { createConfigFetchMethods } from './config-fetch.js';
import { createPromptEditorMethods } from './prompt-editor.js';
import { createChatApi } from './chat-api.js';
import { createChatData } from './session-data.js';
import { createSessionStore } from './session-store.js';
import { TurnCollector } from './turn-collector.js';
import { createAppLifecycleMethods } from './app-lifecycle.js';
import {
  calculateElapsedTime,
  formatElapsedTime,
  getFullTimeString,
  getTimeString,
  saveThinkingTimeData,
  updateThinkingTime,
} from './time.js';
import { createChatUtils } from './utils.js';
import { filterEnabledToKnownServers, filterServersWithUsableTools } from './mcp-selection.js';

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

  Object.assign(
    app,
    createAppMethods(),
    createAppLifecycleMethods(),
    createPromptEditorMethods(),
    createConfigFetchMethods(),
  );

  return app;
}

/**
 * @returns {Record<string, Function>}
 */
function createAppMethods() {
  return {
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
        this.ui.updateMCPButtonCounter?.();
        return data;
      } catch (error) {
        console.error('加载MCP服务器列表失败:', error);
        this.ui.showTooltip?.('获取MCP服务器列表失败，请检查网络连接');
        throw error;
      }
    },

    async handleOpenContextPanel() {
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
