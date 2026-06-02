import { CHAT_TOOLBAR_ICONS } from '../icons.js';
import { enhanceCodeBlocks } from '../code-blocks.js';
import { createRenderers, marked } from '../renderers.js';
import { createCompactModalApi } from './compact-modal.js';
import { createHistoryModalApi } from './history-modal.js';
import { createMcpModalApi } from './mcp-modal.js';
import { createQuickMessageUi } from './quickmessage.js';
import { createSettingsModalApi } from './settings-modal.js';
import { createToolCardsUi } from './tool-cards.js';

/**
 * @param {() => object} getApp
 */
export function createMinimalChatUi(getApp) {
  const ui = {
    parseMarkdown(text) {
      return marked.parse(text ?? '');
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
      const tooltip = getApp().elements.tooltip;
      if (!tooltip) {
        return;
      }
      tooltip.textContent = message;
      tooltip.classList.add('show');
      setTimeout(() => {
        tooltip.classList.remove('show');
      }, duration);
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
          : `<div class="markdown-content">${ui.parseMarkdown(text)}</div><span class="cursor"></span>`;

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
 * @param {() => object} getApp
 */
export function createChatUi(getApp) {
  const ui = createMinimalChatUi(getApp);
  const renderers = createRenderers(ui);
  const toolCards = createToolCardsUi(getApp, ui);
  Object.assign(ui, toolCards);

  const settings = createSettingsModalApi(getApp, ui);
  const history = createHistoryModalApi(getApp, ui);
  const mcp = createMcpModalApi(getApp, ui);
  const compact = createCompactModalApi(getApp, ui);
  const quickMessage = createQuickMessageUi(getApp, () => ui);

  Object.assign(ui, {
    showHistoryModal: history.showHistoryModal,
    showSettingsModal: settings.showSettingsModal,
    loadSettings: settings.loadSettings,
    saveSettings: settings.saveSettings,
    saveMcpServerIds: settings.saveMcpServerIds,
    showMCPServersModal: mcp.showMCPServersModal,
    updateMCPButtonCounter: mcp.updateMCPButtonCounter,
    showQuickMessagesModal: quickMessage.showQuickMessagesModal,
    showAppendedQuickMessages: quickMessage.showAppendedQuickMessages,
    showRandomQuickMessages: quickMessage.showRandomQuickMessages,
    ...compact,
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

/**
 * @param {string} text
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
