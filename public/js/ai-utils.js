/**
 * AI聊天应用 - 工具模块
 * 包含事件处理和时间工具等辅助功能
 */

// 工具管理全局对象
window.AIChatUtils = {
    // 初始化工具模块
    init(app) {
        console.log('初始化工具模块...');
        
        // 保存应用引用
        this.app = app;
        
        // 初始化事件监听器
        this.initEvents();
    },
    
    // 初始化事件监听器
    initEvents() {
        console.log('初始化事件监听器...');
        
        const app = this.app;
        
        // 模式切换
        if (!app.elements.modeRegular || !app.elements.modeStream) {
            throw new Error('模式切换按钮未找到');
        }
        app.elements.modeRegular.addEventListener('click', () => app.setMode('regular'));
        app.elements.modeStream.addEventListener('click', () => app.setMode('stream'));
        
        // MCP工具开关
        if (app.elements.enableMCPTools) {
            app.elements.enableMCPTools.addEventListener('change', () => {
                app.state.enableMCPTools = app.elements.enableMCPTools.checked;
                
                // 如果启用了工具，尝试加载工具列表
                if (app.state.enableMCPTools) {
                    app.loadMCPTools();
                    app.UI.showTooltip('已启用MCP工具调用功能');
                } else {
                    app.UI.showTooltip('已禁用MCP工具调用功能');
                }
                
                console.log('MCP工具模式:', app.state.enableMCPTools ? '启用' : '禁用');
            });
        }
        
        // 参数校验开关
        if (app.elements.enableParamValidation) {
            app.elements.enableParamValidation.addEventListener('change', () => {
                app.state.enableParamValidation = app.elements.enableParamValidation.checked;
                
                // 显示提示
                if (app.state.enableParamValidation) {
                    app.UI.showTooltip('已启用参数校验功能');
                } else {
                    app.UI.showTooltip('已禁用参数校验功能');
                }
                
                console.log('参数校验模式:', app.state.enableParamValidation ? '启用' : '禁用');
            });
        }
        
        // 消息历史开关
        if (app.elements.enableMessageHistory) {
            app.elements.enableMessageHistory.addEventListener('change', () => {
                app.state.enableMessageHistory = app.elements.enableMessageHistory.checked;
                
                // 启用或禁用消息数量输入框
                if (app.elements.messageHistoryCount) {
                    app.elements.messageHistoryCount.disabled = !app.state.enableMessageHistory;
                }
                
                console.log('消息历史模式:', app.state.enableMessageHistory ? '启用' : '禁用');
            });
        }
        
        // 消息历史数量
        if (app.elements.messageHistoryCount) {
            app.elements.messageHistoryCount.addEventListener('change', () => {
                app.state.messageHistoryCount = parseInt(app.elements.messageHistoryCount.value, 10) || 3;
                console.log('消息历史数量:', app.state.messageHistoryCount);
            });
        }
        
        // 聊天功能
        if (!app.elements.sendButton) {
            throw new Error('发送按钮未找到');
        }
        app.elements.sendButton.addEventListener('click', () => app.handleSend());
        
        if (!app.elements.clearChat) {
            throw new Error('清除聊天按钮未找到');
        }
        app.elements.clearChat.addEventListener('click', () => app.clearChat());
        
        if (!app.elements.copyChat) {
            throw new Error('复制聊天按钮未找到');
        }
        app.elements.copyChat.addEventListener('click', () => app.copyChat());
        
        // 历史记录按钮
        const viewHistoryButton = document.getElementById('view-history');
        if (viewHistoryButton) {
            viewHistoryButton.addEventListener('click', () => {
                // 调用UI模块显示历史记录模态窗口
                app.UI.showHistoryModal();
            });
        }
        
        // 新建会话按钮
        const newSessionButton = document.getElementById('new-session');
        if (newSessionButton) {
            newSessionButton.addEventListener('click', () => {
                // 确认是否创建新会话
                if (confirm('确定要创建新会话吗？当前对话将被清除。')) {
                    window.AIChatData.createNewSession();
                }
            });
        }
        
        // 供应商变化
        if (!app.elements.provider) {
            throw new Error('供应商选择下拉框未找到');
        }
        app.elements.provider.addEventListener('change', () => {
            // 清空当前聊天界面
            if (app.elements.chatMessages) {
                app.elements.chatMessages.innerHTML = '';
            }
            
            // 清空消息历史数组
            app.state.messageHistory = [];
            
            // 更新模型选项
            app.updateModelOptions();
            
            const newProvider = app.elements.provider.value;
            const providerText = app.elements.provider.options[app.elements.provider.selectedIndex].text || '未知供应商';
            console.log(`已切换到供应商: ${newProvider} (${providerText})`);
            
            // 加载当前供应商的最新会话或创建新会话
            if (window.AIChatData.db.isReady) {
                console.log('供应商已切换，尝试加载该供应商的最新会话');
                window.AIChatData.loadLatestProviderSession()
                    .then(() => {
                        // 加载或创建会话后更新会话显示
                        app.updateSessionDisplay();
                    })
                    .catch(error => {
                        console.error('自动加载最新会话失败:', error);
                        // 确保在任何出错情况下都创建新会话
                        window.AIChatData.createNewSession();
                    });
            } else {
                // 如果数据库未就绪，创建新会话
                console.log('数据库未就绪，创建新会话');
                window.AIChatData.createNewSession();
            }
            
            // 显示提示消息
            app.UI.showTooltip(`已切换到 ${providerText}`);
        });
        
        // 按键监听
        if (!app.elements.message) {
            throw new Error('消息输入框未找到');
        }
        app.elements.message.addEventListener('keydown', (e) => {
            // 如果按下的是回车键
            if (e.key === 'Enter') {
                // 如果同时按下Shift键，允许换行
                if (e.shiftKey) {
                    return; // 默认行为是添加换行
                }
                else if (!app.elements.sendButton.disabled) {
                    e.preventDefault(); // 阻止默认的换行行为
                    app.elements.sendButton.click(); // 触发发送按钮点击
                }
            }
        });
        
        console.log('所有事件监听器初始化完成');
    },
    
    // 加载MCP工具
    async loadMCPTools() {
        const app = this.app;
        
        try {
            console.log('正在获取可用的MCP工具...');
            const tools = await app.API.getAvailableMCPTools();
            
            app.state.mcpTools = tools;
            console.log(`已加载 ${tools.length} 个MCP工具:`, tools.map(t => t.name).join(', '));
            
            if (tools.length > 0) {
                app.UI.showTooltip(`已加载 ${tools.length} 个MCP工具`);
            } else {
                app.UI.showTooltip('未找到可用的MCP工具，请确认MCP服务器已连接');
            }
        } catch (error) {
            console.error('加载MCP工具失败:', error);
            app.UI.showTooltip('获取MCP工具失败，请确认服务器连接正常');
            throw error; // 重新抛出错误
        }
    }
};

