/**
 * AI聊天应用 - 核心模块
 * 包含主要应用对象、初始化和事件处理
 */

// 全局命名空间
window.AIChatApp = {
    // DOM元素
    elements: {},
    
    // 状态变量
    state: {
        isStreamMode: true,
        isConfigLoaded: false,
        providers: {},
        isThinking: false,
        thinkingModels: ['claude-3-5-sonnet-20240620', 'gpt-4-0314', 'gpt-4-0613', 'gpt-4-1106-preview', 'gpt-4-vision-preview', 'gpt-4-turbo'],
        showReasoning: true,
        enableMCPTools: true, // 默认启用 MCP 工具
        enableParamValidation: false, // 默认关闭参数校验
        messageHistory: [], // 存储消息历史
        mcpTools: [], // 存储可用的MCP工具
        enableMessageHistory: false, // 是否启用历史消息
        messageHistoryCount: 3, // 历史消息数量，默认为3
        sessionId: '' // 当前会话的唯一标识符，每个供应商有自己的会话列表
    },
    
    // 数据库相关
    db: {
        instance: null, // 数据库实例
        name: 'AIChatDatabase',
        version: 1,
        isReady: false
    },
    
    // 时间管理工具
    timeManager: null, // 将在初始化时设置
    
    // 初始化应用
    init() {
        console.log('AI核心模块开始初始化...');
        
        // 初始化必要的引用
        if (window.AIChatUI) {
            this.UI = window.AIChatUI;
            console.log('UI模块引用设置完成');
        } else {
            console.error('UI模块未找到，某些功能可能无法使用');
        }
        
        if (window.AIChatAPI) {
            this.API = window.AIChatAPI;
            console.log('API模块引用设置完成');
        } else {
            console.error('API模块未找到，某些功能可能无法使用');
        }
        
        if (window.AIChatTimeManager) {
            this.timeManager = window.AIChatTimeManager;
            console.log('时间管理器初始化完成');
        } else {
            console.error('时间管理器未找到，某些功能可能无法使用');
        }
        
        // 设置一个临时会话ID - 实际会话会在加载供应商配置后自动创建或加载
        this.state.sessionId = 'session_temp_' + Date.now().toString(36);
        console.log('设置临时会话ID:', this.state.sessionId);
        
        // 初始化数据库
        this.initDatabase();
        
        // 初始化DOM元素引用
        this.elements = {
            message: document.getElementById('message'),
            sendButton: document.getElementById('send-button'),
            chatMessages: document.getElementById('chat-messages'),
            provider: document.getElementById('provider'),
            model: document.getElementById('model'),
            temperature: document.getElementById('temperature'),
            maxTokens: document.getElementById('max-tokens'),
            modeStream: document.getElementById('mode-stream'),
            modeRegular: document.getElementById('mode-regular'),
            clearChat: document.getElementById('clear-chat'),
            copyChat: document.getElementById('copy-chat'),
            tooltip: document.getElementById('tooltip'),
            result: document.getElementById('result'),
            responseContent: document.getElementById('response-content'),
            responseTime: document.getElementById('response-time'),
            tokenUsage: document.getElementById('token-usage'),
            enableMCPTools: document.getElementById('enable-mcp-tools'),
            enableParamValidation: document.getElementById('enable-param-validation'),
            enableMessageHistory: document.getElementById('enable-message-history'),
            messageHistoryCount: document.getElementById('message-history-count')
        };
        
        // 检查关键元素是否存在
        const missingElements = [];
        ['message', 'sendButton', 'provider', 'model'].forEach(key => {
            if (!this.elements[key]) {
                missingElements.push(key);
            }
        });
        
        if (missingElements.length > 0) {
            console.error('缺少关键UI元素:', missingElements.join(', '));
            return;
        }
        
        // 添加事件监听器
        this.addEventListeners();
        
        // 从API获取特性配置
        this.fetchFeatureConfig()
            .then(() => {
                console.log('特性配置加载完成，继续初始化');
                
                // 获取思考模式配置
                this.fetchThinkingConfig()
                    .catch(error => console.error('加载思考模式配置失败:', error));
                
                // 从API获取供应商配置
                return this.fetchProviderConfig();
            })
            .then(() => {
                console.log('供应商配置加载完成，初始化其余功能');
                
                // 加载MCP工具 - 无需条件判断，始终加载工具
                this.loadMCPTools();
                
                // 更新会话显示
                if (this.UI) {
                    this.updateSessionDisplay();
                }
            })
            .catch(error => {
                console.error('初始化失败:', error);
            });
    },
    
    // 更新会话显示
    updateSessionDisplay() {
        const sessionNameElement = document.getElementById('session-name');
        if (!sessionNameElement) {
            console.error('未找到会话名称显示元素，跳过显示更新');
            return;
        }
        
        try {
            // 检查会话ID是否有效
            if (!this.state.sessionId || this.state.sessionId === 'session_NaN' || !this.state.sessionId.startsWith('session_')) {
                console.warn('会话ID无效，重新生成:', this.state.sessionId);
                // 使用安全的随机ID
                this.state.sessionId = 'session_' + Math.random().toString(36).substring(2, 10);
            }
            
            // 移除session_前缀
            const displayId = this.state.sessionId.replace('session_', '');
            
            // 再次检查提取后的ID是否有效
            if (!displayId || displayId === 'NaN' || displayId === 'undefined') {
                console.warn('提取的显示ID无效:', displayId);
                // 使用时间戳作为备用显示ID
                const fallbackId = Date.now().toString(36);
                sessionNameElement.textContent = fallbackId;
                sessionNameElement.title = '会话ID: ' + fallbackId;
                return;
            }
            
            // 显示完整的会话ID
            sessionNameElement.textContent = displayId;
            
            // 设置完整ID为title，鼠标悬停时可查看
            sessionNameElement.title = '会话ID: ' + displayId;
        } catch (error) {
            console.error('更新会话显示时出错:', error);
            // 显示错误信息，以便调试
            sessionNameElement.textContent = '会话ID加载失败';
            sessionNameElement.title = '会话ID错误: ' + error.message;
        }
    },
    
    // 初始化IndexedDB数据库
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
            if (this.state.isConfigLoaded && this.elements.provider) {
                console.log('数据库就绪，尝试加载或创建会话');
                setTimeout(() => {
                    this.loadLatestProviderSession()
                        .then(() => {
                            this.updateSessionDisplay();
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
    
    // 添加事件监听器
    addEventListeners() {
        console.log('添加事件监听器...');
        
        // 模式切换
        if (this.elements.modeRegular && this.elements.modeStream) {
            this.elements.modeRegular.addEventListener('click', () => this.setMode('regular'));
            this.elements.modeStream.addEventListener('click', () => this.setMode('stream'));
        }
        
        // MCP工具开关
        if (this.elements.enableMCPTools) {
            this.elements.enableMCPTools.addEventListener('change', () => {
                this.state.enableMCPTools = this.elements.enableMCPTools.checked;
                
                // 如果启用了工具，尝试加载工具列表
                if (this.state.enableMCPTools) {
                    this.loadMCPTools();
                    
                    // 显示提示
                    this.UI.showTooltip('已启用MCP工具调用功能');
                } else {
                    this.UI.showTooltip('已禁用MCP工具调用功能');
                }
                
                console.log('MCP工具模式:', this.state.enableMCPTools ? '启用' : '禁用');
            });
        }
        
        // 参数校验开关
        if (this.elements.enableParamValidation) {
            this.elements.enableParamValidation.addEventListener('change', () => {
                this.state.enableParamValidation = this.elements.enableParamValidation.checked;
                
                // 显示提示
                if (this.state.enableParamValidation) {
                    this.UI.showTooltip('已启用参数校验功能');
                } else {
                    this.UI.showTooltip('已禁用参数校验功能');
                }
                
                console.log('参数校验模式:', this.state.enableParamValidation ? '启用' : '禁用');
            });
        }
        
        // 消息历史开关
        if (this.elements.enableMessageHistory) {
            this.elements.enableMessageHistory.addEventListener('change', () => {
                this.state.enableMessageHistory = this.elements.enableMessageHistory.checked;
                
                // 启用或禁用消息数量输入框
                if (this.elements.messageHistoryCount) {
                    this.elements.messageHistoryCount.disabled = !this.state.enableMessageHistory;
                }
                
                console.log('消息历史模式:', this.state.enableMessageHistory ? '启用' : '禁用');
            });
        }
        
        // 消息历史数量
        if (this.elements.messageHistoryCount) {
            this.elements.messageHistoryCount.addEventListener('change', () => {
                this.state.messageHistoryCount = parseInt(this.elements.messageHistoryCount.value, 10) || 3;
                console.log('消息历史数量:', this.state.messageHistoryCount);
            });
        }
        
        // 聊天功能
        if (this.elements.sendButton) {
            this.elements.sendButton.addEventListener('click', () => this.handleSend());
        }
        
        if (this.elements.clearChat) {
            this.elements.clearChat.addEventListener('click', () => this.clearChat());
        }
        
        if (this.elements.copyChat) {
            this.elements.copyChat.addEventListener('click', () => this.copyChat());
        }
        
        // 历史记录按钮
        const viewHistoryButton = document.getElementById('view-history');
        if (viewHistoryButton) {
            viewHistoryButton.addEventListener('click', () => {
                // 调用UI模块显示历史记录模态窗口
                this.UI.showHistoryModal();
            });
        }
        
        // 新建会话按钮
        const newSessionButton = document.getElementById('new-session');
        if (newSessionButton) {
            newSessionButton.addEventListener('click', () => {
                // 确认是否创建新会话
                if (confirm('确定要创建新会话吗？当前对话将被清除。')) {
                    this.createNewSession();
                }
            });
        }
        
        // 供应商变化
        if (this.elements.provider) {
            this.elements.provider.addEventListener('change', () => {
                // 清空当前聊天界面
                if (this.elements.chatMessages) {
                    this.elements.chatMessages.innerHTML = '';
                }
                
                // 清空消息历史数组
                this.state.messageHistory = [];
                
                // 更新模型选项
                this.updateModelOptions();
                
                const newProvider = this.elements.provider.value;
                const providerText = this.elements.provider.options[this.elements.provider.selectedIndex].text || '未知供应商';
                console.log(`已切换到供应商: ${newProvider} (${providerText})`);
                
                // 加载当前供应商的最新会话或创建新会话
                if (this.db.isReady) {
                    console.log('供应商已切换，尝试加载该供应商的最新会话');
                    this.loadLatestProviderSession()
                        .then(() => {
                            // 加载或创建会话后更新会话显示
                            this.updateSessionDisplay();
                        })
                        .catch(error => {
                            console.error('自动加载最新会话失败:', error);
                            // 确保在任何出错情况下都创建新会话
                            this.createNewSession();
                        });
                } else {
                    // 如果数据库未就绪，创建新会话
                    console.log('数据库未就绪，创建新会话');
                    this.createNewSession();
                }
                
                // 显示提示消息
                if (this.UI) {
                    this.UI.showTooltip(`已切换到 ${providerText}`);
                }
            });
        }
        
        // 按键监听
        if (this.elements.message) {
            this.elements.message.addEventListener('keydown', (e) => {
                // 如果按下的是回车键
                if (e.key === 'Enter') {
                    // 如果同时按下Shift键，允许换行
                    if (e.shiftKey) {
                        return; // 默认行为是添加换行
                    }
                    else if (!this.elements.sendButton.disabled) {
                        e.preventDefault(); // 阻止默认的换行行为
                        this.elements.sendButton.click(); // 触发发送按钮点击
                    }
                }
            });
        }
    },
    
    // 加载配置
    loadConfig() {
        this.fetchProviderConfig();
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
                    this.state.messageHistory = messages
                        .filter(msg => msg.role && msg.content)
                        .map(msg => ({
                            role: msg.role,
                            content: msg.content
                        }));
                    
                    console.log(`已从IndexedDB加载 ${this.state.messageHistory.length} 条消息历史 [会话: ${this.state.sessionId}]`);
                } else {
                    console.log('没有找到历史消息记录');
                    this.state.messageHistory = [];
                }
            })
            .catch(error => {
                console.error('加载消息历史失败:', error);
                this.state.messageHistory = [];
            });
    },
    
    // 保存消息历史
    saveMessageHistory() {
        // 如果没有消息历史或数据库未就绪，不执行保存
        if (this.state.messageHistory.length === 0 || !this.db.isReady) {
            return;
        }
        
        // 获取最新的消息(通常是一对用户消息和AI回复)
        const recentMessages = this.state.messageHistory.slice(-2);
        
        // 保存每条消息到数据库
        recentMessages.forEach(msg => {
            if (msg.role && msg.content) {
                this.saveChatMessage(msg)
                    .catch(error => console.error('保存消息失败:', error));
            }
        });
    },
    
    // 加载MCP工具
    async loadMCPTools() {
        if (!this.API) {
            console.error('API模块未初始化，无法加载MCP工具');
            return;
        }
        
        try {
            console.log('正在获取可用的MCP工具...');
            const tools = await this.API.getAvailableMCPTools();
            
            this.state.mcpTools = tools;
            console.log(`已加载 ${tools.length} 个MCP工具:`, tools.map(t => t.name).join(', '));
            
            if (tools.length > 0) {
                if (this.UI) this.UI.showTooltip(`已加载 ${tools.length} 个MCP工具`);
            } else {
                if (this.UI) this.UI.showTooltip('未找到可用的MCP工具，请确认MCP服务器已连接');
            }
        } catch (error) {
            console.error('加载MCP工具失败:', error);
            if (this.UI) this.UI.showTooltip('获取MCP工具失败，请确认服务器连接正常');
        }
    },
    
    // 设置Markdown配置
    setupMarkdown() {
        marked.setOptions({
            highlight: (code, lang) => {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            },
            langPrefix: 'hljs language-',
            gfm: true,
            breaks: true
        });
        
        console.log('Markdown配置已设置');
    },
    
    // 从API获取特性配置
    async fetchFeatureConfig() {
        try {
            console.log('开始获取特性配置');
            const response = await fetch('/api/config/features');
            
            if (!response.ok) {
                console.error('API响应错误:', response.status, response.statusText);
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('获取到特性配置:', data);
            
            if (data.success && data.config) {
                // 更新工具相关配置
                if (data.config.tools) {
                    this.state.enableMCPTools = data.config.tools.enableMCPTools;
                    this.state.enableParamValidation = data.config.tools.enableParamValidation;
                    
                    // 更新UI
                    if (this.elements.enableMCPTools) {
                        this.elements.enableMCPTools.checked = this.state.enableMCPTools;
                    }
                    if (this.elements.enableParamValidation) {
                        this.elements.enableParamValidation.checked = this.state.enableParamValidation;
                    }
                    
                    console.log('已更新工具配置:', {
                        enableMCPTools: this.state.enableMCPTools,
                        enableParamValidation: this.state.enableParamValidation
                    });
                }
                
                // 更新历史记录相关配置
                if (data.config.history) {
                    this.state.enableMessageHistory = data.config.history.enableMessageHistory;
                    this.state.messageHistoryCount = data.config.history.defaultMessageHistoryCount;
                    
                    // 更新UI
                    if (this.elements.enableMessageHistory) {
                        this.elements.enableMessageHistory.checked = this.state.enableMessageHistory;
                    }
                    if (this.elements.messageHistoryCount) {
                        this.elements.messageHistoryCount.value = this.state.messageHistoryCount;
                    }
                    
                    console.log('已更新历史记录配置:', {
                        enableMessageHistory: this.state.enableMessageHistory,
                        messageHistoryCount: this.state.messageHistoryCount
                    });
                }
            }
        } catch (error) {
            console.error('加载特性配置失败:', error);
            // 加载失败时不改变当前配置，使用默认值
        }
    },
    
    // 从API获取供应商配置
    async fetchProviderConfig() {
        try {
            console.log('开始获取供应商配置');
            const response = await fetch('/api/config/ai-providers');
            
            if (!response.ok) {
                console.error('API响应错误:', response.status, response.statusText);
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const config = await response.json();
            console.log('获取到供应商配置:', config);
            
            // 转换为适合前端使用的格式
            this.state.providers = {};
            config.providers.forEach(provider => {
                this.state.providers[provider.name] = {
                    name: provider.name,
                    apiPath: provider.apiPath,
                    models: provider.models
                };
            });
            
            this.state.isConfigLoaded = true;
            
            // 初始化供应商选择下拉框
            this.populateProviderSelect(config.defaultProvider);
            
            // 选择默认供应商
            if (this.elements.provider && this.elements.provider.options.length > 0) {
                this.elements.provider.value = config.defaultProvider;
                this.updateModelOptions();
            }
            
            // 尝试加载当前供应商的最新会话
            if (this.db.isReady && this.elements.provider) {
                console.log('尝试加载当前供应商的最新会话');
                
                // 延迟一点以确保数据库就绪
                setTimeout(() => {
                    this.loadLatestProviderSession()
                        .then(() => {
                            // 加载或创建会话后更新会话显示
                            this.updateSessionDisplay();
                        })
                        .catch(error => console.error('自动加载最新会话失败:', error));
                }, 500);
            } else {
                // 如果数据库未就绪，创建新会话
                console.log('数据库未就绪，创建新会话');
                this.createNewSession();
            }
            
            // 启用界面
            if (this.elements.sendButton) {
                this.elements.sendButton.disabled = false;
            }
            
        } catch (error) {
            console.error('加载供应商配置失败:', error);
            if (this.UI) {
                this.UI.showTooltip('无法加载供应商配置，请刷新页面重试');
            }
            this.state.isConfigLoaded = false;
        }
    },
    
    // 获取思考模式配置
    async fetchThinkingConfig() {
        try {
            console.log('获取思考模式配置');
            // 思考模式配置通常是API返回的思考模式配置，此处简化为本地定义
            // 未来可以改为从服务器获取
            const thinkingConfig = {
                enabled: true,
                models: ['claude-3-5-sonnet-20240620', 'gpt-4-0314', 'gpt-4-0613', 'gpt-4-1106-preview', 'gpt-4-vision-preview', 'gpt-4-turbo']
            };
            
            // 更新思考模式状态
            this.state.thinkingModels = thinkingConfig.models || [];
            this.state.showReasoning = thinkingConfig.enabled !== false;
            
            console.log('思考模式配置加载完成', {
                enabled: this.state.showReasoning,
                models: this.state.thinkingModels.length
            });
            
            return thinkingConfig;
        } catch (error) {
            console.error('获取思考模式配置失败:', error);
            // 出错时使用默认配置
            this.state.thinkingModels = ['claude-3-5-sonnet-20240620', 'gpt-4-0314', 'gpt-4-0613', 'gpt-4-1106-preview', 'gpt-4-vision-preview', 'gpt-4-turbo'];
            this.state.showReasoning = true;
            return {
                enabled: true,
                models: this.state.thinkingModels
            };
        }
    },
    
    // 填充供应商选择下拉框
    populateProviderSelect(defaultProviderName) {
        if (!this.elements.provider) {
            console.error('供应商下拉框元素不存在');
            return;
        }
        
        // 清空现有选项
        this.elements.provider.innerHTML = '';
        
        // 添加供应商选项
        Object.keys(this.state.providers).forEach(providerName => {
            const option = document.createElement('option');
            option.value = providerName;
            option.textContent = this.state.providers[providerName].name;
            this.elements.provider.appendChild(option);
        });
        
        // 设置默认选中的供应商
        if (defaultProviderName && this.state.providers[defaultProviderName]) {
            this.elements.provider.value = defaultProviderName;
        }
    },
    
    // 更新模型选项
    updateModelOptions() {
        if (!this.state.isConfigLoaded) return;
        
        // 确保DOM元素存在
        if (!this.elements.provider || !this.elements.model) {
            console.error('更新模型选项失败: provider或model元素不存在');
            return;
        }
        
        const provider = this.elements.provider.value;
        if (!this.state.providers[provider]) {
            console.error('更新模型选项失败: 未找到供应商配置', provider);
            return;
        }
        
        const models = this.state.providers[provider].models;
        
        // 清空现有选项
        this.elements.model.innerHTML = '';
        
        // 添加新选项
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            this.elements.model.appendChild(option);
        });
    },
    
    // 设置聊天模式（流式/常规）
    setMode(mode) {
        this.state.isStreamMode = mode === 'stream';
        if (this.UI) {
            this.UI.updateUIForMode();
            this.UI.showTooltip(`已切换到${this.state.isStreamMode ? '流式' : '标准'}响应模式`);
        } else {
            console.warn('UI模块未初始化，无法更新模式显示');
        }
    },
    
    // 清除对话
    clearChat() {
        if (!this.elements.chatMessages) {
            console.error('聊天消息容器未找到');
            return;
        }
        
        if (this.elements.chatMessages.childElementCount === 0) {
            if (this.UI) {
                this.UI.showTooltip('没有对话可清除');
            }
            return;
        }
        
        if (confirm('确定要清除所有对话吗？')) {
            this.elements.chatMessages.innerHTML = '';
            if (this.UI) {
                this.UI.showTooltip('对话已清除');
            }
        }
    },
    
    // 复制对话
    copyChat() {
        if (!this.elements.chatMessages) {
            console.error('聊天消息容器未找到');
            return;
        }
        
        if (this.elements.chatMessages.childElementCount === 0) {
            if (this.UI) {
                this.UI.showTooltip('没有对话可复制');
            }
            return;
        }
        
        let conversationText = '';
        const messages = this.elements.chatMessages.querySelectorAll('.chat-message');
        const provider = this.state.providers[this.elements.provider.value]?.name || 'AI';
        const includeReasoning = confirm('是否包含AI的思考过程？');
        
        messages.forEach(msg => {
            const isUser = msg.classList.contains('user');
            const bubble = msg.querySelector('.chat-bubble');
            
            // 获取消息内容
            let text;
            if (isUser) {
                text = bubble.childNodes[0].textContent.trim();
            } else {
                // 获取主要回复内容
                const markdownDiv = bubble.querySelector('.markdown-content');
                if (markdownDiv) {
                    text = markdownDiv.textContent.trim();
                } else {
                    text = bubble.textContent.trim().replace(/AI正在思考中.../, '');
                }
                
                // 如果需要，添加思考内容
                if (includeReasoning) {
                    const reasoningDiv = bubble.querySelector('.reasoning-content');
                    if (reasoningDiv) {
                        const reasoningText = reasoningDiv.textContent.trim();
                        if (reasoningText) {
                            text = `【思考过程】\n${reasoningText}\n\n【最终回复】\n${text}`;
                        }
                    }
                }
            }
            
            if (text) {
                conversationText += `${isUser ? '用户' : provider}: ${text}\n\n`;
            }
        });
        
        // 复制到剪贴板
        navigator.clipboard.writeText(conversationText)
            .then(() => {
                if (this.UI) {
                    this.UI.showTooltip('对话已复制到剪贴板');
                }
            })
            .catch(err => {
                console.error('复制失败:', err);
                if (this.UI) {
                    this.UI.showTooltip('复制失败，请手动选择并复制');
                } else {
                    alert('复制失败，请手动选择并复制');
                }
            });
    },
    
    // 处理发送消息
    async handleSend() {
        if (!this.API) {
            console.error('API模块未初始化，无法发送消息');
            alert('发送功能暂时不可用，请刷新页面重试');
            return;
        }
        
        const message = this.elements.message.value.trim();
        
        if (!message) {
            if (this.UI) this.UI.showTooltip('请输入消息');
            return;
        }
        
        if (!this.state.isConfigLoaded) {
            if (this.UI) this.UI.showTooltip('配置尚未加载完成，请稍后再试');
            return;
        }
        
        // 禁用发送按钮防止重复提交
        this.elements.sendButton.disabled = true;
        
        try {
            const model = this.elements.model.value;
            const temperature = parseFloat(this.elements.temperature.value);
            const maxTokens = parseInt(this.elements.maxTokens.value);
            
            // 根据流式/标准模式选择发送方法
            // 工具调用状态作为参数传递，而不是作为单独的分支
            if (this.state.isStreamMode) {
                await this.API.sendStreamRequest(message, model, temperature, maxTokens, this.state.enableMCPTools);
            } else {
                await this.API.sendRegularRequest(message, model, temperature, maxTokens, this.state.enableMCPTools);
            }
            
            // 清空输入框
            this.elements.message.value = '';
            
        } finally {
            // 恢复发送按钮
            this.elements.sendButton.disabled = false;
            this.elements.message.focus();
        }
    },
    
    // 保存聊天消息到数据库
    saveChatMessage(message) {
        if (!this.db.isReady || !this.db.instance) {
            console.error('数据库未就绪，无法保存消息');
            return Promise.reject(new Error('数据库未就绪'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.instance.transaction(['messages'], 'readwrite');
                const store = transaction.objectStore('messages');
                
                // 创建消息对象，添加会话ID和时间戳
                const messageObj = {
                    ...message,
                    sessionId: this.state.sessionId,
                    timestamp: Date.now(),
                    provider: this.elements.provider ? this.elements.provider.value : 'unknown'
                };
                
                // 添加消息到数据库
                const request = store.add(messageObj);
                
                request.onsuccess = () => {
                    console.log('成功保存消息到数据库');
                    resolve(request.result);
                };
                
                request.onerror = () => {
                    console.error('保存消息失败:', request.error);
                    reject(request.error);
                };
                
            } catch (error) {
                console.error('保存消息过程中出错:', error);
                reject(error);
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
                const range = IDBKeyRange.only(this.state.sessionId);
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
    },
    
    // 获取所有聊天会话
    getAllChatSessions() {
        if (!this.db.isReady || !this.db.instance) {
            console.error('数据库未就绪，无法获取会话列表');
            return Promise.reject(new Error('数据库未就绪'));
        }
        
        // 获取当前选择的供应商
        const currentProvider = this.elements.provider ? this.elements.provider.value : null;
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.instance.transaction(['messages'], 'readonly');
                const store = transaction.objectStore('messages');
                
                let index, request;
                
                // 判断是否有provider索引
                if (store.indexNames.contains('provider') && currentProvider) {
                    // 使用provider索引直接查询特定供应商的消息
                    index = store.index('provider');
                    const range = IDBKeyRange.only(currentProvider);
                    request = index.openCursor(range, 'prev');
                } else {
                    // 使用sessionId索引查询所有消息并在代码中过滤
                    index = store.index('sessionId');
                    request = index.openCursor(null, 'prev');
                }
                
                const sessions = new Map(); // 使用Map存储不重复的会话
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor) {
                        const message = cursor.value;
                        const sessionId = message.sessionId;
                        const messageProvider = message.provider || 'unknown';
                        
                        // 验证会话ID是否有效
                        if (!sessionId || sessionId === 'session_NaN' || !sessionId.startsWith('session_')) {
                            console.warn('发现无效会话ID，跳过:', sessionId);
                            cursor.continue();
                            return;
                        }
                        
                        // 如果没有使用provider索引但指定了供应商过滤
                        if (!store.indexNames.contains('provider') && currentProvider && messageProvider !== currentProvider) {
                            cursor.continue();
                            return;
                        }
                        
                        // 如果这个会话ID还没有处理过
                        if (!sessions.has(sessionId)) {
                            // 验证时间戳是否有效
                            let timestamp = message.timestamp;
                            if (!timestamp || isNaN(timestamp)) {
                                console.warn('会话时间戳无效，使用当前时间:', timestamp);
                                timestamp = Date.now();
                            }
                            
                            sessions.set(sessionId, {
                                id: sessionId,
                                timestamp: timestamp,
                                lastActive: new Date(timestamp),
                                formattedDate: new Date(timestamp).toLocaleString(),
                                messageCount: 0,
                                messages: [],
                                provider: messageProvider
                            });
                        }
                        
                        // 更新会话消息计数
                        const session = sessions.get(sessionId);
                        session.messageCount++;
                        
                        // 如果是最新的消息，更新会话的时间戳
                        if (message.timestamp && !isNaN(message.timestamp) && message.timestamp > session.timestamp) {
                            session.timestamp = message.timestamp;
                            session.lastActive = new Date(message.timestamp);
                            session.formattedDate = new Date(message.timestamp).toLocaleString();
                        }
                        
                        cursor.continue();
                    } else {
                        // 将Map转换为数组，并按最后活动时间排序
                        const sessionsArray = Array.from(sessions.values())
                            .sort((a, b) => b.timestamp - a.timestamp);
                        
                        // 过滤掉任何可能的无效会话对象
                        const validSessions = sessionsArray.filter(session => {
                            return session && session.id && session.id !== 'session_NaN' && session.id.startsWith('session_');
                        });
                        
                        console.log(`获取到 ${validSessions.length} 个有效聊天会话（供应商: ${currentProvider || '全部'}）`);
                        if (validSessions.length < sessionsArray.length) {
                            console.warn(`已过滤 ${sessionsArray.length - validSessions.length} 个无效会话`);
                        }
                        
                        resolve(validSessions);
                    }
                };
                
                request.onerror = () => {
                    console.error('获取会话列表失败:', request.error);
                    reject(request.error);
                };
                
            } catch (error) {
                console.error('获取会话列表过程中出错:', error);
                reject(error);
            }
        });
    },
    
    // 获取指定会话的消息
    getSessionMessages(sessionId, limit = 0) {
        if (!this.db.isReady || !this.db.instance) {
            console.error('数据库未就绪，无法获取会话消息');
            return Promise.reject(new Error('数据库未就绪'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.instance.transaction(['messages'], 'readonly');
                const store = transaction.objectStore('messages');
                const index = store.index('sessionId');
                
                // 查询指定会话的消息
                const range = IDBKeyRange.only(sessionId);
                const request = index.openCursor(range);
                
                const messages = [];
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor) {
                        messages.push(cursor.value);
                        cursor.continue();
                    } else {
                        // 按时间正序排列
                        messages.sort((a, b) => a.timestamp - b.timestamp);
                        
                        // 如果设置了限制，只返回指定数量的消息
                        const result = limit > 0 ? messages.slice(0, limit) : messages;
                        
                        console.log(`获取到会话 ${sessionId} 的 ${result.length} 条消息`);
                        resolve(result);
                    }
                };
                
                request.onerror = () => {
                    console.error('获取会话消息失败:', request.error);
                    reject(request.error);
                };
                
            } catch (error) {
                console.error('获取会话消息过程中出错:', error);
                reject(error);
            }
        });
    },
    
    // 删除指定会话的所有消息
    deleteSessionMessages(sessionId) {
        if (!this.db.isReady || !this.db.instance) {
            console.error('数据库未就绪，无法删除会话消息');
            return Promise.reject(new Error('数据库未就绪'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                // 先获取要删除的消息对象ID
                const getMessagesTransaction = this.db.instance.transaction(['messages'], 'readonly');
                const getMessagesStore = getMessagesTransaction.objectStore('messages');
                const index = getMessagesStore.index('sessionId');
                
                const range = IDBKeyRange.only(sessionId);
                const request = index.openCursor(range);
                
                const messageIds = [];
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor) {
                        messageIds.push(cursor.value.id);
                        cursor.continue();
                    } else {
                        if (messageIds.length === 0) {
                            console.log(`会话 ${sessionId} 没有消息可删除`);
                            resolve(0);
                            return;
                        }
                        
                        // 现在删除这些消息
                        const deleteTransaction = this.db.instance.transaction(['messages'], 'readwrite');
                        const deleteStore = deleteTransaction.objectStore('messages');
                        
                        let deleteCount = 0;
                        let errorCount = 0;
                        
                        const deleteComplete = () => {
                            console.log(`已删除会话 ${sessionId} 的 ${deleteCount} 条消息，失败: ${errorCount}`);
                            resolve(deleteCount);
                        };
                        
                        messageIds.forEach(id => {
                            const deleteRequest = deleteStore.delete(id);
                            
                            deleteRequest.onsuccess = () => {
                                deleteCount++;
                                if (deleteCount + errorCount === messageIds.length) {
                                    deleteComplete();
                                }
                            };
                            
                            deleteRequest.onerror = () => {
                                console.error(`删除消息ID ${id} 失败:`, deleteRequest.error);
                                errorCount++;
                                if (deleteCount + errorCount === messageIds.length) {
                                    deleteComplete();
                                }
                            };
                        });
                    }
                };
                
                request.onerror = () => {
                    console.error('获取要删除的消息失败:', request.error);
                    reject(request.error);
                };
                
            } catch (error) {
                console.error('删除会话消息过程中出错:', error);
                reject(error);
            }
        });
    },
    
    // 加载指定会话
    loadSession(sessionId) {
        return this.getSessionMessages(sessionId)
            .then(messages => {
                // 记住当前会话ID
                const originalSessionId = this.state.sessionId;
                const currentProvider = this.elements.provider ? this.elements.provider.value : null;
                
                // 清空聊天界面
                if (this.elements.chatMessages) {
                    this.elements.chatMessages.innerHTML = '';
                }
                
                // 过滤有效的消息并加载到界面
                const validMessages = messages.filter(msg => msg.role && msg.content);
                
                if (validMessages.length === 0) {
                    if (this.UI) {
                        this.UI.showTooltip('此会话没有有效消息');
                    }
                    console.log('会话没有有效消息，创建新会话');
                    return this.createNewSession();
                }
                
                // 检查会话的供应商信息
                const sessionProvider = validMessages[0].provider;
                
                // 确保会话的供应商与当前选择的供应商匹配
                if (sessionProvider && currentProvider && sessionProvider !== currentProvider) {
                    console.log(`会话供应商(${sessionProvider})与当前供应商(${currentProvider})不匹配，创建新会话`);
                    return this.createNewSession();
                }
                
                // 初始化会话历史数组
                this.state.messageHistory = [];
                
                // 使用会话ID
                this.state.sessionId = sessionId;
                
                // 更新会话显示
                this.updateSessionDisplay();
                
                // 加载每条消息到UI
                validMessages.forEach((msg, index) => {
                    if (msg.role === 'user') {
                        // 添加用户消息到UI
                        if (this.UI) {
                            this.UI.addUserMessage(msg.content);
                        }
                    } else if (msg.role === 'assistant') {
                        // 添加AI消息到UI
                        if (this.UI) {
                            const aiMessage = this.UI.addAIMessage(msg.content);
                            // 完成消息渲染
                            this.UI.finalizeAIMessageWithoutTimeUpdate(aiMessage);
                        }
                    }
                    
                    // 添加到历史数组，但不保存到数据库(因为是从数据库加载的)
                    this.state.messageHistory.push({
                        role: msg.role,
                        content: msg.content
                    });
                });
                
                // 显示成功提示
                if (this.UI) {
                    this.UI.showTooltip(`已成功加载会话的 ${validMessages.length} 条消息`);
                }
                console.log(`已加载会话 ${sessionId} 的消息到界面，当前会话ID: ${sessionId}`);
                
                return validMessages.length;
            })
            .catch(error => {
                console.error(`加载会话 ${sessionId} 失败:`, error);
                if (this.UI) {
                    this.UI.showTooltip('加载会话失败，创建新会话');
                }
                return this.createNewSession();
            });
    },
    
    // 创建新的聊天会话
    createNewSession() {
        console.log('创建新的会话');
        
        // 清空聊天界面
        if (this.elements.chatMessages) {
            this.elements.chatMessages.innerHTML = '';
        }
        
        // 清空消息历史数组
        this.state.messageHistory = [];
        
        // 检查是否选择了供应商
        if (!this.elements.provider || !this.elements.provider.value) {
            console.warn('未选择供应商，无法创建新会话');
            if (this.UI) {
                this.UI.showTooltip('未选择供应商，无法创建新会话');
            }
            return;
        }
        
        try {
            // 使用时间戳和随机数生成新的会话ID
            const timestamp = Date.now();
            const randomFactor = Math.floor(Math.random() * 10000);
            const sessionIdBase = Math.abs((timestamp + randomFactor)).toString(16);
            
            // 设置新的会话ID
            this.state.sessionId = 'session_' + sessionIdBase;
            
            // 更新UI显示
            this.updateSessionDisplay();
            
            const currentProvider = this.elements.provider.value;
            const providerText = this.elements.provider.options[this.elements.provider.selectedIndex].text || '未知供应商';
            
            console.log(`已创建新会话: ${this.state.sessionId}，供应商: ${currentProvider}`);
            
            // 显示成功消息
            if (this.UI) {
                this.UI.showTooltip(`已创建 ${providerText} 的新会话`);
            }
            
            return this.state.sessionId;
        } catch (error) {
            console.error('创建新会话失败:', error);
            if (this.UI) {
                this.UI.showTooltip('创建新会话失败，请重试');
            }
            return null;
        }
    },
    
    // 获取当前供应商的最新会话
    getLatestProviderSession() {
        if (!this.db.isReady || !this.db.instance) {
            console.error('数据库未就绪，无法获取最新会话');
            return Promise.reject(new Error('数据库未就绪'));
        }
        
        // 获取当前选择的供应商
        const currentProvider = this.elements.provider ? this.elements.provider.value : null;
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
    }
}; 