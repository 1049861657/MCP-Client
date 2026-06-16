import { escapeHtml } from '../../shared/escape-html.js';
import { showFloatingTooltip } from '../../shared/ui/tooltip.js';
import { CHAT_TOOLBAR_ICONS } from '../icons.js';
import { enhanceCodeBlocks, parseMarkdown as parseMarkdownHtml } from '../markdown-stack.js';
import { createRenderers } from '../renderers.js';
import { createToolCardsUi } from './tool-cards.js';

/**
 * @param {() => object} getApp
 */
function createMinimalChatUi(getApp) {
  const ui = {
    parseMarkdown(text) {
      return parseMarkdownHtml(text);
    },

    processCodeBlocks(container) {
      enhanceCodeBlocks(container);
    },

    attachReasoningToggleEvent(header, container) {
      if (!header || !container) {
        return header;
      }

      const newHeader = header.cloneNode(true);
      header.parentNode?.replaceChild(newHeader, header);

      newHeader.addEventListener('click', (event) => {
        event.stopPropagation();
        container.classList.toggle('collapsed');

        const content = container.querySelector('.reasoning-content');
        if (content instanceof HTMLElement) {
          if (container.classList.contains('collapsed')) {
            content.style.maxHeight = '0px';
            content.style.paddingTop = '0px';
            content.style.paddingBottom = '0px';
          } else {
            content.style.maxHeight = '300px';
            content.style.paddingTop = '12px';
            content.style.paddingBottom = '12px';
          }
        }
      });

      return newHeader;
    },

    showTooltip(message, duration = 2000) {
      showFloatingTooltip(getApp().elements.tooltip, message, duration);
    },

    updateUIForMode() {
      const app = getApp();
      const { modeStream, modeRegular, chatMessages, result } = app.elements;
      if (!chatMessages || !result) {
        return;
      }
      if (modeStream && modeRegular) {
        modeStream.checked = app.state.isStreamMode;
        modeRegular.checked = !app.state.isStreamMode;
      }
      if (app.state.isStreamMode) {
        result.classList.add('hidden');
        chatMessages.style.display = 'flex';
      } else {
        result.classList.remove('hidden');
        chatMessages.style.display = 'none';
      }
    },

    addContextNotice(text) {
      const app = getApp();
      const container = app.elements.chatMessages;
      if (!container) {
        return;
      }

      if (app.state) {
        app.state.contextCompactedActive = true;
      }
      ui.updateContextCompactControls?.(true);

      const label = text || '已压缩';
      container.querySelector('.chat-context-notice')?.remove();

      const notice = document.createElement('div');
      notice.className = 'chat-context-notice chat-context-notice-compacted';
      notice.setAttribute('role', 'status');
      notice.innerHTML = `<span class="chat-context-notice-text">${escapeHtml(label)}</span>`;

      const chatMessages = container.querySelectorAll('.chat-message');
      const lastMsg = chatMessages[chatMessages.length - 1];
      const beforeAnchor = container.querySelector(
        '.quick-message-bubbles, .appended-quick-bubbles',
      );

      if (lastMsg instanceof HTMLElement) {
        lastMsg.insertAdjacentElement('afterend', notice);
      } else if (beforeAnchor) {
        container.insertBefore(notice, beforeAnchor);
      } else {
        container.appendChild(notice);
      }

      ui.scrollToBottom();
    },

    scrollToBottom() {
      const el = getApp().elements.chatMessages;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    },

    addUserMessage(text) {
      const app = getApp();
      chatMessagesClearWelcome(app.elements.chatMessages);

      const messageDiv = document.createElement('div');
      messageDiv.className = 'chat-message user';
      messageDiv.innerHTML = `
        <div class="avatar" aria-hidden="true">U</div>
        <div class="user-message-wrap">
          <div class="chat-bubble">
            <div class="user-message-text">${escapeHtml(text)}</div>
          </div>
          <div class="user-message-meta">${app.timeManager.getTimeString()}</div>
        </div>
      `;
      app.elements.chatMessages.appendChild(messageDiv);
      ui.scrollToBottom();
      return messageDiv;
    },

    addAIMessage(text = '') {
      const app = getApp();
      chatMessagesClearWelcome(app.elements.chatMessages);

      const messageDiv = document.createElement('div');
      messageDiv.className = 'chat-message ai';
      messageDiv.dataset.aiMessage = 'true';

      const initialContent =
        text === ''
          ? '<div class="ai-thinking"><div class="thinking-spinner"></div>AI正在思考中...</div>'
          : '<div class="markdown-content"></div><span class="cursor"></span>';

      messageDiv.innerHTML = `
        <div class="avatar" aria-hidden="true">AI</div>
        <div class="ai-message-wrap">
          <div class="chat-bubble">
            <div class="ai-bubble-inner">
              ${initialContent}
            </div>
          </div>
          <div class="ai-message-footer">
            <span class="ai-message-meta message-time">${app.timeManager.getTimeString()}</span>
            <div class="token-info" aria-label="Token usage"></div>
          </div>
        </div>
      `;

      const md = messageDiv.querySelector('.markdown-content');
      if (md && text) {
        md.innerHTML = ui.parseMarkdown(text);
        ui.processCodeBlocks(md);
      }

      app.elements.chatMessages.appendChild(messageDiv);
      ui.scrollToBottom();
      return messageDiv;
    },

    updateAIMessage(messageDiv, text) {
      ui.updateMainContent(messageDiv, text);
    },

    updateMainContent(messageDiv, text) {
      if (!messageDiv) {
        return;
      }
      const chatBubble = messageDiv.querySelector('.chat-bubble');
      if (!chatBubble) {
        return;
      }
      ui.hideThinking(messageDiv);

      const contentRoot = getAiBubbleInner(chatBubble);
      let markdownDiv = contentRoot.querySelector(':scope > .markdown-content:not(.reasoning-content)');
      if (!markdownDiv) {
        markdownDiv = document.createElement('div');
        markdownDiv.className = 'markdown-content';
        contentRoot.appendChild(markdownDiv);
      }
      markdownDiv.innerHTML = ui.parseMarkdown(text);
      ui.processCodeBlocks(markdownDiv);

      let cursor = contentRoot.querySelector(':scope > .cursor');
      if (!cursor) {
        cursor = document.createElement('span');
        cursor.className = 'cursor';
        contentRoot.appendChild(cursor);
      }

      ui.scrollToBottom();
    },

    hideThinking(messageDiv) {
      messageDiv?.querySelector('.ai-thinking')?.remove();
    },

    finalizeAIMessage(messageDiv, updateTime = true) {
      ui.hideThinking(messageDiv);
      messageDiv?.querySelector('.cursor')?.remove();

      const reasoningContainer = messageDiv?.querySelector('.reasoning-container');
      if (reasoningContainer) {
        const headerText = reasoningContainer.querySelector('.reasoning-header .title-text');
        if (headerText?.textContent === 'AI正在思考中...') {
          headerText.textContent = '查看AI思考过程';
        }

        if (updateTime && !messageDiv?.dataset.reasoningEnded) {
          const thinkingTime = reasoningContainer.querySelector('.thinking-time span');
          if (thinkingTime && messageDiv?.dataset.thinkingStartTime) {
            let elapsedThinkingTime;
            if (messageDiv.dataset.aiThinkingTime) {
              elapsedThinkingTime = parseInt(messageDiv.dataset.aiThinkingTime, 10);
            } else {
              elapsedThinkingTime = Math.round(
                (Date.now() - parseInt(messageDiv.dataset.thinkingStartTime, 10)) / 1000,
              );
              messageDiv.dataset.aiThinkingTime = elapsedThinkingTime.toString();
              reasoningContainer.dataset.thinkingTime = elapsedThinkingTime.toString();
            }
            thinkingTime.textContent = `${elapsedThinkingTime}秒`;
          }
          if (messageDiv) {
            messageDiv.dataset.reasoningEnded = 'true';
          }
        }

        reasoningContainer.classList.add('collapsed');
        const reasoningContent = reasoningContainer.querySelector('.reasoning-content');
        if (reasoningContent instanceof HTMLElement) {
          reasoningContent.style.maxHeight = '0px';
          reasoningContent.style.paddingTop = '0px';
          reasoningContent.style.paddingBottom = '0px';
        }

        const reasoningHeader = reasoningContainer.querySelector('.reasoning-header');
        if (reasoningHeader instanceof HTMLElement) {
          ui.attachReasoningToggleEvent(reasoningHeader, reasoningContainer);
        }
      }

      const markdownDiv = messageDiv?.querySelector(
        '.ai-bubble-inner > .markdown-content:not(.reasoning-content)',
      );
      if (markdownDiv) {
        ui.processCodeBlocks(markdownDiv);
      }
    },

    updateReasoningContent(messageDiv, reasoningText) {
      if (messageDiv?.dataset.reasoningEnded === 'true') {
        return;
      }

      const chatBubble = messageDiv?.querySelector('.chat-bubble');
      if (!chatBubble) {
        return;
      }

      const contentRoot = getAiBubbleInner(chatBubble);

      if (!messageDiv?.dataset.thinkingStartTime) {
        messageDiv.dataset.thinkingStartTime = Date.now().toString();
      }

      let reasoningContainer = contentRoot.querySelector('.reasoning-container');
      if (!reasoningContainer) {
        ui.hideThinking(messageDiv);
        reasoningContainer = document.createElement('div');
        reasoningContainer.className = 'reasoning-container';

        const reasoningHeader = document.createElement('div');
        reasoningHeader.className = 'reasoning-header';
        reasoningHeader.innerHTML = `
          ${CHAT_TOOLBAR_ICONS.reasoningToggle}
          <span class="title-text">AI正在思考中...</span>
          <div class="thinking-time">
            ${CHAT_TOOLBAR_ICONS.thinkingTime}
            <span>0秒</span>
          </div>
        `;

        const reasoningContentDiv = document.createElement('div');
        reasoningContentDiv.className = 'reasoning-content markdown-content';
        reasoningContentDiv.dataset.rawContent = '';

        reasoningContainer.appendChild(reasoningHeader);
        reasoningContainer.appendChild(reasoningContentDiv);
        contentRoot.insertBefore(reasoningContainer, contentRoot.firstChild);
        ui.attachReasoningToggleEvent(reasoningHeader, reasoningContainer);
      }

      const reasoningContentDiv = reasoningContainer.querySelector('.reasoning-content');
      if (reasoningContentDiv instanceof HTMLElement) {
        reasoningContentDiv.dataset.rawContent =
          (reasoningContentDiv.dataset.rawContent ?? '') + reasoningText;
        reasoningContentDiv.innerHTML = ui.parseMarkdown(reasoningContentDiv.dataset.rawContent);
        ui.processCodeBlocks(reasoningContentDiv);

        if (!reasoningContainer.classList.contains('collapsed')) {
          reasoningContentDiv.scrollTop = reasoningContentDiv.scrollHeight;
        }
      }

      if (messageDiv?.dataset.thinkingStartTime && messageDiv.dataset.reasoningEnded !== 'true') {
        const thinkingElapsedSeconds = Math.round(
          (Date.now() - parseInt(messageDiv.dataset.thinkingStartTime, 10)) / 1000,
        );
        const thinkingTimeSpan = reasoningContainer.querySelector('.thinking-time span');
        if (thinkingTimeSpan) {
          thinkingTimeSpan.textContent = `${thinkingElapsedSeconds}秒`;
        }
        reasoningContainer.dataset.thinkingTime = thinkingElapsedSeconds.toString();
        messageDiv.dataset.aiThinkingTime = thinkingElapsedSeconds.toString();
      }
    },
  };

  return ui;
}

