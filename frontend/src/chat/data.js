import {
  CHAT_DB_INDEX_PROVIDER,
  CHAT_DB_INDEX_SESSION,
  CHAT_DB_INDEX_TIMESTAMP,
  CHAT_DB_NAME,
  CHAT_DB_VERSION,
  CHAT_MESSAGES_STORE,
} from './storage-contract.js';

/**
 * @param {object} app
 * @returns {ChatData}
 */
export function createChatData(app) {
  const db = {
    instance: null,
    name: CHAT_DB_NAME,
    version: CHAT_DB_VERSION,
    isReady: false,
  };

  function init() {
    console.log('初始化数据管理模块...');
    initDatabase();
  }

  function initDatabase() {
    console.log('初始化IndexedDB数据库...');

    const request = indexedDB.open(db.name, db.version);

    request.onerror = (event) => {
      console.error('打开IndexedDB失败:', event.target.error);
      db.isReady = false;
    };

    request.onsuccess = (event) => {
      console.log('成功打开IndexedDB数据库');
      db.instance = event.target.result;
      db.isReady = true;

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
    };

    request.onupgradeneeded = (event) => {
      console.log('升级数据库...');
      const idb = event.target.result;

      if (!idb.objectStoreNames.contains(CHAT_MESSAGES_STORE)) {
        const store = idb.createObjectStore(CHAT_MESSAGES_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });

        store.createIndex(CHAT_DB_INDEX_SESSION, 'sessionId', { unique: false });
        store.createIndex(CHAT_DB_INDEX_TIMESTAMP, 'timestamp', { unique: false });
        store.createIndex(CHAT_DB_INDEX_PROVIDER, 'provider', { unique: false });

        console.log('已创建messages表和索引');
      } else {
        const transaction = event.target.transaction;
        const store = transaction.objectStore(CHAT_MESSAGES_STORE);

        if (!store.indexNames.contains(CHAT_DB_INDEX_PROVIDER)) {
          store.createIndex(CHAT_DB_INDEX_PROVIDER, 'provider', { unique: false });
          console.log('已添加provider索引到messages表');
        }
      }
    };
  }

  function getSessionMessages(sessionId, limit = 0) {
    return new Promise((resolve, reject) => {
      if (!db.isReady || !db.instance) {
        console.error('数据库未就绪');
        reject(new Error('数据库未就绪'));
        return;
      }

      try {
        const transaction = db.instance.transaction([CHAT_MESSAGES_STORE], 'readonly');
        const store = transaction.objectStore(CHAT_MESSAGES_STORE);
        const index = store.index(CHAT_DB_INDEX_SESSION);

        const request = index.openCursor(IDBKeyRange.only(sessionId));

        const messages = [];

        request.onsuccess = (event) => {
          const cursor = event.target.result;

          if (cursor) {
            messages.push(cursor.value);
            cursor.continue();
          } else {
            messages.sort((a, b) => a.timestamp - b.timestamp);

            const result = limit > 0 ? messages.slice(-limit) : messages;
            resolve(result);
          }
        };

        request.onerror = (event) => {
          console.error('查询会话消息失败:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('获取会话消息出错:', error);
        reject(error);
      }
    });
  }

  function deleteSessionMessages(sessionId) {
    return new Promise((resolve, reject) => {
      if (!db.isReady || !db.instance) {
        console.error('数据库未就绪');
        reject(new Error('数据库未就绪'));
        return;
      }

      if (!sessionId) {
        console.error('无效的会话ID');
        reject(new Error('无效的会话ID'));
        return;
      }

      try {
        const transaction = db.instance.transaction([CHAT_MESSAGES_STORE], 'readwrite');
        const store = transaction.objectStore(CHAT_MESSAGES_STORE);
        const index = store.index(CHAT_DB_INDEX_SESSION);

        const request = index.openCursor(IDBKeyRange.only(sessionId));

        const messageIds = [];

        request.onsuccess = (event) => {
          const cursor = event.target.result;

          if (cursor) {
            messageIds.push(cursor.value.id);
            cursor.continue();
          } else {
            if (messageIds.length === 0) {
              console.log(`会话 ${sessionId} 没有消息需要删除`);
              resolve();
              return;
            }

            let deletedCount = 0;

            const deleteComplete = () => {
              if (++deletedCount === messageIds.length) {
                console.log(`已删除会话 ${sessionId} 的所有消息（${messageIds.length}条）`);
                resolve();
              }
            };

            messageIds.forEach((id) => {
              const deleteRequest = store.delete(id);

              deleteRequest.onsuccess = () => {
                deleteComplete();
              };

              deleteRequest.onerror = (error) => {
                console.error(`删除消息 ${id} 失败:`, error);
                deleteComplete();
              };
            });
          }
        };

        request.onerror = (event) => {
          console.error('查询要删除的消息失败:', event.target.error);
          reject(event.target.error);
        };

        transaction.oncomplete = () => {
          // 不做任何事，所有操作已经在deleteComplete中处理
        };

        transaction.onerror = (event) => {
          console.error('删除会话消息事务失败:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('删除会话消息出错:', error);
        reject(error);
      }
    });
  }

  function saveChatMessage(message) {
    if (!db.isReady || !db.instance) {
      console.error('保存消息失败: 数据库未就绪');
      return Promise.reject(new Error('数据库未就绪'));
    }

    const hasPersistablePayload = message && (
      (message.content != null && message.content !== '') ||
      message.role === 'tool' ||
      (message.role === 'assistant' && (
        (message.tool_calls?.length > 0) || (message.toolCalls?.length > 0)
      ))
    );

    if (!hasPersistablePayload || !app.state.sessionId) {
      console.error('保存消息失败: 无效的消息或会话ID', {
        hasMessage: !!message,
        role: message?.role,
        sessionId: app.state.sessionId,
      });
      return Promise.reject(new Error('无效的消息或会话ID'));
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.instance.transaction([CHAT_MESSAGES_STORE], 'readwrite');
        const store = transaction.objectStore(CHAT_MESSAGES_STORE);

        const messageToStore = {
          ...message,
          sessionId: app.state.sessionId,
          timestamp: Date.now(),
          provider: app.elements.provider.value,
        };

        const request = store.add(messageToStore);

        request.onsuccess = () => {
          console.log('消息已保存到数据库');
          resolve(messageToStore);
        };

        request.onerror = (event) => {
          console.error('保存消息到数据库失败:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('保存消息到数据库时出错:', error);
        reject(error);
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

    app.api?.resetContextCompressionState?.();

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

      app.api?.resetContextCompressionState?.();

      getSessionMessages(sessionId)
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

          app.state.messageHistory = messages.map((msg) => ({
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

          app.api?.loadCompactedBaselineFromStorage?.(app);

          if (app.ui) {
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

    loadChatHistory(50)
      .then((messages) => {
        if (messages && messages.length > 0) {
          app.state.messageHistory = messages
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
      saveChatMessage(msg)
        .catch((error) => console.error('保存消息失败:', error));
    }
  }

  function loadChatHistory(limit = 50) {
    if (!db.isReady || !db.instance) {
      console.error('数据库未就绪，无法加载消息历史');
      return Promise.reject(new Error('数据库未就绪'));
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.instance.transaction([CHAT_MESSAGES_STORE], 'readonly');
        const store = transaction.objectStore(CHAT_MESSAGES_STORE);
        const index = store.index(CHAT_DB_INDEX_SESSION);

        const range = IDBKeyRange.only(app.state.sessionId);
        const request = index.openCursor(range, 'prev');

        const messages = [];
        let counter = 0;

        request.onsuccess = (event) => {
          const cursor = event.target.result;

          if (cursor && counter < limit) {
            messages.push(cursor.value);
            counter++;
            cursor.continue();
          } else {
            messages.sort((a, b) => a.timestamp - b.timestamp);
            console.log(`从数据库加载了 ${messages.length} 条消息`);
            resolve(messages);
          }
        };

        request.onerror = () => {
          console.error('加载消息历史失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('加载消息历史过程中出错:', error);
        reject(error);
      }
    });
  }

  return {
    db,
    init,
    initDatabase,
    getSessionMessages,
    deleteSessionMessages,
    saveChatMessage,
    getAllChatSessions,
    getLatestProviderSession,
    createNewSession,
    loadSession,
    loadLatestProviderSession,
    loadMessageHistory,
    saveMessageHistory,
    loadChatHistory,
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
