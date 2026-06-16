import { loadCompactedBaselineFromStorage } from './compact-baseline-storage.js';
import {
  CHAT_DB_INDEX_PROVIDER,
  CHAT_DB_INDEX_TIMESTAMP,
  CHAT_MESSAGES_STORE,
} from './storage-contract.js';
import { isEphemeralHarnessMessage } from './message-history-builder.js';
import { createSessionIdb } from './session-idb.js';
import { renderSessionConversation } from './session-conversation.js';

/**
 * @param {object} app
 * @returns {ChatData}
 */
export function createChatData(app) {
  const idb = createSessionIdb(app);
  const db = idb.db;

  function init() {
    console.log('初始化数据管理模块...');
    initDatabase();
  }

  function initDatabase() {
    idb.initDatabase(() => {
      // authed 走服务端会话（session-store.loadLatest），不读本地 IDB 历史
      if (app.sessionStore?.isAuthed?.()) {
        return;
      }

      loadMessageHistory();

      if (app.state.isConfigLoaded && app.elements.provider) {
        console.log('数据库就绪，尝试加载或创建会话');
        setTimeout(() => {
          loadLatestProviderSession()
            .then(() => {
              app.updateSessionDisplay();
            })
            .catch((error) => {
              console.error('自动加载最新会话失败:', error);
              createNewSession();
            });
        }, 500);
      }
    });
  }

  function getAllChatSessions(provider = null) {
    return new Promise((resolve, reject) => {
      if (!db.isReady || !db.instance) {
        console.error('获取会话列表失败: 数据库未就绪');
        reject(new Error('数据库未就绪'));
        return;
      }

      try {
        const transaction = db.instance.transaction([CHAT_MESSAGES_STORE], 'readonly');
        const store = transaction.objectStore(CHAT_MESSAGES_STORE);

        const sessionsMap = {};

        let request;

        if (provider && store.indexNames.contains(CHAT_DB_INDEX_PROVIDER)) {
          console.log(`使用provider索引过滤供应商: ${provider} 的会话`);
          const index = store.index(CHAT_DB_INDEX_PROVIDER);
          const range = IDBKeyRange.only(provider);
          request = index.openCursor(range);
        } else {
          request = store.openCursor();
        }

        request.onsuccess = (event) => {
          const cursor = event.target.result;

          if (cursor) {
            const message = cursor.value;
            const sessionId = message.sessionId;
            const messageProvider = message.provider || 'unknown';

            if (provider && messageProvider !== provider) {
              cursor.continue();
              return;
            }

            if (!sessionsMap[sessionId]) {
              sessionsMap[sessionId] = {
                sessionId: sessionId,
                messages: [],
                lastTimestamp: 0,
                messageCount: 0,
                provider: messageProvider,
              };
            }

            const session = sessionsMap[sessionId];
            if (message.role === 'user' || message.role === 'assistant') {
              session.messageCount++;
            }
            session.lastTimestamp = Math.max(session.lastTimestamp, message.timestamp);

            const userMessagesCount = session.messages.filter((m) => m.role === 'user').length;
            const aiMessagesCount = session.messages.filter((m) => m.role === 'assistant').length;

            if ((message.role === 'user' && userMessagesCount < 2) ||
              (message.role === 'assistant' && aiMessagesCount < 1)) {
              session.messages.push({
                role: message.role,
                content: message.content,
              });
            }

            cursor.continue();
          } else {
            const sessions = Object.values(sessionsMap).sort((a, b) => b.lastTimestamp - a.lastTimestamp);

            const formattedSessions = sessions.map((session) => {
              const firstUserMessage = session.messages.find((m) => m.role === 'user');
              const firstAIMessage = session.messages.find((m) => m.role === 'assistant');

              const lastActiveDate = new Date(session.lastTimestamp);
              const dateOptions = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              };
              const formattedDate = lastActiveDate.toLocaleString('zh-CN', dateOptions);

              const displayId = session.sessionId.replace('session_', '');

              return {
                id: session.sessionId,
                displayId: displayId,
                title: firstUserMessage ? firstUserMessage.content.substring(0, 50) : '无标题会话',
                preview: firstAIMessage ? firstAIMessage.content.substring(0, 100) : '无预览内容',
                messageCount: session.messageCount,
                lastActive: formattedDate,
                timestamp: session.lastTimestamp,
                provider: session.provider,
              };
            });

            if (provider) {
              console.log(`找到供应商 ${provider} 的会话数量: ${formattedSessions.length}`);
            }

            resolve(formattedSessions);
          }
        };

        request.onerror = (event) => {
          console.error('获取会话列表失败:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('获取会话列表时出错:', error);
        reject(error);
      }
    });
  }

  function getLatestProviderSession() {
    if (!db.isReady || !db.instance) {
      console.error('数据库未就绪，无法获取最新会话');
      return Promise.reject(new Error('数据库未就绪'));
    }

    const currentProvider = app.elements.provider ? app.elements.provider.value : null;
    if (!currentProvider) {
      console.error('当前未选择供应商，无法获取最新会话');
      return Promise.reject(new Error('未选择供应商'));
    }

    console.log(`尝试获取供应商 ${currentProvider} 的最新会话`);

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.instance.transaction([CHAT_MESSAGES_STORE], 'readonly');
        const store = transaction.objectStore(CHAT_MESSAGES_STORE);

        let index;
        let request;

        if (store.indexNames.contains(CHAT_DB_INDEX_PROVIDER)) {
          index = store.index(CHAT_DB_INDEX_PROVIDER);
          const range = IDBKeyRange.only(currentProvider);
          request = index.openCursor(range, 'prev');
        } else {
          index = store.index(CHAT_DB_INDEX_TIMESTAMP);
          request = index.openCursor(null, 'prev');
        }

        let latestSession = null;
        let latestTimestamp = 0;
        const processedSessions = new Set();

        request.onsuccess = (event) => {
          const cursor = event.target.result;

          if (cursor) {
            const message = cursor.value;
            const sessionId = message.sessionId;
            const messageProvider = message.provider || 'unknown';

            if (!store.indexNames.contains(CHAT_DB_INDEX_PROVIDER) && messageProvider !== currentProvider) {
              cursor.continue();
              return;
            }

            if (!processedSessions.has(sessionId) && message.timestamp > latestTimestamp) {
              latestSession = sessionId;
              latestTimestamp = message.timestamp;
              processedSessions.add(sessionId);
            }

            if (processedSessions.size >= 100) {
              console.log(`已处理100个会话，返回最新会话: ${latestSession}`);
              resolve(latestSession);
              return;
            }

            cursor.continue();
          } else {
            if (latestSession) {
              console.log(`找到供应商 ${currentProvider} 的最新会话: ${latestSession}`);
              resolve(latestSession);
            } else {
              console.log(`未找到供应商 ${currentProvider} 的会话记录`);
              resolve(null);
            }
          }
        };

        request.onerror = () => {
          console.error('获取最新会话失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('获取最新会话过程中出错:', error);
        reject(error);
      }
    });
  }

  function createNewSession() {
    const currentProvider = app.elements.provider.value || 'default';

    const now = new Date();
    const dateStr = now.getFullYear() +
      ('0' + (now.getMonth() + 1)).slice(-2) +
      ('0' + now.getDate()).slice(-2);

    const randomId = Math.floor(1000 + Math.random() * 9000);

    const sessionId = `session_${dateStr}-${randomId}`;

    app.state.sessionId = sessionId;

    app.api.resetContextCompressionState();
    app.ui?.clearPlanning?.();

    app.state.messageHistory = [];

    if (app.elements.chatMessages) {
      app.elements.chatMessages.innerHTML = '';
    }

    app.updateSessionDisplay();

    console.log(`已创建新会话 ${sessionId} (供应商: ${currentProvider})`);

    if (app.ui) {
      setTimeout(() => {
        app.ui?.showRandomQuickMessages?.();
      }, 100);
    }

    return sessionId;
  }

  function loadSession(sessionId) {
    app.state.isLoading = true;

    return new Promise((resolve, reject) => {
      if (!sessionId) {
        app.state.isLoading = false;
        reject(new Error('无效的会话ID'));
        return;
      }

      console.log(`正在加载会话 ${sessionId}`);

      app.api.resetContextCompressionState();

      idb.getSessionMessages(sessionId)
        .then((messages) => {
          if (!messages || messages.length === 0) {
            console.warn(`会话 ${sessionId} 没有消息`);

            app.state.sessionId = sessionId;
            app.updateSessionDisplay();

            if (app.elements.chatMessages) {
              app.elements.chatMessages.innerHTML = '';
            }

            app.state.messageHistory = [];

            app.state.isLoading = false;

            if (app.ui) {
              setTimeout(() => {
                app.ui?.showRandomQuickMessages?.();
              }, 100);
            }

            resolve(sessionId);
            return;
          }

          const provider = messages[0].provider;

          if (provider && app.elements.provider.value !== provider) {
            console.log(`会话供应商 ${provider} 与当前供应商 ${app.elements.provider.value} 不同，切换中...`);

            let providerExists = false;
            for (let i = 0; i < app.elements.provider.options.length; i++) {
              if (app.elements.provider.options[i].value === provider) {
                app.elements.provider.selectedIndex = i;
                providerExists = true;
                break;
              }
            }

            if (providerExists) {
              app.updateModelOptions();
            } else {
              console.warn(`供应商 ${provider} 不存在于当前选项中，使用当前供应商`);
            }
          }

          app.state.sessionId = sessionId;
          app.updateSessionDisplay();

          if (app.elements.chatMessages) {
            app.elements.chatMessages.innerHTML = '';
          }

          app.state.messageHistory = messages
            .filter((msg) => !isEphemeralHarnessMessage(msg))
            .map((msg) => ({
              role: msg.role,
              content: msg.content,
              turnId: msg.turnId,
              reasoning: msg.reasoning ?? msg.reasoning_content,
              reasoning_content: msg.reasoning_content ?? msg.reasoning,
              tool_calls: msg.tool_calls,
              tool_call_id: msg.tool_call_id,
              toolCalls: msg.toolCalls,
              _toolResultsExpanded: msg._toolResultsExpanded,
            }));

          loadCompactedBaselineFromStorage(app);

          renderConversation(messages);

          app.state.isLoading = false;

          resolve(sessionId);
        })
        .catch((error) => {
          console.error(`加载会话 ${sessionId} 失败:`, error);
          app.state.isLoading = false;
          reject(error);
        });
    });
  }

  function loadLatestProviderSession() {
    app.state.isLoading = true;

    return getLatestProviderSession()
      .then((sessionId) => {
        if (sessionId) {
          console.log(`开始加载最新会话: ${sessionId}`);
          return loadSession(sessionId);
        }
        console.log('没有找到历史会话，创建新会话');
        return createNewSession();
      })
      .catch((error) => {
        console.error('加载最新会话失败:', error);
        console.log('加载最新会话失败，创建新会话');
        return createNewSession();
      })
      .finally(() => {
        app.state.isLoading = false;
      });
  }

  function loadMessageHistory() {
    if (!db.isReady) {
      console.log('数据库未就绪，稍后将重试加载消息历史');
      setTimeout(() => loadMessageHistory(), 500);
      return;
    }

    idb.loadChatHistory(50)
      .then((messages) => {
        if (messages && messages.length > 0) {
          app.state.messageHistory = messages
            .filter((msg) => !isEphemeralHarnessMessage(msg))
            .filter((msg) => msg.role && (
              msg.content != null && msg.content !== '' ||
              msg.role === 'tool' ||
              (msg.role === 'assistant' && (msg.tool_calls?.length || msg.toolCalls?.length))
            ))
            .map((msg) => ({
              role: msg.role,
              content: msg.content,
              turnId: msg.turnId,
              reasoning: msg.reasoning ?? msg.reasoning_content,
              reasoning_content: msg.reasoning_content ?? msg.reasoning,
              tool_calls: msg.tool_calls,
              tool_call_id: msg.tool_call_id,
              toolCalls: msg.toolCalls,
              _toolResultsExpanded: msg._toolResultsExpanded,
            }));

          console.log(`已从IndexedDB加载 ${app.state.messageHistory.length} 条消息历史 [会话: ${app.state.sessionId}]`);
        } else {
          console.log('没有找到历史消息记录');
          app.state.messageHistory = [];
        }
      })
      .catch((error) => {
        console.error('加载消息历史失败:', error);
        app.state.messageHistory = [];
      });
  }

  function saveMessageHistory() {
    if (app.state.messageHistory.length === 0 || !db.isReady) {
      return;
    }

    let startIdx = 0;
    for (let i = app.state.messageHistory.length - 1; i >= 0; i--) {
      if (app.state.messageHistory[i].role === 'user') {
        startIdx = i;
        break;
      }
    }
    const turnMessages = app.state.messageHistory.slice(startIdx);

    for (const msg of turnMessages) {
      if (isEphemeralHarnessMessage(msg)) {
        continue;
      }
      idb.saveChatMessage(msg)
        .catch((error) => console.error('保存消息失败:', error));
    }
  }

  function renderConversation(messages) {
    renderSessionConversation(app, messages);
  }

  return {
    db,
    init,
    getSessionMessages: idb.getSessionMessages,
    deleteSessionMessages: idb.deleteSessionMessages,
    saveChatMessage: idb.saveChatMessage,
    getAllChatSessions,
    createNewSession,
    loadSession,
    loadLatestProviderSession,
    saveMessageHistory,
    renderConversation,
  };
}

/**
 * @typedef {object} ChatDataDb
 * @property {IDBDatabase | null} instance
 * @property {string} name
 * @property {number} version
 * @property {boolean} isReady
 */

/**
 * @typedef {ReturnType<typeof createChatData>} ChatData
 */