/**
 * @param {() => Promise<object>} loadApi
 */
function createLazyModalLoader(loadApi) {
  /** @type {object | null} */
  let api = null;
  /** @type {Promise<object> | null} */
  let promise = null;

  function ensure() {
    if (api) {
      return Promise.resolve(api);
    }
    if (!promise) {
      promise = loadApi().then((loaded) => {
        api = loaded;
        return loaded;
      });
    }
    return promise;
  }

  return { ensure };
}

/**
 * @param {{ ensure: () => Promise<object> }} loader
 * @param {string[]} methodNames
 */
function bindLazyModalMethods(loader, methodNames) {
  /** @type {Record<string, (...args: unknown[]) => void>} */
  const bound = {};
  for (const name of methodNames) {
    bound[name] = (...args) => {
      void loader.ensure().then((api) => {
        const fn = api[name];
        if (typeof fn !== 'function') {
          throw new Error(`[chat-ui] lazy modal 缺少方法: ${name}`);
        }
        fn(...args);
      });
    };
  }
  return bound;
}

/**
 * @param {() => object} getApp
 */
export function createChatUi(getApp) {
  const ui = createMinimalChatUi(getApp);
  const renderers = createRenderers(ui);
  const toolCards = createToolCardsUi(getApp, ui);
  Object.assign(ui, toolCards);

  const memoryDebugLoader = createLazyModalLoader(async () => {
    const { createMemoryDebugModalApi } = await import('./memory-debug-modal.js');
    return createMemoryDebugModalApi(getApp);
  });

  const systemToolsLoader = createLazyModalLoader(async () => {
    const { createSystemToolsModalApi } = await import('./system-tools-modal.js');
    return createSystemToolsModalApi(getApp);
  });

  const compactLoader = createLazyModalLoader(async () => {
    const { createCompactModalApi } = await import('./compact-modal.js');
    return createCompactModalApi(getApp, ui);
  });

  const mcpLoader = createLazyModalLoader(async () => {
    const { createMcpModalApi } = await import('./mcp-modal.js');
    return createMcpModalApi(getApp, ui);
  });

  const quickMessageLoader = createLazyModalLoader(async () => {
    const { createQuickMessageUi } = await import('./quickmessage.js');
    return createQuickMessageUi(getApp, () => ui);
  });

  const historyLoader = createLazyModalLoader(async () => {
    const { createHistoryModalApi } = await import('./history-modal.js');
    return createHistoryModalApi(getApp, ui);
  });

  const settingsLoader = createLazyModalLoader(async () => {
    const { createSettingsModalApi } = await import('./settings-modal.js');
    return createSettingsModalApi(getApp, ui);
  });

  Object.assign(ui, {
    CONTEXT_COMPACTED_LABEL: '已压缩',
    isContextCompacted() {
      const app = getApp();
      return !!(
        app?.state?.apiContextOverride?.length ||
        app?.state?.contextCompactedActive
      );
    },
    showMemoryDebugModal: async () => {
      const api = await memoryDebugLoader.ensure();
      api.showMemoryDebugModal();
    },
    showSystemToolsModal: async () => {
      const api = await systemToolsLoader.ensure();
      api.showSystemToolsModal();
    },
    showMCPServersModal: async () => {
      const api = await mcpLoader.ensure();
      api.showMCPServersModal();
    },
    showQuickMessagesModal: async () => {
      const api = await quickMessageLoader.ensure();
      await api.showQuickMessagesModal();
    },
    showHistoryModal: async () => {
      const api = await historyLoader.ensure();
      api.showHistoryModal();
    },
    showSettingsModal: async () => {
      const api = await settingsLoader.ensure();
      void memoryDebugLoader.ensure();
      api.showSettingsModal();
    },
    loadSettings: () => settingsLoader.ensure().then((api) => {
      api.loadSettings();
    }),
    saveSettings: () => {
      void settingsLoader.ensure().then((api) => api.saveSettings());
    },
    saveMcpServerIds: () => {
      void settingsLoader.ensure().then((api) => api.saveMcpServerIds());
    },
    updateMCPButtonCounter: () => {
      void mcpLoader.ensure().then((api) => api.updateMCPButtonCounter());
    },
    showAppendedQuickMessages: () => {
      void quickMessageLoader.ensure().then((api) => api.showAppendedQuickMessages());
    },
    showRandomQuickMessages: () => {
      void quickMessageLoader.ensure().then((api) => api.showRandomQuickMessages());
    },
    ...bindLazyModalMethods(compactLoader, [
      'showContextModal',
      'renderContextPreview',
      'renderContextPreviewError',
      'syncContextDraftPreview',
      'setCompactDraft',
      'refreshCompactSectionUi',
      'setContextCompactGenerating',
      'updateContextCompactControls',
    ]),
  });

  return { ui, renderers };
}

/**
 * @param {HTMLElement} chatBubble
 * @returns {HTMLElement}
 */
function getAiBubbleInner(chatBubble) {
  return chatBubble.querySelector('.ai-bubble-inner') ?? chatBubble;
}

/**
 * @param {HTMLElement | null | undefined} chatMessages
 */
function chatMessagesClearWelcome(chatMessages) {
  chatMessages?.querySelector('.chat-welcome')?.remove();
}
