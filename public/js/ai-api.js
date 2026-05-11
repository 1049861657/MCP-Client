/**
 * AI聊天应用 - API模块
 * 处理与服务器的通信和数据处理
 */

// API客户端模块
window.AIChatAPI = {
    // 用于累计工具调用的token消耗
    accumulatedToolTokens: 0,
    
    // 用于存储工具调用的完整参数，键为tool_call_id，值为completeArguments
    toolCallArgumentsMap: new Map(),
    
    /**
     * 解析 SSE data 字段：单行单 JSON，或多段 JSON 粘连（如 }{ 中间无换行）
     */
    parseSseDataPayload(raw) {
        const trimmed = String(raw).trim();
        if (!trimmed) {
            return [];
        }
        if (!/\}\s*\{/.test(trimmed)) {
            try {
                return [JSON.parse(trimmed)];
            } catch {
                return null;
            }
        }
        const parts = trimmed.split(/\}\s*\{/);
        const out = [];
        try {
            out.push(JSON.parse(parts[0] + '}'));
            for (let k = 1; k < parts.length - 1; k++) {
                out.push(JSON.parse('{' + parts[k] + '}'));
            }
            out.push(JSON.parse('{' + parts[parts.length - 1]));
        } catch {
            return null;
        }
        return out;
    },

    /**
     * 处理单个流式 JSON 对象（content / reasoning / 工具协议）
     * @returns {string} 更新后的正文累积 fullText
     */
    applyStreamDataObject(jsonData, aiMessageDiv, fullText) {
        const UI = window.AIChatUI;

        if (jsonData.reasoning_content) {
            console.log('jsonData(思考):', jsonData);
            UI.updateReasoningContent(aiMessageDiv, jsonData.reasoning_content);
        }
        if (jsonData.tool_call) {
            console.log('jsonData(工具调用):', jsonData);
            const toolInfo = {
                name: jsonData.tool_call.name || '未命名工具',
                id: jsonData.tool_call.id,
                args: jsonData.tool_call.arguments || {}
            };
            UI.addToolCall(aiMessageDiv, toolInfo);
        }

        if (jsonData.tool_call_update) {
            console.log('jsonData(工具调用更新):', jsonData);
            const toolCallElements = aiMessageDiv.querySelectorAll('.tool-call');
            const index = jsonData.tool_call_update.index || 0;

            if (toolCallElements && toolCallElements.length > index) {
                const toolElement = toolCallElements[index];

                if (jsonData.tool_call_update.completeArguments) {
                    let argsStr = '';
                    try {
                        const parsed = JSON.parse(jsonData.tool_call_update.completeArguments);
                        argsStr = JSON.stringify(parsed, null, 2);

                        console.log('收到完整工具参数:', argsStr);

                        if (jsonData.tool_call_update.tool_call_id) {
                            this.toolCallArgumentsMap.set(
                                jsonData.tool_call_update.tool_call_id,
                                {
                                    arguments: jsonData.tool_call_update.completeArguments,
                                }
                            );
                            console.log(`已保存工具参数 ID: ${jsonData.tool_call_update.tool_call_id}`);
                        }

                        const argsElement = toolElement.querySelector('.tool-call-args');
                        if (argsElement) {
                            argsElement.dataset.complete = 'true';
                            argsElement.textContent = argsStr;
                        }
                    } catch (error) {
                        console.error('解析完整参数失败:', error);
                    }
                } else if (jsonData.tool_call_update.arguments) {
                    const argsElement = toolElement.querySelector('.tool-call-args');

                    if (argsElement && argsElement.dataset.complete !== 'true') {
                        let argsStr = '';
                        try {
                            const parsed = JSON.parse(jsonData.tool_call_update.arguments);
                            argsStr = JSON.stringify(parsed, null, 2);
                        } catch {
                            argsStr = jsonData.tool_call_update.arguments;
                        }

                        argsElement.textContent = argsStr;

                        if (!argsElement.dataset.receivingFragments) {
                            argsElement.dataset.receivingFragments = 'true';
                        }
                    }
                }
            }
        }

        if (jsonData.tool_progress) {
            console.log('jsonData(工具进度):', jsonData);
            UI.updateToolCallProgress(
                aiMessageDiv,
                jsonData.tool_progress.index,
                jsonData.tool_progress.progress,
                jsonData.tool_progress.total,
                jsonData.tool_progress.message
            );
        }

        if (jsonData.tool_call_result) {
            console.log('jsonData(工具调用结果):', jsonData);

            if (jsonData.tool_call_result.name === 'executeApi') {
                const entry = this.toolCallArgumentsMap.get(jsonData.tool_call_result.tool_call_id);
                if (entry) {
                    const parsedArgs = JSON.parse(entry.arguments);
                    window.parent.postMessage({
                        type: 'ai_tool_call_result',
                        data: {
                            apiId: parsedArgs.apiId,
                            params: parsedArgs.params,
                            result: jsonData.tool_call_result.result,
                        }
                    }, '*');
                    this.toolCallArgumentsMap.delete(jsonData.tool_call_result.tool_call_id);
                }
            }

            if (jsonData.tool_call_result.token_usage && jsonData.tool_call_result.token_usage.totalTokens) {
                this.accumulatedToolTokens += jsonData.tool_call_result.token_usage.totalTokens;
            }

            UI.updateToolCallResult(
                aiMessageDiv,
                jsonData.tool_call_result.name,
                jsonData.tool_call_result.result,
                jsonData.tool_call_result.error === true,
                jsonData.tool_call_result.index,
                jsonData.tool_call_result.tool_call_id,
                jsonData.tool_call_result.execution_time,
                jsonData.tool_call_result.token_usage
            );
        }

        if (jsonData.content) {
            if (aiMessageDiv.querySelector('.ai-thinking')) {
                UI.hideThinking(aiMessageDiv);
            }
            const newFullText = fullText + jsonData.content;
            UI.updateMainContent(aiMessageDiv, newFullText);
            return newFullText;
        }

        if (jsonData.error) {
            UI.hideThinking(aiMessageDiv);
            UI.updateAIMessage(aiMessageDiv, `错误: ${jsonData.error}`);
            UI.finalizeAIMessage(aiMessageDiv, false);
        }

        return fullText;
    },
    
    // 发送流式请求
    async sendStreamRequest(message, model, temperature, maxTokens, enableTools = false) {
        const app = window.AIChatApp;
        const UI = window.AIChatUI;
        
        if (!app.state.isConfigLoaded) {
            UI.showTooltip('配置尚未加载完成，请稍后再试');
            return;
        }
        
        // 获取参数校验状态和提示词状态
        const enableParamValidation = app.state.enableParamValidation;
        const enablePrompts = app.state.enablePrompts;
        
        const provider = app.elements.provider.value;
        if (!app.state.providers[provider]) {
            UI.showTooltip('无效的供应商配置');
            return;
        }
        
        // 重置工具token累计
        this.accumulatedToolTokens = 0;
        
        const startTime = Date.now();
        
        // 添加用户和AI消息
        UI.addUserMessage(message);
        const aiMessageDiv = UI.addAIMessage();
        
        try {
            // 准备请求参数
            let requestBody = {
                message,
                model,
                temperature,
                maxTokens,
                vendor: provider,
                enableTools,
                enableParamValidation,
                enablePrompts
            };
            
            // 如果启用了消息历史，准备消息历史
            if (enableTools && app.state.enableMessageHistory && app.state.messageHistory.length > 0) {
                // 获取设定数量的最近历史消息
                const historyCount = app.state.messageHistoryCount;
                const recentHistory = app.state.messageHistory.slice(-historyCount);
                
                const messages = recentHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
                
                // 添加当前用户消息到历史
                messages.push({
                    role: 'user',
                    content: message
                });
                
                requestBody.messages = messages;
            }
            
            // 添加用户消息到历史记录（必须在响应处理前添加，这样AI回复才能紧跟用户消息）
            app.state.messageHistory.push({
                role: 'user',
                content: message
            });
            
            // 发送请求
            const response = await fetch(`/api/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            await this.processStreamResponse(response, aiMessageDiv, startTime);
            
        } catch (error) {
            console.error('发送请求出错:', error);
            
            // 更新消息为错误信息
            UI.updateAIMessage(aiMessageDiv, `错误: ${error.message || '与服务器通信失败'}`);
            UI.finalizeAIMessage(aiMessageDiv);
        }
    },
    
    // 发送常规请求
    async sendRegularRequest(message, model, temperature, maxTokens, enableTools = false) {
        const app = window.AIChatApp;
        const UI = window.AIChatUI;
        
        if (!app.state.isConfigLoaded) {
            UI.showTooltip('配置尚未加载完成，请稍后再试');
            return;
        }
        
        // 获取参数校验状态和提示词状态
        const enableParamValidation = app.state.enableParamValidation;
        const enablePrompts = app.state.enablePrompts;
        
        const provider = app.elements.provider.value;
        if (!app.state.providers[provider]) {
            UI.showTooltip('无效的供应商配置');
            return;
        }
        
        // 重置工具token累计
        this.accumulatedToolTokens = 0;
        
        const startTime = Date.now();
        
        // 清空上次结果
        const { responseContent, tokenUsage } = app.elements;
        responseContent.textContent = '';
        tokenUsage.innerHTML = '';
        app.elements.result.classList.remove('hidden');
        
        // 在标准响应模式中，直接在结果区域显示加载状态
        responseContent.innerHTML = '<div class="ai-thinking"><div class="thinking-spinner"></div>AI正在思考中...</div>';
        
        try {
            // 准备请求参数
            let requestBody = {
                message,
                model,
                temperature,
                maxTokens,
                vendor: provider,
                enableTools,
                enableParamValidation,
                enablePrompts
            };
            
            // 如果启用了消息历史，准备消息历史
            if (enableTools && app.state.enableMessageHistory && app.state.messageHistory.length > 0) {
                // 获取设定数量的最近历史消息
                const historyCount = app.state.messageHistoryCount;
                const recentHistory = app.state.messageHistory.slice(-historyCount);
                
                const messages = recentHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
                
                // 添加当前用户消息到历史
                messages.push({
                    role: 'user',
                    content: message
                });
                
                requestBody.messages = messages;
            }
            
            // 发送请求
            const response = await fetch(`/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // 计算响应时间
            const endTime = Date.now();
            const elapsedTime = endTime - startTime;
            
            // 显示响应 - 使用Markdown渲染
            app.elements.result.classList.remove('hidden');
            let content = '';
            let toolCallsHtml = '';
            
            // 处理工具调用信息
            if (data.tool_calls && data.tool_calls.length > 0) {
                // 为每个工具调用创建UI区块
                for (const toolCall of data.tool_calls) {
                    const argsStr = JSON.stringify(toolCall.arguments, null, 2);
                    const resultStr = JSON.stringify(toolCall.result, null, 2);
                    
                    toolCallsHtml += `
                        <div class="tool-call">
                            <div class="tool-call-header">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                                </svg>
                                调用工具: <strong>${toolCall.name}</strong>
                            </div>
                            <div class="tool-call-args">${argsStr}</div>
                            <div class="tool-call-result">
                                <strong>结果:</strong><pre>${resultStr}</pre>
                            </div>
                        </div>
                    `;
                }
                
                content = data.content || '';
            } else {
                // 普通响应
                content = data.content || (data.result && data.result.content) || '';
            }
            
            // 显示内容
            responseContent.innerHTML = `
                ${toolCallsHtml}
                <div class="markdown-content">${UI.parseMarkdown(content)}</div>
            `;
            
            // 应用代码高亮和语言标签
            UI.processCodeBlocks(responseContent);
            
            UI.showResponseTime(elapsedTime);
            UI.showTokenUsage(data.usage || (data.result && data.result.usage));
            
            // 添加到消息历史
            if (content) {
                app.state.messageHistory.push({
                    role: 'user',
                    content: message
                });
                
                app.state.messageHistory.push({
                    role: 'assistant',
                    content: content
                });
                
                // 保存历史
                app.saveMessageHistory();
            }
            
        } catch (error) {
            console.error('发送请求出错:', error);
            
            // 显示错误消息
            app.elements.result.classList.remove('hidden');
            responseContent.textContent = `错误: ${error.message || '与服务器通信失败'}`;
        }
    },
    
    /**
     * 处理流式响应
     * @param {Response} response - 服务器响应
     * @param {HTMLElement} aiMessageDiv - AI消息元素
     * @param {number} startTime - 请求开始时间
     */
    async processStreamResponse(response, aiMessageDiv, startTime) {
        const app = window.AIChatApp;
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';  // 保存完整文本
        let eventName = '';
        let eventData = '';
        
        // 用于处理跨chunks的数据
        let buffer = '';
        
        try {
            // 用户发送消息后，移除所有类型的快捷气泡
            const chatMessages = app.elements.chatMessages;
            if (chatMessages) {
                // 移除标准气泡
                const standardBubbles = chatMessages.querySelector('.quick-message-bubbles');
                if (standardBubbles) {
                    standardBubbles.remove();
                }
                // 移除追加气泡
                const appendedBubbles = chatMessages.querySelector('.appended-quick-bubbles');
                if (appendedBubbles) {
                    appendedBubbles.remove();
                }
            }
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    // 流结束前缓冲区可能缺少末尾换行，补一行再按 SSE 行处理，避免最后一段 data 丢失
                    if (buffer.length > 0) {
                        const flushChunk = buffer + '\n';
                        const flushLines = flushChunk.split('\n');
                        buffer = '';
                        for (const line of flushLines) {
                            if (line.startsWith('event:')) {
                                eventName = line.substring(6).trim();
                            } else if (line.startsWith('data:')) {
                                eventData = line.substring(5).trim();
                                fullText = await this.handleEventData(eventName, eventData, aiMessageDiv, fullText, startTime);
                            } else if (line.trim() === '') {
                                eventName = '';
                                eventData = '';
                            }
                        }
                    }
                    // 确保思考状态被移除
                    window.AIChatUI.hideThinking(aiMessageDiv);
                    window.AIChatUI.finalizeAIMessage(aiMessageDiv);
                    
                    // 如果有内容，将AI回复保存到历史记录中
                    if (fullText) {
                        // 添加AI回复到消息历史
                        app.state.messageHistory.push({
                            role: 'assistant',
                            content: fullText
                        });
                        
                        // 重新保存历史
                        window.AIChatData.saveMessageHistory();
                        
                        // 在聊天完成后显示追加的快捷消息气泡
                        setTimeout(() => {
                            window.AIChatUI.showAppendedQuickMessages();
                        }, 300); // 使用延迟确保DOM更新完成
                    }
                    
                    break;
                }
                
                // 解码二进制数据
                const chunk = decoder.decode(value, { stream: true });
                
                // 添加到缓冲区并处理完整行
                buffer += chunk;
                const lines = buffer.split('\n');
                
                // 处理所有完整行，保留最后一行（可能不完整）
                if (lines.length > 1) {
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.startsWith('event:')) {
                            eventName = line.substring(6).trim();
                        } else if (line.startsWith('data:')) {
                            eventData = line.substring(5).trim();
                            
                            // 在这里处理事件数据
                            fullText = await this.handleEventData(eventName, eventData, aiMessageDiv, fullText, startTime);
                        } else if (line.trim() === '') {
                            // 空行，重置事件数据
                            eventName = '';
                            eventData = '';
                        } 
                    }
                }
            }
        } catch (error) {
            console.error('读取流出错:', error);
            window.AIChatUI.updateAIMessage(aiMessageDiv, `错误: ${error.message || '读取响应流失败'}`);
            window.AIChatUI.finalizeAIMessage(aiMessageDiv);
        }
    },
    
    // 处理事件数据
    async handleEventData(eventName, eventData, aiMessageDiv, fullText, startTime) {
        const UI = window.AIChatUI;
        const timeManager = window.AIChatApp.timeManager;

        // 处理使用情况数据
        if(eventName === 'begin'){
            window.parent.postMessage({type: 'ai_tool_call_begin'}, '*');
        }
        else if (eventName === 'usage' && eventData) {
            try {
                const usageData = JSON.parse(eventData);
                console.log('Usage数据:', usageData); // 调试用
  
                // 更新Token信息
                const tokenInfo = aiMessageDiv.querySelector('.token-info');
                if (tokenInfo) {
                    // 创建token信息HTML，包含单次消耗和总消耗
                    tokenInfo.innerHTML = `
                        <span class="total-token-usage" title="累计消耗: ${this.accumulatedToolTokens+usageData.totalTokens}">总计Tokens: ${this.accumulatedToolTokens+usageData.totalTokens}</span>
                        <span class="tool-token-usage" title="本次消耗: ${usageData.totalTokens}">tokens:${usageData.totalTokens}</span>
                    `;
                }
                
                // 更新全局时间信息 - 直接使用服务器返回的elapsedTime
                if (usageData.elapsedTime) {
                    // 立即更新全局时间显示 - 直接使用字符串格式
                    const messageInfo = aiMessageDiv.querySelector('.message-info');
                    if (messageInfo) {
                        const timeInfo = messageInfo.querySelector('.message-time');
                        if (timeInfo) {
                            // 直接设置耗时显示
                            timeInfo.textContent = `${timeManager.getFullTimeString()} · ${usageData.elapsedTime}秒`;
                        }
                    }
                }
                
                return fullText;
            } catch (e) {
                console.error('解析usage数据出错:', e, '原始数据:', eventData);
            }
        } 
        // 处理完成事件
        else if (eventName === 'done') {
            window.parent.postMessage({type: 'ai_tool_call_done'}, '*');
            // 确保思考状态被移除
            UI.hideThinking(aiMessageDiv);
            // 不更新时间的情况下完成消息处理
            UI.finalizeAIMessage(aiMessageDiv, false);
        }
        // 处理内容事件（含工具协议 JSON；支持单行多段粘连 JSON）
        else if (eventData) {
            const payloads = this.parseSseDataPayload(eventData);
            if (!payloads) {
                const looksLikeToolProtocol = /"tool_call"/.test(eventData) && eventData.trim().startsWith('{');
                if (looksLikeToolProtocol) {
                    console.warn('工具协议 data 行解析失败，已忽略以避免污染正文:', eventData.slice(0, 240));
                    return fullText;
                }
                if (aiMessageDiv.querySelector('.ai-thinking')) {
                    UI.hideThinking(aiMessageDiv);
                }
                const newFullText = fullText + eventData;
                UI.updateMainContent(aiMessageDiv, newFullText);
                return newFullText;
            }
            let nextText = fullText;
            for (let i = 0; i < payloads.length; i++) {
                nextText = this.applyStreamDataObject(payloads[i], aiMessageDiv, nextText);
            }
            return nextText;
        }
        
        return fullText;
    },
    
    /**
     * 获取可用的MCP工具
     * 用于显示工具信息和状态
     */
    async getAvailableMCPTools() {
        try {
            const response = await fetch('/api/tools/list');
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                console.error('获取MCP工具列表失败:', data.error);
                return [];
            }
            
            return data.tools || [];
        } catch (error) {
            console.error('获取MCP工具出错:', error);
            return [];
        }
    },
    
    /**
     * 获取已配置的MCP服务器列表
     * 用于显示服务器选择界面
     */
    async getMCPServers() {
        try {
            const response = await fetch('/api/mcp/servers');
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                console.error('获取MCP服务器列表失败:', data.error);
                return { servers: [], enabledServerIds: [] };
            }
            
            return data;
        } catch (error) {
            console.error('获取MCP服务器出错:', error);
            return { servers: [], enabledServerIds: [] };
        }
    },
    
    /**
     * 保存启用的MCP服务器ID列表
     * @param {string[]} enabledServerIds 启用的服务器ID列表
     * @returns {Promise<boolean>} 是否保存成功
     */
    async saveEnabledMCPServers(enabledServerIds) {
        try {
            const response = await fetch('/api/mcp/servers/enabled', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabledServerIds })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP错误: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('保存启用的MCP服务器列表失败:', error);
            throw error;
        }
    }
}; 