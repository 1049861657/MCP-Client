/**
 * AI聊天应用 - 数据管理模块
 * 包含数据库操作和会话管理功能
 */

// 数据管理全局对象
window.AIChatData = {
    // 数据库相关
    db: {
        instance: null, // 数据库实例
        name: 'AIChatDatabase',
        version: 1,
        isReady: false
    },
    
    // 初始化数据模块
    init(app) {
        console.log('初始化数据管理模块...');
        
        // 保存应用引用
        this.app = app;
        
        // 初始化数据库
        this.initDatabase();
    },
    
    // 初始化数据库
    initDatabase() {
        console.log('初始化IndexedDB数据库...');
        
        const request = indexedDB.open(this.db.name, this.db.version);
        
        request.onerror = (event) => {
            console.error('打开IndexedDB失败:', event.target.error);
            this.db.isReady = false;
        };
        
        request.onsuccess = (event) => {
            console.log('成功打开IndexedDB数据库');
            this.db.instance = event.target.result;
            this.db.isReady = true;
            
            // 数据库就绪后，加载消息历史
            this.loadMessageHistory();
            
            // 如果已经加载了供应商配置，尝试创建或加载会话
            if (this.app.state.isConfigLoaded && this.app.elements.provider) {
                console.log('数据库就绪，尝试加载或创建会话');
                setTimeout(() => {
                    this.loadLatestProviderSession()
                        .then(() => {
                            this.app.updateSessionDisplay();
                        })
                        .catch(error => {
                            console.error('自动加载最新会话失败:', error);
                            // 出错时创建新会话
                            this.createNewSession();
                        });
                }, 500);
            }
        };
        
        request.onupgradeneeded = (event) => {
            console.log('升级数据库...');
            const db = event.target.result;
            
            // 检查messages表是否存在
            if (!db.objectStoreNames.contains('messages')) {
                // 创建messages表，使用自增ID作为主键
                const store = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                
                // 创建索引
                store.createIndex('sessionId', 'sessionId', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('provider', 'provider', { unique: false });
                
                console.log('已创建messages表和索引');
            } else {
                // 检查是否需要添加provider索引
                const transaction = event.target.transaction;
                const store = transaction.objectStore('messages');
                
                // 检查provider索引是否存在
                if (!store.indexNames.contains('provider')) {
                    // 添加provider索引
                    store.createIndex('provider', 'provider', { unique: false });
                    console.log('已添加provider索引到messages表');
                }
            }
        };
    },
    
    // 获取指定会话的消息
    getSessionMessages(sessionId, limit = 0) {
        return new Promise((resolve, reject) => {
            if (!this.db.isReady || !this.db.instance) {
                console.error('数据库未就绪');
                reject(new Error('数据库未就绪'));
                return;
            }
            
            try {
                const transaction = this.db.instance.transaction(['messages'], 'readonly');
                const store = transaction.objectStore('messages');
                const index = store.index('sessionId');
                
                // 使用sessionId查询
                const request = index.openCursor(IDBKeyRange.only(sessionId));
                
                const messages = [];
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor) {
                        messages.push(cursor.value);
                        cursor.continue();
                    } else {
                        // 按时间戳排序
                        messages.sort((a, b) => a.timestamp - b.timestamp);
                        
                        // 如果有限制，则只返回最新的N条
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
    },
    
    // 删除指定会话的所有消息
    deleteSessionMessages(sessionId) {
        return new Promise((resolve, reject) => {
            if (!this.db.isReady || !this.db.instance) {
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
                const transaction = this.db.instance.transaction(['messages'], 'readwrite');
                const store = transaction.objectStore('messages');
                const index = store.index('sessionId');
                
                // 使用会话ID查询所有消息
                const request = index.openCursor(IDBKeyRange.only(sessionId));
                
                // 保存所有要删除的消息ID
                const messageIds = [];
                
                // 先查询所有消息ID
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
                        
                        // 删除操作计数器
                        let deletedCount = 0;
                        
                        // 定义删除完成的回调
                        const deleteComplete = () => {
                            if (++deletedCount === messageIds.length) {
                                console.log(`已删除会话 ${sessionId} 的所有消息（${messageIds.length}条）`);
                                resolve();
                            }
                        };
                        
                        // 逐个删除消息
                        messageIds.forEach(id => {
                            const deleteRequest = store.delete(id);
                            
                            deleteRequest.onsuccess = () => {
                                deleteComplete();
                            };
                            
                            deleteRequest.onerror = (error) => {
                                console.error(`删除消息 ${id} 失败:`, error);
                                deleteComplete(); // 即使失败也继续计数，确保最终能完成
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
    },
    
    // 保存聊天消息到数据库
    saveChatMessage(message) {
        if (!this.db.isReady || !this.db.instance) {
            console.error('保存消息失败: 数据库未就绪');
            return Promise.reject(new Error('数据库未就绪'));
        }
        
        if (!message || !message.content || !this.app.state.sessionId) {
            console.error('保存消息失败: 无效的消息或会话ID', { 
                hasMessage: !!message, 
                hasContent: message && !!message.content, 
                sessionId: this.app.state.sessionId 
            });
            return Promise.reject(new Error('无效的消息或会话ID'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.instance.transaction(['messages'], 'readwrite');
                const store = transaction.objectStore('messages');
                
                // 准备要存储的消息对象
                const messageToStore = {
                    ...message,
                    sessionId: this.app.state.sessionId,
                    timestamp: Date.now(),
                    provider: this.app.elements.provider.value
                };
                
                // 添加到消息存储
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
    },
    
    // 获取所有聊天会话信息
    getAllChatSessions(provider = null) {
        return new Promise((resolve, reject) => {
            if (!this.db.isReady || !this.db.instance) {
                console.error('获取会话列表失败: 数据库未就绪');
                reject(new Error('数据库未就绪'));
                return;
            }
            
            try {
                const transaction = this.db.instance.transaction(['messages'], 'readonly');
                const store = transaction.objectStore('messages');
                
                // 创建会话映射，格式为：{sessionId: {messages: [], lastTimestamp: 0, messageCount: 0, provider: ''}}
                const sessionsMap = {};
                
                let request;
                
                // 如果提供了供应商且数据库有provider索引，则使用索引直接过滤
                if (provider && store.indexNames.contains('provider')) {
                    console.log(`使用provider索引过滤供应商: ${provider} 的会话`);
                    const index = store.index('provider');
                    const range = IDBKeyRange.only(provider);
                    request = index.openCursor(range);
                } else {
                    // 否则获取所有会话，需要在代码中手动过滤
                    request = store.openCursor();
                }
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor) {
                        const message = cursor.value;
                        const sessionId = message.sessionId;
                        const messageProvider = message.provider || 'unknown';
                        
                        // 如果指定了provider，且不匹配当前消息的provider，则跳过
                        if (provider && messageProvider !== provider) {
                            cursor.continue();
                            return;
                        }
                        
                        // 如果会话不存在于映射中，创建它
                        if (!sessionsMap[sessionId]) {
                            sessionsMap[sessionId] = {
                                sessionId: sessionId,
                                messages: [],
                                lastTimestamp: 0,
                                messageCount: 0,
                                provider: messageProvider
                            };
                        }
                        
                        // 更新会话信息
                        const session = sessionsMap[sessionId];
                        session.messageCount++;
                        session.lastTimestamp = Math.max(session.lastTimestamp, message.timestamp);
                        
                        // 保存一些消息内容用于显示预览（最多保存前2条用户消息和第一条AI回复）
                        const userMessagesCount = session.messages.filter(m => m.role === 'user').length;
                        const aiMessagesCount = session.messages.filter(m => m.role === 'assistant').length;
                        
                        if ((message.role === 'user' && userMessagesCount < 2) || 
                            (message.role === 'assistant' && aiMessagesCount < 1)) {
                            session.messages.push({
                                role: message.role,
                                content: message.content
                            });
                        }
                        
                        cursor.continue();
                    } else {
                        // 转换映射为数组并按最后活跃时间排序
                        const sessions = Object.values(sessionsMap).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
                        
                        // 格式化会话信息
                        const formattedSessions = sessions.map(session => {
                            // 提取会话的首条用户消息作为会话标题
                            const firstUserMessage = session.messages.find(m => m.role === 'user');
                            const firstAIMessage = session.messages.find(m => m.role === 'assistant');
                            
                            // 格式化最后活跃时间
                            const lastActiveDate = new Date(session.lastTimestamp);
                            const dateOptions = { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit',
                                hour: '2-digit', 
                                minute: '2-digit', 
                                second: '2-digit',
                                hour12: false
                            };
                            const formattedDate = lastActiveDate.toLocaleString('zh-CN', dateOptions);
                            
                            // 提取会话ID的数字部分
                            const displayId = session.sessionId.replace('session_', '');
                            
                            return {
                                id: session.sessionId,
                                displayId: displayId,
                                title: firstUserMessage ? firstUserMessage.content.substring(0, 50) : '无标题会话',
                                preview: firstAIMessage ? firstAIMessage.content.substring(0, 100) : '无预览内容',
                                messageCount: session.messageCount,
                                lastActive: formattedDate,
                                timestamp: session.lastTimestamp,
                                provider: session.provider
                            };
                        });
                        
                        // 如果指定了供应商，记录找到的会话数量
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
    },
    
    // 获取当前供应商的最新会话ID
    getLatestProviderSession() {
        if (!this.db.isReady || !this.db.instance) {
            console.error('数据库未就绪，无法获取最新会话');
            return Promise.reject(new Error('数据库未就绪'));
        }
        
        // 获取当前选择的供应商
        const currentProvider = this.app.elements.provider ? this.app.elements.provider.value : null;
        if (!currentProvider) {
            console.error('当前未选择供应商，无法获取最新会话');
            return Promise.reject(new Error('未选择供应商'));
        }
        
        console.log(`尝试获取供应商 ${currentProvider} 的最新会话`);
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.instance.transaction(['messages'], 'readonly');
                const store = transaction.objectStore('messages');
                
                let index, request;
                
                // 判断是否有provider索引
                if (store.indexNames.contains('provider')) {
                    // 使用provider索引直接查询特定供应商的消息
                    index = store.index('provider');
                    const range = IDBKeyRange.only(currentProvider);
                    request = index.openCursor(range, 'prev'); // 倒序，最新的消息优先
                } else {
                    // 使用sessionId索引查询所有消息并在代码中过滤
                    index = store.index('timestamp');
                    request = index.openCursor(null, 'prev'); // 倒序，最新的消息优先
                }
                
                let latestSession = null;
                let latestTimestamp = 0;
                const processedSessions = new Set(); // 使用Set记录已处理过的会话ID
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor) {
                        const message = cursor.value;
                        const sessionId = message.sessionId;
                        const messageProvider = message.provider || 'unknown';
                        
                        // 如果没有使用provider索引，需要过滤非当前供应商的消息
                        if (!store.indexNames.contains('provider') && messageProvider !== currentProvider) {
                            cursor.continue();
                            return;
                        }
                        
                        // 如果这个会话ID还没有处理过，且消息时间戳比当前最新的还要新
                        if (!processedSessions.has(sessionId) && message.timestamp > latestTimestamp) {
                            latestSession = sessionId;
                            latestTimestamp = message.timestamp;
                            processedSessions.add(sessionId);
                        }
                        
                        // 最多处理前100条消息，避免在大型数据库中处理时间过长
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
    },
    
    // 创建新会话
    createNewSession() {
        // 保存当前供应商
        const currentProvider = this.app.elements.provider.value || 'default';
        
        // 生成新的会话ID（使用年月日-序号格式）
        const now = new Date();
        const dateStr = now.getFullYear() + 
                      ('0' + (now.getMonth() + 1)).slice(-2) + 
                      ('0' + now.getDate()).slice(-2);
        
        // 生成4位随机序号
        const randomId = Math.floor(1000 + Math.random() * 9000); // 1000-9999之间的数
        
        // 组装成更美观的会话ID格式：session_YYYYMMDD-XXXX
        const sessionId = `session_${dateStr}-${randomId}`;
        
        // 更新应用状态
        this.app.state.sessionId = sessionId;
        
        // 清空消息历史
        this.app.state.messageHistory = [];
        
        // 清空聊天界面
        if (this.app.elements.chatMessages) {
            this.app.elements.chatMessages.innerHTML = '';
        }
        
        // 更新会话显示
        this.app.updateSessionDisplay();
        
        // 在控制台显示新会话信息
        console.log(`已创建新会话 ${sessionId} (供应商: ${currentProvider})`);
        
        return sessionId;
    },
    
    // 加载指定会话
    loadSession(sessionId) {
        return new Promise((resolve, reject) => {
            if (!sessionId) {
                reject(new Error('无效的会话ID'));
                return;
            }
            
            console.log(`正在加载会话 ${sessionId}`);
            
            // 获取会话的消息
            this.getSessionMessages(sessionId)
                .then(messages => {
                    // 确保有消息
                    if (!messages || messages.length === 0) {
                        console.warn(`会话 ${sessionId} 没有消息`);
                        
                        // 更新会话ID
                        this.app.state.sessionId = sessionId;
                        
                        // 清空聊天界面
                        if (this.app.elements.chatMessages) {
                            this.app.elements.chatMessages.innerHTML = '';
                        }
                        
                        // 清空消息历史
                        this.app.state.messageHistory = [];
                        
                        resolve(sessionId);
                        return;
                    }
                    
                    // 获取会话的供应商
                    const provider = messages[0].provider;
                    
                    // 如果会话的供应商与当前不同，切换供应商
                    if (provider && this.app.elements.provider.value !== provider) {
                        console.log(`会话供应商 ${provider} 与当前供应商 ${this.app.elements.provider.value} 不同，切换中...`);
                        
                        // 确保供应商存在于选项中
                        let providerExists = false;
                        for (let i = 0; i < this.app.elements.provider.options.length; i++) {
                            if (this.app.elements.provider.options[i].value === provider) {
                                this.app.elements.provider.selectedIndex = i;
                                providerExists = true;
                                break;
                            }
                        }
                        
                        if (providerExists) {
                            // 更新模型选项
                            this.app.updateModelOptions();
                        } else {
                            console.warn(`供应商 ${provider} 不存在于当前选项中，使用当前供应商`);
                        }
                    }
                    
                    // 更新会话ID
                    this.app.state.sessionId = sessionId;
                    
                    // 清空聊天界面
                    if (this.app.elements.chatMessages) {
                        this.app.elements.chatMessages.innerHTML = '';
                    }
                    
                    // 更新消息历史
                    this.app.state.messageHistory = messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }));
                    
                    // 重建聊天界面
                    if (this.app.UI) {
                        let previousUserMessage = null;
                        
                        for (const message of messages) {
                            if (message.role === 'user') {
                                previousUserMessage = message;
                                this.app.UI.addUserMessage(message.content);
                            } else if (message.role === 'assistant' && previousUserMessage) {
                                const aiMessageDiv = this.app.UI.addAIMessage(message.content);
                                this.app.UI.finalizeAIMessage(aiMessageDiv);
                            }
                        }
                    }
                    
                    resolve(sessionId);
                })
                .catch(error => {
                    console.error(`加载会话 ${sessionId} 失败:`, error);
                    reject(error);
                });
        });
    },
    
    // 加载当前供应商的最新会话
    loadLatestProviderSession() {
        return this.getLatestProviderSession()
            .then(sessionId => {
                if (sessionId) {
                    console.log(`开始加载最新会话: ${sessionId}`);
                    return this.loadSession(sessionId);
                } else {
                    console.log('没有找到历史会话，创建新会话');
                    // 直接调用创建新会话方法而不是返回null
                    return this.createNewSession();
                }
            })
            .catch(error => {
                console.error('加载最新会话失败:', error);
                // 出错时创建新会话，而不是返回null
                console.log('加载最新会话失败，创建新会话');
                return this.createNewSession();
            });
    },
    
    // 加载消息历史
    loadMessageHistory() {
        // 如果数据库未就绪，等待数据库准备好再重试
        if (!this.db.isReady) {
            console.log('数据库未就绪，稍后将重试加载消息历史');
            setTimeout(() => this.loadMessageHistory(), 500);
            return;
        }
        
        this.loadChatHistory(50)
            .then(messages => {
                if (messages && messages.length > 0) {
                    // 过滤出有效的消息结构
                    this.app.state.messageHistory = messages
                        .filter(msg => msg.role && msg.content)
                        .map(msg => ({
                            role: msg.role,
                            content: msg.content
                        }));
                    
                    console.log(`已从IndexedDB加载 ${this.app.state.messageHistory.length} 条消息历史 [会话: ${this.app.state.sessionId}]`);
                } else {
                    console.log('没有找到历史消息记录');
                    this.app.state.messageHistory = [];
                }
            })
            .catch(error => {
                console.error('加载消息历史失败:', error);
                this.app.state.messageHistory = [];
            });
    },
    
    // 保存消息历史
    saveMessageHistory() {
        // 如果没有消息历史或数据库未就绪，不执行保存
        if (this.app.state.messageHistory.length === 0 || !this.db.isReady) {
            return;
        }
        
        // 获取最新的消息(通常是一对用户消息和AI回复)
        const recentMessages = this.app.state.messageHistory.slice(-2);
        
        // 保存每条消息到数据库
        recentMessages.forEach(msg => {
            if (msg.role && msg.content) {
                this.saveChatMessage(msg)
                    .catch(error => console.error('保存消息失败:', error));
            }
        });
    },
    
    // 从数据库加载会话消息
    loadChatHistory(limit = 50) {
        if (!this.db.isReady || !this.db.instance) {
            console.error('数据库未就绪，无法加载消息历史');
            return Promise.reject(new Error('数据库未就绪'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.instance.transaction(['messages'], 'readonly');
                const store = transaction.objectStore('messages');
                const index = store.index('sessionId');
                
                // 查询当前会话的消息，并按时间排序
                const range = IDBKeyRange.only(this.app.state.sessionId);
                const request = index.openCursor(range, 'prev'); // 倒序，最新的消息优先
                
                const messages = [];
                let counter = 0;
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor && counter < limit) {
                        messages.push(cursor.value);
                        counter++;
                        cursor.continue();
                    } else {
                        // 按时间正序排列
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
}; 