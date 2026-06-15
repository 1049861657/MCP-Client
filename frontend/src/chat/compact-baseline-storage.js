/**
 * 压缩基线与消息历史本地持久化（guest 写 localStorage/IDB；authed 跳过）
 */

import { compactBaselineStorageKey } from './storage-contract.js';

/**
 * @param {object} app
 */
export function persistMessageHistory(app) {
  // authed：服务端轮末落库（SessionEnd 钩子），同一条消息不再写本地 IDB
  if (app.sessionStore?.isAuthed?.()) {
    return;
  }
  if (typeof app.saveMessageHistory === 'function') {
    app.saveMessageHistory();
    return;
  }
  if (app.data && typeof app.data.saveMessageHistory === 'function') {
    app.data.saveMessageHistory();
  }
}

/**
 * @param {object} app
 */
export function saveCompactedBaselineToStorage(app) {
  // authed：压缩基线只在服务端（ChatSession.compactBaselineJson），本地不留副本
  if (app.sessionStore?.isAuthed?.()) {
    return;
  }
  if (!app?.state?.sessionId) {
    return;
  }
  const key = compactBaselineStorageKey(app.state.sessionId);
  if (app.state.compactedBaseline) {
    localStorage.setItem(key, JSON.stringify(app.state.compactedBaseline));
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * @param {object} app
 */
export function loadCompactedBaselineFromStorage(app) {
  // authed：基线由服务端组上下文使用，本地态恒为 null（不读 localStorage）
  if (app.sessionStore?.isAuthed?.()) {
    app.state.compactedBaseline = null;
    return;
  }
  if (!app?.state?.sessionId) {
    return;
  }
  try {
    const raw = localStorage.getItem(compactBaselineStorageKey(app.state.sessionId));
    app.state.compactedBaseline = raw ? JSON.parse(raw) : null;
  } catch {
    app.state.compactedBaseline = null;
  }
}
