/**
 * 会话消息渲染（guest IDB 与 authed 服务端历史共用，T5-06-04）
 * @param {object} app
 * @param {object[]} messages 与 messageHistory 同构的条目（user/assistant/tool）
 */
export function renderSessionConversation(app, messages) {
  if (!app.ui) {
    return;
  }

  let previousUserMessage = null;
  for (const message of messages) {
    if (message.role === 'user') {
      previousUserMessage = message;
      app.ui?.addUserMessage?.(message.content);
    } else if (message.role === 'tool') {
      continue;
    } else if (message.role === 'assistant' && previousUserMessage) {
      const aiMessageDiv = app.ui?.addAIMessage?.(message.content);
      const reasoningText = message.reasoning_content ?? message.reasoning;
      if (reasoningText && aiMessageDiv) {
        app.renderers?.render?.('reasoning', reasoningText, aiMessageDiv);
      }
      if (message.toolCalls?.length > 0 && aiMessageDiv) {
        app.renderers?.render?.('tool-call-group', message.toolCalls, aiMessageDiv);
      }
      app.ui?.finalizeAIMessage?.(aiMessageDiv, false);
    }
  }

  setTimeout(() => {
    app.ui?.showAppendedQuickMessages?.();
  }, 300);
}
