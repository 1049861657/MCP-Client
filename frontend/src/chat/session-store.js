/**
 * 聊天会话双模式抽象（T4-04）。
 *
 * - guest：委托 `data.js`/IndexedDB，沿用现网 `session_*` 本地会话；
 * - authed：委托 sessions API（只读历史 + 发新消息），`sessionId` 用服务端 `ChatSession.id`（cuid）。
 *
 * 模式在 init 时经 `getSession()` 判定一次（登录/登出走整页 reload，运行时不切换）。
 * authed 会话懒建：首次发送前若无服务端会话则 `POST /api/sessions`，title 由服务端从首条 user 消息生成。
 */
import { getSession } from '../auth/session.js';
import { CHAT_SESSION_ID_PREFIX } from './storage-contract.js';

const SESSION_MODE = { GUEST: 'guest', AUTHED: 'authed' };

const AUTHED_PAGE_LIMIT = 500;

/**
 * @param {object} message
 * @returns {string}
 */
function safeContent(message) {
  return typeof message.content === 'string' ? message.content : '';
}

/**
 * 服务端 StoredChatMessage[] → 与 messageHistory/IDB 同构的渲染条目。
 * assistant 的 OpenAI `toolCalls` 与随后的 tool 结果消息配对，重建富工具卡片所需字段。
 *
 * @param {Array<{ id: string; role: string; content: string|null; toolCalls: unknown; reasoning: string|null }>} rows
 * @returns {object[]}
 */
function mapServerMessagesToEntries(rows) {
  const entries = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.role === 'user') {
      entries.push({ role: 'user', content: safeContent(row) });
      continue;
    }
    if (row.role === 'tool') {
      const toolCallId =
        row.toolCalls && typeof row.toolCalls === 'object' && !Array.isArray(row.toolCalls)
          ? row.toolCalls.toolCallId
          : undefined;
      entries.push({
        role: 'tool',
        tool_call_id: typeof toolCallId === 'string' ? toolCallId : undefined,
        content: safeContent(row),
      });
      continue;
    }
    if (row.role === 'assistant') {
      const openAiToolCalls = Array.isArray(row.toolCalls) ? row.toolCalls : [];
      const richToolCalls = openAiToolCalls.map((tc) => {
        const args = tc.function?.arguments;
        let parsedArgs = {};
        try {
          parsedArgs = typeof args === 'string' ? JSON.parse(args) : args ?? {};
        } catch {
          parsedArgs = args ?? {};
        }
        const resultRow = rows.find(
          (candidate) => candidate.role === 'tool' && candidate.toolCalls?.toolCallId === tc.id,
        );
        return {
          id: tc.id,
          name: tc.function?.name ?? '未命名工具',
          source: 'mcp',
          args: parsedArgs,
          result: resultRow ? safeContent(resultRow) : undefined,
          isError: false,
          progressSteps: [],
        };
      });
      entries.push({
        role: 'assistant',
        content: safeContent(row),
        reasoning: row.reasoning ?? undefined,
        reasoning_content: row.reasoning ?? undefined,
        tool_calls: openAiToolCalls.length > 0 ? openAiToolCalls : undefined,
        toolCalls: richToolCalls.length > 0 ? richToolCalls : undefined,
        _toolResultsExpanded: true,
      });
    }
  }
  return entries;
}

/**
 * @param {object} app
 * @returns {SessionStore}
 */