// 时间管理工具
window.AIChatTimeManager = {
    // 标准时间格式化（简短格式，仅时分秒）
    getTimeString() {
        const now = new Date();
        return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    },
    
    // 完整时间格式化（包含年月日时分秒）
    getFullTimeString() {
        const now = new Date();
        return now.toLocaleString('zh-CN', { 
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
        });
    },
    
    // 计算客户端耗时（毫秒）
    calculateElapsedTime(startTime) {
        return Date.now() - startTime;
    },
    
    // 更新思考时间显示
    updateThinkingTime(container, timeInSeconds) {
        if (!container) {
            throw new Error('更新思考时间容器不存在');
        }
        
        const timeSpan = container.querySelector('.thinking-time span');
        if (timeSpan && timeInSeconds !== undefined) {
            // 确保显示的是数字
            const seconds = parseFloat(timeInSeconds);
            timeSpan.textContent = isNaN(seconds) ? '0秒' : `${seconds}秒`;
        }
    },
    
    // 保存思考时间数据
    saveThinkingTimeData(messageDiv, container, timeInSeconds) {
        if (!messageDiv || !container || timeInSeconds === undefined) {
            throw new Error('保存思考时间参数无效');
        }
        
        // 将思考时间保存到数据属性中
        container.dataset.thinkingTime = timeInSeconds;
        messageDiv.dataset.aiThinkingTime = timeInSeconds;
    },
    
    // 格式化时间为合适的单位
    formatElapsedTime(milliseconds) {
        // 如果小于1000毫秒，直接显示毫秒
        if (milliseconds < 1000) {
            return `${milliseconds}毫秒`;
        } 
        // 如果大于1000毫秒，转换为秒并保留2位小数
        else {
            const seconds = (milliseconds / 1000).toFixed(2);
            return `${seconds}秒`;
        }
    },
    
    // 更新全局时间显示
    updateGlobalTime(messageDiv, startTime, serverElapsedTime = null) {
        if (!messageDiv) {
            throw new Error('消息DIV不存在');
        }
        
        // 如果时间已锁定，跳过更新
        if (messageDiv.dataset.timeLocked === "true") {
            console.log('🔒 全局时间已锁定，跳过更新，使用已保存的值');
            return;
        }
        
        const messageInfo = messageDiv.querySelector('.message-info');
        if (!messageInfo) {
            throw new Error('消息信息容器不存在');
        }
        
        let formattedTime;
        
        // 优先使用服务器返回的时间（单位秒）
        if (serverElapsedTime !== null) {
            console.log('更新全局时间 - 使用服务器时间:', serverElapsedTime, '秒');
            // 确保serverElapsedTime是数值
            const elapsedSec = parseFloat(serverElapsedTime);
            formattedTime = isNaN(elapsedSec) ? '未知' : `${elapsedSec}秒`;
        } else {
            // 否则使用客户端计算的时间
            const elapsedTime = this.calculateElapsedTime(startTime);
            formattedTime = this.formatElapsedTime(elapsedTime);
            console.log('更新全局时间 - 使用客户端时间:', formattedTime);
        }
        
        // 更新或创建时间元素
        let timeInfo = messageInfo.querySelector('.message-time');
        if (!timeInfo) {
            timeInfo = document.createElement('div');
            timeInfo.className = 'message-time';
            messageInfo.appendChild(timeInfo);
        }
        
        // 设置完整格式时间和耗时
        timeInfo.textContent = `${this.getFullTimeString()} · ${formattedTime}`;
        
        // 确保信息区可见
        messageInfo.classList.remove('hidden');
    }
}; 