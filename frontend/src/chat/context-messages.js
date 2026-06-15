/**
 * 组装送入 API 的上下文消息与 authed 模式取数字段
 */

import { buildApiMessagesFromHistory } from './message-history-builder.js';

/**
 * @param {object} app
 * @param {string | null} newUserContent
 * @returns {object[]}
 */
export function buildApiContextMessages(app, newUserContent) {
  let messages = [];

  if (app.state.apiContextOverride?.length) {
    messages = app.state.apiContextOverride.map((m) => ({ ...m }));
  } else if (app.state.compactedBaseline) {
    const { summaryContent, historyStartIndex } = app.state.compactedBaseline;
    const tail = app.state.messageHistory.slice(historyStartIndex);
    const tailApi = buildApiMessagesFromHistory(
      tail,
      Math.max(tail.length, app.state.messageHistoryCount || tail.length),
    );
    messages = [{ role: 'user', content: summaryContent }, ...tailApi];
  } else if (app.state.enableMessageHistory && app.state.messageHistory.length > 0) {
    messages = buildApiMessagesFromHistory(
      app.state.messageHistory,
      app.state.messageHistoryCount,
    );
  }

  if (newUserContent) {
    messages.push({ role: 'user', content: newUserContent });
  }
  return messages;
}

/**
 * authed 模式下 context-preview / compact 的服务端取数字段（sessionId + 裁剪参数）；
 * guest 返回空对象（服务端据无 user 回退 body messages[]）。
 *
 * @param {object} app
 * @returns {Record<string, unknown>}
 */
export function authedContextFields(app) {
  if (!app.sessionStore?.isAuthed?.()) {
    return {};
  }
  return {
    sessionId: app.state.sessionId,
    contextOptions: { messageHistoryCount: app.state.messageHistoryCount },
  };
}

/**
 * @param {object} app
 * @param {string | null} newUserContent
 * @returns {object[]}
 */
export function buildOutgoingMessages(app, newUserContent) {
  return buildApiContextMessages(app, newUserContent);
}

/**
 * @param {object} app
 * @returns {object[]}
 */
export function buildBaseContextMessages(app) {
  return buildApiContextMessages(app, null);
}
