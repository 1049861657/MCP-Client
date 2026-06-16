import {
  CHAT_DB_INDEX_PROVIDER,
  CHAT_DB_INDEX_SESSION,
  CHAT_DB_INDEX_TIMESTAMP,
  CHAT_DB_NAME,
  CHAT_DB_VERSION,
  CHAT_MESSAGES_STORE,
} from './storage-contract.js';

/**
 * IndexedDB 读写层（T5-06-04 从 session-data 拆出）
 * @param {object} app
 * @returns {{
 *   db: { instance: IDBDatabase | null; name: string; version: number; isReady: boolean };
 *   initDatabase: (onReady?: () => void) => void;
 *   getSessionMessages: (sessionId: string, limit?: number) => Promise<object[]>;
 *   deleteSessionMessages: (sessionId: string) => Promise<void>;
 *   saveChatMessage: (message: object) => Promise<object>;
 *   loadChatHistory: (limit?: number) => Promise<object[]>;
 * }}
 */
export function createSessionIdb(app) {
  const db = {
    instance: null,
    name: CHAT_DB_NAME,
    version: CHAT_DB_VERSION,
    isReady: false,
  };

  /**
   * @param {(() => void) | undefined} onReady
   */
  function initDatabase(onReady) {
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
      onReady?.();
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
    initDatabase,
    getSessionMessages,
    deleteSessionMessages,
    saveChatMessage,
    loadChatHistory,
  };
}
