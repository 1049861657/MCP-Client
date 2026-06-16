import { bindChatModalClose, closeChatModal } from './ui/chat-modals-host.js';
import { warmMarkdownStack } from './markdown-stack.js';

/**
 * init / 事件绑定 / 上下文面板 — 从 app-core 外迁（T5-06-03）
 * @returns {Record<string, Function>}
 */
export function createAppLifecycleMethods() {
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

      await warmMarkdownStack();
      console.log('Markdown 栈预热完成');

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

          const settingsReady = this.ui.loadSettings?.() ?? Promise.resolve();
          return settingsReady
            .then(() => this.loadMCPServers())
            .catch((error) => {
              console.error('加载 MCP 服务器列表失败:', error);
            })
            .then(() => {
              this.ui.updateMCPButtonCounter?.();
              if (!this.state.mcpServers?.length) {
                this.scheduleMcpServersReload();
              }

              const event = new CustomEvent('AIChatAppInitialized');
              document.dispatchEvent(event);
              console.log('已触发AIChatAppInitialized事件');
            });
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
        genBtn.addEventListener('click', () => {
          void this.api.generateCompactDraft();
        });
      }
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          void this.api.applyCompactOverride();
        });
      }
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          void this.api.clearContextOverride();
        });
      }
    },
  };
}
