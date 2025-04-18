/**
 * AI聊天应用 - 核心模块
 * 包含主要应用对象、初始化和核心逻辑
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
        sessionId: '', // 当前会话的唯一标识符，每个供应商有自己的会话列表
        isEventsInitialized: false,
        isLoading: false, // 是否正在加载会话，防止快捷消息气泡冲突
        enabledServerIds: [], // 存储启用的MCP服务器ID列表
        mcpServers: [] // 存储MCP服务器列表
    },
    
    // 数据库引用
    db: { isReady: false },
    
    // 时间管理工具
    timeManager: null, // 将在初始化时设置
    
    // 初始化应用
    init() {
        console.log('AI核心模块开始初始化...');
        
        // 初始化必要的引用
        if (!window.AIChatUI) {
            throw new Error('UI模块未找到，无法继续初始化');
        }
        this.UI = window.AIChatUI;
        console.log('UI模块引用设置完成');
        
        if (!window.AIChatAPI) {
            throw new Error('API模块未找到，无法继续初始化');
        }
        this.API = window.AIChatAPI;
        console.log('API模块引用设置完成');
        
        if (!window.AIChatTimeManager) {
            throw new Error('时间管理器未找到，无法继续初始化');
        }
        this.timeManager = window.AIChatTimeManager;
        console.log('时间管理器初始化完成');
        
        // 设置一个临时会话ID - 实际会话会在加载供应商配置后自动创建或加载
        this.state.sessionId = 'session_temp_' + Date.now().toString(36);
        console.log('设置临时会话ID:', this.state.sessionId);
        
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
            tooltip: document.getElementById('tooltip'),
            result: document.getElementById('result'),
            responseContent: document.getElementById('response-content'),
            responseTime: document.getElementById('response-time'),
            tokenUsage: document.getElementById('token-usage'),
            enableMCPTools: document.getElementById('enable-mcp-tools'),
            enableParamValidation: document.getElementById('enable-param-validation'),
            enableMessageHistory: document.getElementById('enable-message-history'),
            messageHistoryCount: document.getElementById('message-history-count'),
            openSettings: document.getElementById('open-settings'),
            viewHistory: document.getElementById('view-history'),
            newSession: document.getElementById('new-session'),
            quickMessages: document.getElementById('quick-messages'),
            mcpQuickAccess: document.getElementById('mcp-quick-access')
        };
        
        // 检查关键元素是否存在
        const missingElements = [];
        ['message', 'sendButton', 'provider', 'model'].forEach(key => {
            if (!this.elements[key]) {
                missingElements.push(key);
            }
        });
        
        if (missingElements.length > 0) {
            throw new Error('缺少关键UI元素: ' + missingElements.join(', '));
        }
        
        // 初始化数据模块
        if (!window.AIChatData) {
            throw new Error('数据管理模块未找到，无法继续初始化');
        }
        window.AIChatData.init(this);
        // 建立数据库引用
        this.db = window.AIChatData.db;
        console.log('数据管理模块初始化完成');
        
        // 初始化工具模块
        if (!window.AIChatUtils) {
            throw new Error('工具模块未找到，无法继续初始化');
        }
        window.AIChatUtils.init(this);
        console.log('工具模块初始化完成');
        
        // 设置事件监听器
        this.setupEventListeners();
        console.log('事件监听器初始化完成');
        
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
                
                // 更新会话显示
                this.updateSessionDisplay();
                
                // 加载保存的设置
                this.UI.loadSettings();
                
                // 加载MCP服务器列表并更新计数器
                this.loadMCPServers();
                
                // 触发自定义事件，通知其他组件应用已初始化
                const event = new CustomEvent('AIChatAppInitialized');
                document.dispatchEvent(event);
                console.log('已触发AIChatAppInitialized事件');
            })
            .catch(error => {
                console.error('初始化失败:', error);
                throw error; // 重新抛出错误，让调用者处理
            });
    },
    
    // 设置事件监听器
    setupEventListeners() {
        // 检查是否已经设置过事件监听器，防止重复绑定
        if (this.state.isEventsInitialized) {
            console.log('事件监听器已初始化，跳过重复绑定');
            return;
        }

        console.log('设置事件监听器...');
        
        // 模式切换 - 现在使用单选按钮
        const { modeStream, modeRegular } = this.elements;
        if (modeStream && modeRegular) {
            modeStream.addEventListener('change', () => {
                if (modeStream.checked) {
                    this.setMode('stream');
                }
            });
            modeRegular.addEventListener('change', () => {
                if (modeRegular.checked) {
                    this.setMode('regular');
                }
            });
        }
        
        // 清除和复制按钮
        const { clearChat } = this.elements;
        if (clearChat) {
            clearChat.addEventListener('click', () => this.clearChat());
        }
        
        // 发送按钮和回车发送
        const { sendButton, message } = this.elements;
        if (sendButton) {
            sendButton.addEventListener('click', () => this.handleSend());
        }
        if (message) {
            message.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSend();
                }
            });
        }
        
        // 切换供应商时更新模型列表
        const { provider } = this.elements;
        if (provider) {
            provider.addEventListener('change', () => this.updateModelOptions());
        }
        
        // 历史记录按钮
        const { viewHistory } = this.elements;
        if (viewHistory) {
            viewHistory.addEventListener('click', () => this.UI.showHistoryModal());
        }
        
        // 新建会话按钮
        const { newSession } = this.elements;
        if (newSession) {
            newSession.addEventListener('click', () => this.createNewSession());
        }
        
        // 打开设置面板
        const { openSettings } = this.elements;
        if (openSettings) {
            openSettings.addEventListener('click', () => this.UI.showSettingsModal());
        }
        
        // MCP快速访问按钮
        const { mcpQuickAccess } = this.elements;
        if (mcpQuickAccess) {
            mcpQuickAccess.addEventListener('click', () => this.UI.showMCPServersModal());
        }
        
        // 打开快捷消息面板
        const { quickMessages } = this.elements;
        if (quickMessages) {
            quickMessages.addEventListener('click', () => {
                try {
                    this.UI.showQuickMessagesModal();
                } catch (error) {
                    console.error('显示快捷消息失败:', error);
                }
            });
            
            // 添加视觉反馈
            quickMessages.style.cursor = 'pointer';
            quickMessages.addEventListener('mouseover', () => quickMessages.style.opacity = '0.8');
            quickMessages.addEventListener('mouseout', () => quickMessages.style.opacity = '1');
        } else {
            console.error('快捷消息按钮元素不存在');
        }
        
        // 消息历史和参数校验
        const { enableMCPTools, enableParamValidation, enableMessageHistory } = this.elements;
        if (enableMCPTools) {
            enableMCPTools.addEventListener('change', (e) => {
                this.state.enableMCPTools = e.target.checked;
            });
        }
        if (enableParamValidation) {
            enableParamValidation.addEventListener('change', (e) => {
                this.state.enableParamValidation = e.target.checked;
            });
        }
        if (enableMessageHistory) {
            enableMessageHistory.addEventListener('change', (e) => {
                this.state.enableMessageHistory = e.target.checked;
            });
        }
        // 标记事件监听器已初始化
        this.state.isEventsInitialized = true;
        
        console.log('事件监听器设置完成');
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
    
    // 从API获取特性配置
    async fetchFeatureConfig() {
        try {
            console.log('正在加载特性配置...');
            
            const response = await fetch('/api/config/features');
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`获取特性配置失败: ${data.error}`);
            }
            
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
            throw error; 
        }
    },
    
    // 从API获取供应商配置
    async fetchProviderConfig() {
        try {
            console.log('开始获取供应商配置');
            const response = await fetch('/api/config/ai-providers');
            
            if (!response.ok) {
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
                    window.AIChatData.loadLatestProviderSession()
                        .then(() => {
                            // 加载或创建会话后更新会话显示
                            this.updateSessionDisplay();
                        })
                        .catch(error => console.error('自动加载最新会话失败:', error));
                }, 500);
            } else {
                // 如果数据库未就绪，创建新会话
                console.log('数据库未就绪，创建新会话');
                window.AIChatData.createNewSession();
            }
            
            // 启用界面
            if (this.elements.sendButton) {
                this.elements.sendButton.disabled = false;
            }
            
        } catch (error) {
            console.error('加载供应商配置失败:', error);
            this.UI.showTooltip('无法加载供应商配置，请刷新页面重试');
            throw error; // 重新抛出错误
        }
    },
    
    // 获取思考模式配置
    async fetchThinkingConfig() {
        try {
            console.log('获取思考模式配置');

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
            throw error; // 重新抛出错误
        }
    },
    
    // 填充供应商选择下拉框
    populateProviderSelect(defaultProviderName) {
        if (!this.elements.provider) {
            throw new Error('供应商下拉框元素不存在');
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
            throw new Error('更新模型选项失败: provider或model元素不存在');
        }
        
        const provider = this.elements.provider.value;
        if (!this.state.providers[provider]) {
            throw new Error(`更新模型选项失败: 未找到供应商配置 ${provider}`);
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
        this.UI.updateUIForMode();
        this.UI.showTooltip(`已切换到${this.state.isStreamMode ? '流式' : '标准'}响应模式`);
    },

    
    /**
     * 加载MCP服务器列表并显示选择界面
     */
    async loadMCPServers() {
        try {
            // 获取服务器列表
            const data = await this.API.getMCPServers();
            this.state.mcpServers = data.servers || [];
            this.state.enabledServerIds = data.enabledServerIds || [];
            this.updateMCPServersUI();
            
            // 更新MCP按钮计数器
            this.UI.updateMCPButtonCounter();
            
            return data;
        } catch (error) {
            console.error('加载MCP服务器列表失败:', error);
            this.UI.showTooltip('获取MCP服务器列表失败，请检查网络连接');
            throw error;
        }
    },
    
    /**
     * 更新MCP服务器选择界面
     */
    updateMCPServersUI() {
        const container = document.getElementById('mcp-servers-list');
        if (!container) return;
        
        // 清空容器
        container.innerHTML = '';
        
        if (this.state.mcpServers.length === 0) {
            container.innerHTML = '<div class="no-servers">没有可用的MCP服务器</div>';
            return;
        }
        
        // 为每个服务器创建卡片
        this.state.mcpServers.forEach(server => {
            const serverCard = document.createElement('div');
            serverCard.className = `server-card ${server.isEnabled ? 'selected' : ''}`;
            serverCard.dataset.serverId = server.id;
            
            // 创建复选框
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `server-${server.id}`;
            checkbox.className = 'server-checkbox';
            checkbox.value = server.id;
            checkbox.checked = server.isEnabled;
            
            // 创建服务器名称
            const serverName = document.createElement('div');
            serverName.className = 'server-name';
            serverName.textContent = server.name;
            
            // 如果有描述，添加描述
            if (server.description) {
                const serverDesc = document.createElement('div');
                serverDesc.className = 'server-description';
                serverDesc.textContent = server.description;
                serverCard.appendChild(serverDesc);
            }
            
            // 添加事件监听 - 对整个卡片添加点击事件
            serverCard.addEventListener('click', (e) => {
                // 如果点击的是复选框，避免重复触发
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.updateEnabledServers();
                    
                    // 更新卡片样式
                    serverCard.classList.toggle('selected', checkbox.checked);
                }
            });
            
            // 复选框单独的事件处理
            checkbox.addEventListener('change', () => {
                this.updateEnabledServers();
                // 更新卡片样式
                serverCard.classList.toggle('selected', checkbox.checked);
            });
            
            // 组装并添加到容器
            serverCard.appendChild(checkbox);
            serverCard.appendChild(serverName);
            
            container.appendChild(serverCard);
        });
        
        // 添加全选/取消全选按钮事件
        this.setupServerSelectionButtons();
    },
    
    /**
     * 设置服务器选择按钮事件
     */
    setupServerSelectionButtons() {
        const selectAllBtn = document.getElementById('select-all-servers');
        const deselectAllBtn = document.getElementById('deselect-all-servers');
        
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                if (this.state.mcpServers.length === 0) {
                    this.UI.showTooltip('没有可用的服务器');
                    return;
                }
                
                // 选中所有服务器
                this.state.mcpServers.forEach(server => {
                    const checkbox = document.getElementById(`server-${server.id}`);
                    const card = document.querySelector(`.server-card[data-server-id="${server.id}"]`);
                    
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                    
                    if (card) {
                        card.classList.add('selected');
                    }
                });
                
                this.updateEnabledServers();
            });
        }
        
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                // 取消选中所有服务器
                this.state.mcpServers.forEach(server => {
                    const checkbox = document.getElementById(`server-${server.id}`);
                    const card = document.querySelector(`.server-card[data-server-id="${server.id}"]`);
                    
                    if (checkbox) {
                        checkbox.checked = false;
                    }
                    
                    if (card) {
                        card.classList.remove('selected');
                    }
                });
                
                this.updateEnabledServers();
            });
        }
    },

    /**
     * 更新启用的服务器列表并保存到服务器
     */
    async updateEnabledServers() {
        // 收集选中的服务器ID
        const enabledIds = [];
        this.state.mcpServers.forEach(server => {
            const checkbox = document.getElementById(`server-${server.id}`);
            if (checkbox && checkbox.checked) {
                enabledIds.push(server.id);
            }
        });
        
        // 更新状态
        this.state.enabledServerIds = enabledIds;
        
        try {
            // 保存到服务器
            await this.API.saveEnabledMCPServers(enabledIds);
            console.log('已更新启用的MCP服务器列表:', enabledIds);
            
            // 显示提示
            this.UI.showTooltip(`已更新启用的MCP服务器，当前启用 ${enabledIds.length} 个服务器`);
        } catch (error) {
            console.error('保存MCP服务器启用状态失败:', error);
            this.UI.showTooltip('保存MCP服务器启用状态失败');
        }
    },
    
    // 清除对话
    clearChat() {
        if (!this.elements.chatMessages) {
            throw new Error('聊天消息容器未找到');
        }
        
        if (this.elements.chatMessages.childElementCount === 0) {
            this.UI.showTooltip('没有对话可清除');
            return;
        }
        
        // 移除确认对话框，直接执行清除操作
        this.elements.chatMessages.innerHTML = '';
        this.UI.showTooltip('对话已清除');
        
        // 使用setTimeout确保DOM更新完成后再显示气泡
        setTimeout(() => {
            this.UI.showRandomQuickMessages();
        }, 100);
    },
    
    // 处理发送消息
    async handleSend() {
        if (!this.API) {
            throw new Error('API模块未初始化，无法发送消息');
        }
        
        const message = this.elements.message.value.trim();
        
        if (!message) {
            this.UI.showTooltip('请输入消息');
            return;
        }
        
        if (!this.state.isConfigLoaded) {
            this.UI.showTooltip('配置尚未加载完成，请稍后再试');
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
    
    // 创建新的聊天会话
    createNewSession() {
        console.log('创建新的会话');
        return window.AIChatData.createNewSession();
    }
}; 