export function createSessionStore(app) {
  /** @type {'guest' | 'authed'} */
  let mode = SESSION_MODE.GUEST;
  // authed：当前 app.state.sessionId 是否已对应服务端持久化会话（懒建标记）
  let activeSessionPersisted = false;

  async function init() {
    let user = null;
    try {
      user = await getSession();
    } catch {
      // get-session 瞬时失败按未登录处理（与 nav-auth 一致；登录/登出走整页 reload 可纠正）
      user = null;
    }
    mode = user ? SESSION_MODE.AUTHED : SESSION_MODE.GUEST;
    return mode;
  }

  const isAuthed = () => mode === SESSION_MODE.AUTHED;

  /**
   * 当前活动会话 ID 是否有效（用于 updateSessionDisplay 决定是否重生成）。
   * guest 要求 `session_` 前缀；authed 服务端 cuid，任何已存在 id 均有效、绝不重生成。
   * @param {string} sessionId
   * @returns {boolean}
   */
  function isValidActiveSessionId(sessionId) {
    if (!sessionId) {
      return false;
    }
    if (isAuthed()) {
      return true;
    }
    return sessionId.startsWith(CHAT_SESSION_ID_PREFIX) && sessionId !== 'session_NaN';
  }

  /**
   * @param {string} sessionId
   * @returns {string}
   */
  function displayId(sessionId) {
    if (!sessionId) {
      return isAuthed() ? '新会话' : '';
    }
    return sessionId.startsWith(CHAT_SESSION_ID_PREFIX)
      ? sessionId.slice(CHAT_SESSION_ID_PREFIX.length)
      : sessionId;
  }

  async function authedFetch(path, options = {}) {
    const response = await fetch(path, { credentials: 'include', ...options });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }
    return data;
  }

  // —— 会话列表 / 历史（history-modal 用）——

  /**
   * @param {string | null} provider guest 按 provider 过滤；authed 列表无 provider 维度，忽略
   * @returns {Promise<object[]>}
   */
  async function listSessions(provider) {
    if (!isAuthed()) {
      return app.data.getAllChatSessions(provider || null);
    }
    const data = await authedFetch('/api/sessions');
    return (data.sessions || []).map((session) => ({
      id: session.id,
      displayId: displayId(session.id),
      title: session.title || '无标题会话',
      preview: '',
      messageCount: 0,
      lastActive: session.updatedAt,
      timestamp: new Date(session.updatedAt).getTime(),
      provider: '',
    }));
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<object[]>} 渲染条目（与 messageHistory 同构）
   */
  async function getSessionMessages(sessionId) {
    if (!isAuthed()) {
      return app.data.getSessionMessages(sessionId);
    }
    const data = await authedFetch(
      `/api/sessions/${encodeURIComponent(sessionId)}/messages?limit=${AUTHED_PAGE_LIMIT}`,
    );
    return mapServerMessagesToEntries(data.messages || []);
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async function deleteSession(sessionId) {
    if (!isAuthed()) {
      await app.data.deleteSessionMessages(sessionId);
      return;
    }
    await authedFetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
    if (sessionId === app.state.sessionId) {
      activeSessionPersisted = false;
    }
  }

  // —— 活动会话生命周期 ——

  /**
   * 加载最近会话进 UI；无会话则开新会话。
   * @returns {Promise<string>}
   */
  async function loadLatest() {
    if (!isAuthed()) {
      return app.data.loadLatestProviderSession();
    }
    const data = await authedFetch('/api/sessions');
    const latest = (data.sessions || [])[0];
    if (latest) {
      return loadSession(latest.id);
    }
    return newSession();
  }

  /**
   * 加载指定会话进 UI。
   * @param {string} sessionId
   * @returns {Promise<string>}
   */
  async function loadSession(sessionId) {
    if (!isAuthed()) {
      return app.data.loadSession(sessionId);
    }

    app.state.isLoading = true;
    app.api?.resetContextCompressionState?.();
    try {
      const entries = await getSessionMessages(sessionId);
      app.state.sessionId = sessionId;
      activeSessionPersisted = true;
      app.state.messageHistory = entries;
      if (app.elements.chatMessages) {
        app.elements.chatMessages.innerHTML = '';
      }
      app.updateSessionDisplay();
      app.data.renderConversation(entries);
      return sessionId;
    } finally {
      app.state.isLoading = false;
    }
  }

  /**
   * 开新会话。guest 立即生成本地 `session_*`；authed 置为待建态（首发懒建）。
   * @returns {Promise<string> | string}
   */
  function newSession() {
    if (!isAuthed()) {
      return app.data.createNewSession();
    }
    app.state.sessionId = '';
    activeSessionPersisted = false;
    app.api?.resetContextCompressionState?.();
    app.ui?.clearPlanning?.();
    app.state.messageHistory = [];
    if (app.elements.chatMessages) {
      app.elements.chatMessages.innerHTML = '';
    }
    app.updateSessionDisplay();
    if (app.ui) {
      setTimeout(() => app.ui?.showRandomQuickMessages?.(), 100);
    }
    return app.state.sessionId;
  }

  /**
   * 发送前确保存在服务端会话（authed 懒建）；guest 无操作。
   * @returns {Promise<void>}
   */
  async function ensureActiveSession() {
    if (!isAuthed() || activeSessionPersisted) {
      return;
    }
    const data = await authedFetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    app.state.sessionId = data.session.id;
    activeSessionPersisted = true;
    app.updateSessionDisplay();
  }

  return {
    init,
    isAuthed,
    isValidActiveSessionId,
    displayId,
    listSessions,
    getSessionMessages,
    deleteSession,
    loadLatest,
    loadSession,
    newSession,
    ensureActiveSession,
  };
}

/**
 * @typedef {ReturnType<typeof createSessionStore>} SessionStore
 */
