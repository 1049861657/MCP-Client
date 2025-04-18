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
        const app = this.app;
        
        // 供应商变化的增强功能绑定
        if (app.elements.provider) {
            // 只添加扩展功能，不重新绑定事件
            const existingHandler = app.elements.provider.onchange;
            app.elements.provider.onchange = (e) => {
                // 先执行原有处理器
                if (existingHandler) existingHandler.call(app.elements.provider, e);
                
                // 清空当前聊天界面
                if (app.elements.chatMessages) {
                    app.elements.chatMessages.innerHTML = '';
                }
                
                // 清空消息历史数组
                app.state.messageHistory = [];
                
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
            };
        }
        
        console.log('工具模块事件增强功能初始化完成');
    },
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
    }
};