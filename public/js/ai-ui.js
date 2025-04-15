/**
 * AI聊天应用 - UI模块
 * 包含所有UI渲染、更新和显示相关功能
 */

// UI管理模块
window.AIChatUI = {
    // 显示操作提示
    showTooltip(message, duration = 2000) {
        const tooltip = window.AIChatApp.elements.tooltip;
        tooltip.textContent = message;
        tooltip.classList.add('show');
        
        setTimeout(() => {
            tooltip.classList.remove('show');
        }, duration);
    },
    
    // 显示自定义确认对话框
    showConfirm(options = {}) {
        const {
            title = '确认操作',
            message = '确定要执行此操作吗？',
            okText = '确定',
            cancelText = '取消',
            okClass = 'confirm-ok',
            cancelClass = 'confirm-cancel',
            onConfirm = () => {},
            onCancel = () => {}
        } = options;
        
        // 移除已有的确认框
        const existingConfirm = document.querySelector('.confirm-overlay');
        if (existingConfirm) {
            document.body.removeChild(existingConfirm);
        }
        
        // 创建确认对话框元素
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        
        const header = document.createElement('div');
        header.className = 'confirm-header';
        header.textContent = title;
        
        const content = document.createElement('div');
        content.className = 'confirm-content';
        content.textContent = message;
        
        const actions = document.createElement('div');
        actions.className = 'confirm-actions';
        
        const cancelButton = document.createElement('button');
        cancelButton.className = `confirm-button ${cancelClass}`;
        cancelButton.textContent = cancelText;
        cancelButton.addEventListener('click', () => {
            this.closeConfirm(overlay);
            onCancel();
        });
        
        const okButton = document.createElement('button');
        okButton.className = `confirm-button ${okClass}`;
        okButton.textContent = okText;
        okButton.addEventListener('click', () => {
            this.closeConfirm(overlay);
            onConfirm();
        });
        
        // 组装对话框
        actions.appendChild(cancelButton);
        actions.appendChild(okButton);
        
        dialog.appendChild(header);
        dialog.appendChild(content);
        dialog.appendChild(actions);
        
        overlay.appendChild(dialog);
        
        // 添加到页面
        document.body.appendChild(overlay);
        
        // 点击遮罩层关闭对话框（视为取消）
        overlay.addEventListener('click', (e) => {
            // 确保点击的是遮罩层而不是对话框内部元素
            if (e.target === overlay) {
                this.closeConfirm(overlay);
                onCancel();
            }
        });
        // 显示对话框（使用requestAnimationFrame确保过渡效果）
        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });
        
        // 绑定ESC键关闭
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                this.closeConfirm(overlay);
                onCancel();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        
        // 返回对话框元素，允许外部控制
        return overlay;
    },
    
    // 关闭确认对话框
    closeConfirm(overlay) {
        if (!overlay) return;
        
        overlay.classList.remove('show');
        
        // 添加动画结束后移除元素
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300); // 与CSS中的过渡时间相匹配
    },
    
    // 根据当前模式更新UI
    updateUIForMode() {
        const { modeStream, modeRegular, chatMessages, result } = window.AIChatApp.elements;
        const isStreamMode = window.AIChatApp.state.isStreamMode;
        
        // 确保所有需要的DOM元素都存在
        if (!chatMessages || !result) {
            console.error('UI更新失败: 一些必要的DOM元素不存在', { 
                chatMessages: !!chatMessages, 
                result: !!result 
            });
            return; // 如果元素不存在，提前返回避免报错
        }
        
        // 更新单选按钮状态以匹配当前模式
        if (modeStream && modeRegular) {
            modeStream.checked = isStreamMode;
            modeRegular.checked = !isStreamMode;
        }
        
        if (isStreamMode) {
            result.classList.add('hidden');
            chatMessages.style.display = 'flex';
        } else {
            result.classList.remove('hidden');
            chatMessages.style.display = 'none';
        }
    },
    
    // 解析Markdown文本为HTML
    parseMarkdown(text) {
        try {
            //1.不解析图片
            // return marked.parse(text);

            //2.解析图片
            // 先使用marked解析Markdown
            let htmlContent = marked.parse(text);
            
            // 创建临时DOM元素用于处理HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            // 查找所有文本节点
            const textNodes = [];
            const findTextNodes = function(node) {
                if (node.nodeType === 3) { // 文本节点
                    textNodes.push(node);
                } else if (node.nodeType === 1) { // 元素节点
                    // 跳过已经是图片标签的节点
                    if (node.tagName === 'IMG' || node.classList.contains('auto-detected-image')) {
                        return;
                    }
                    
                    // 递归查找子节点
                    for (let i = 0; i < node.childNodes.length; i++) {
                        findTextNodes(node.childNodes[i]);
                    }
                }
            };
            
            // 查找所有文本节点
            findTextNodes(tempDiv);
            
            // 定义图片URL的正则表达式
            const imgUrlRegex = /(https?:\/\/[^\s"'<>]+?\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s"'<>]*)?)/gi;
            
            // 处理文本节点中的图片URL
            textNodes.forEach(textNode => {
                const content = textNode.nodeValue;
                if (!content || !imgUrlRegex.test(content)) return;
                
                // 重置正则表达式的lastIndex
                imgUrlRegex.lastIndex = 0;
                
                // 收集所有匹配
                const matches = [];
                let match;
                while ((match = imgUrlRegex.exec(content)) !== null) {
                    matches.push({
                        url: match[0],
                        index: match.index,
                        endIndex: match.index + match[0].length
                    });
                }
                
                // 如果没有匹配，直接返回
                if (matches.length === 0) return;
                
                // 创建文档片段用于替换
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                
                // 处理每个匹配
                matches.forEach(match => {
                    // 添加匹配前的文本
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(content.substring(lastIndex, match.index)));
                    }
                    
                    // 创建图片容器和图片元素
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'auto-detected-image';
                    
                    const img = document.createElement('img');
                    img.src = match.url;
                    img.alt = '图片';
                    img.loading = 'lazy';
                    img.onerror = function() {
                        this.onerror = null;
                        this.classList.add('image-load-error');
                    };
                    
                    imgContainer.appendChild(img);
                    fragment.appendChild(imgContainer);
                    
                    // 更新lastIndex
                    lastIndex = match.endIndex;
                });
                
                // 添加匹配后的文本
                if (lastIndex < content.length) {
                    fragment.appendChild(document.createTextNode(content.substring(lastIndex)));
                }
                
                // 替换原文本节点
                textNode.parentNode.replaceChild(fragment, textNode);
            });
            
            // 返回处理后的HTML
            return tempDiv.innerHTML;
        } catch (e) {
            console.error('Markdown解析错误:', e);
            return text;
        }
    },
    
    // 显示响应耗时
    showResponseTime(elapsedTime) {
        window.AIChatApp.elements.responseTime.innerHTML = 
            `响应耗时: <span class="response-time-value">${elapsedTime}毫秒</span>`;
    },
    
    // 显示令牌使用情况
    showTokenUsage(usage) {
        if (!usage) {
            window.AIChatApp.elements.tokenUsage.innerHTML = '';
            return;
        }
        
        window.AIChatApp.elements.tokenUsage.innerHTML = `
            <span title="提示词令牌：模型接收的输入token数量">提示词令牌: <span class="token-label">${usage.promptTokens}</span></span>
            <span title="回复令牌：模型生成的输出token数量">回复令牌: <span class="token-label">${usage.completionTokens}</span></span>
            <span title="总令牌：提示词令牌 + 回复令牌的总和">总令牌: <span class="token-label">${usage.totalTokens}</span></span>
        `;
    },
    
    // 添加用户消息到对话框
    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user';
        messageDiv.innerHTML = `
            <div class="avatar">U</div>
            <div class="chat-bubble">
                ${text}
                <div class="message-info">
                    <div class="message-time">${window.AIChatApp.timeManager.getTimeString()}</div>
                </div>
            </div>
        `;
        window.AIChatApp.elements.chatMessages.appendChild(messageDiv);
        
        // 滚动到底部
        window.AIChatApp.elements.chatMessages.scrollTop = window.AIChatApp.elements.chatMessages.scrollHeight;
        
        return messageDiv;
    },
    
    // 添加AI消息到对话框
    addAIMessage(text = '') {
        const provider = window.AIChatApp.state.providers[window.AIChatApp.elements.provider.value]?.name || 'AI';
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message ai';
        messageDiv.dataset.aiMessage = true;
        
        // 检查是否是初始状态（无文本），如果是则显示思考中的状态
        let initialContent;
        if (text === '') {
            // 思考中状态
            initialContent = '<div class="ai-thinking"><div class="thinking-spinner"></div>AI正在思考中...</div>';
        } else {
            // 有内容时使用Markdown渲染
            initialContent = `<div class="markdown-content">${this.parseMarkdown(text)}</div><span class="cursor"></span>`;
        }
        
        messageDiv.innerHTML = `
            <div class="avatar">AI</div>
            <div class="chat-bubble">
                ${initialContent}
                <div class="message-info">
                    <div class="message-time">${window.AIChatApp.timeManager.getTimeString()}</div>
                    <div class="token-info"></div>
                </div>
            </div>
        `;
        window.AIChatApp.elements.chatMessages.appendChild(messageDiv);
        
        // 滚动到底部
        window.AIChatApp.elements.chatMessages.scrollTop = window.AIChatApp.elements.chatMessages.scrollHeight;
        
        return messageDiv;
    },
    
    // 更新AI消息内容
    updateAIMessage(messageDiv, text) {
        const chatBubble = messageDiv.querySelector('.chat-bubble');
        if (!chatBubble) return;
        
        // 保存消息信息区和其内部元素
        const messageInfo = chatBubble.querySelector('.message-info');
        let messageTimeContent = '';
        let tokenInfoContent = '';
        
        if (messageInfo) {
            const messageTime = messageInfo.querySelector('.message-time');
            if (messageTime) {
                messageTimeContent = messageTime.textContent;
            }
            
            const tokenInfo = messageInfo.querySelector('.token-info');
            if (tokenInfo) {
                tokenInfoContent = tokenInfo.textContent;
            }
        }
        
        // 保存思考容器，确保它不会被删除
        const reasoningContainer = chatBubble.querySelector('.reasoning-container');
        
        // 如果有思考中状态并且收到了文本，立即移除思考状态
        const thinkingIndicator = chatBubble.querySelector('.ai-thinking');
        if (thinkingIndicator && text.trim() !== '') {
            // 完全移除思考状态
            this.hideThinking(messageDiv);
            
            // 临时存储思考容器
            let savedReasoningContainer = null;
            if (reasoningContainer) {
                savedReasoningContainer = reasoningContainer.cloneNode(true);
            }
            
            // 重置气泡内容但保留信息区域
            chatBubble.innerHTML = '';
            
            // 如果有思考容器，直接添加回去
            if (savedReasoningContainer) {
                chatBubble.appendChild(savedReasoningContainer);
                
                // 重新绑定事件
                const reasoningHeader = savedReasoningContainer.querySelector('.reasoning-header');
                if (reasoningHeader) {
                    this.attachReasoningToggleEvent(reasoningHeader, savedReasoningContainer);
                }
            }
            
            // 添加Markdown渲染的内容
            const markdownDiv = document.createElement('div');
            markdownDiv.className = 'markdown-content';
            markdownDiv.innerHTML = this.parseMarkdown(text);
            chatBubble.appendChild(markdownDiv);
            
            // 应用代码高亮和语言标签
            this.processCodeBlocks(markdownDiv);
            
            // 添加光标
            chatBubble.appendChild(document.createElement('span')).className = 'cursor';
            
            // 创建并恢复信息区
            const newMessageInfo = document.createElement('div');
            newMessageInfo.className = 'message-info';
            
            // 恢复时间元素
            const newMessageTime = document.createElement('div');
            newMessageTime.className = 'message-time';
            newMessageTime.textContent = messageTimeContent || window.AIChatApp.timeManager.getTimeString();
            newMessageInfo.appendChild(newMessageTime);
            
            // 恢复令牌信息
            const newTokenInfo = document.createElement('div');
            newTokenInfo.className = 'token-info';
            newTokenInfo.textContent = tokenInfoContent || '';
            newMessageInfo.appendChild(newTokenInfo);
            
            // 添加到气泡
            chatBubble.appendChild(newMessageInfo);
        } else if (!thinkingIndicator) {
            // 查找并更新现有的markdown-content
            const markdownDiv = chatBubble.querySelector('.markdown-content:not(.reasoning-content)');
            if (markdownDiv) {
                markdownDiv.innerHTML = this.parseMarkdown(text);
                
                // 应用代码高亮和语言标签
                this.processCodeBlocks(markdownDiv);
            } else {
                // 如果没有找到markdown-content容器，创建一个并添加到适当位置
                const markdownDiv = document.createElement('div');
                markdownDiv.className = 'markdown-content';
                markdownDiv.innerHTML = this.parseMarkdown(text);
                
                // 应用代码高亮和语言标签
                this.processCodeBlocks(markdownDiv);
                
                // 添加到气泡的合适位置
                if (reasoningContainer) {
                    chatBubble.insertBefore(markdownDiv, reasoningContainer.nextSibling);
                } else if (messageInfo) {
                    chatBubble.insertBefore(markdownDiv, messageInfo);
                } else {
                    chatBubble.appendChild(markdownDiv);
                }
            }
        }
        
        // 滚动到底部
        window.AIChatApp.elements.chatMessages.scrollTop = window.AIChatApp.elements.chatMessages.scrollHeight;
    },
    
    // 处理代码块：添加高亮和语言标签
    processCodeBlocks(container) {
        container.querySelectorAll('pre code').forEach((block) => {
            // 获取语言类名
            const languageClass = Array.from(block.classList).find(cls => cls.startsWith('language-'));
            const language = languageClass ? languageClass.replace('language-', '') : 'text';
            
            // 创建语言标签元素
            if (languageClass && language !== 'plaintext') {
                const pre = block.parentElement;
                
                // 创建语言标签容器
                const langLabel = document.createElement('div');
                langLabel.className = 'code-language-label';
                langLabel.textContent = language;
                
                // 将语言标签添加到pre元素前
                if (pre && !pre.querySelector('.code-language-label')) {
                    pre.insertBefore(langLabel, pre.firstChild);
                }
            }
            
            // 应用高亮
            hljs.highlightElement(block);
        });
    },
    
    // 更新思考内容
    updateReasoningContent(messageDiv, reasoningText) {
        // 如果思考已结束，不再更新思考内容
        if (messageDiv.dataset.reasoningEnded === "true") {
            console.log('思考已结束，不再更新思考内容');
            return;
        }
        
        // 获取消息气泡
        const chatBubble = messageDiv.querySelector('.chat-bubble');
        if (!chatBubble) return;
        
        // 获取或创建思考容器
        let reasoningContainer = chatBubble.querySelector('.reasoning-container');
        
        // 如果没有思考起始时间，设置一个
        if (!messageDiv.dataset.thinkingStartTime) {
            messageDiv.dataset.thinkingStartTime = Date.now().toString();
            console.log('设置思考开始时间:', messageDiv.dataset.thinkingStartTime);
        }
        
        // 如果没有思考容器，创建一个
        if (!reasoningContainer) {
            reasoningContainer = document.createElement('div');
            reasoningContainer.className = 'reasoning-container';
            
            // 创建思考标题栏
            const reasoningHeader = document.createElement('div');
            reasoningHeader.className = 'reasoning-header';
            reasoningHeader.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="toggle-icon">
                    <path d="M7 10l5 5 5-5z"/>
                </svg>
                <span class="title-text">AI正在思考中...</span>
                <div class="thinking-time" style="display:inline-flex">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
                    </svg>
                    <span>0秒</span>
                </div>
            `;
            
            // 创建思考内容区
            const reasoningContentDiv = document.createElement('div');
            reasoningContentDiv.className = 'reasoning-content markdown-content';
            reasoningContentDiv.dataset.rawContent = ''; // 初始化空内容
            
            // 添加到容器
            reasoningContainer.appendChild(reasoningHeader);
            reasoningContainer.appendChild(reasoningContentDiv);
            
            // 添加到聊天气泡的最前面
            chatBubble.insertBefore(reasoningContainer, chatBubble.firstChild);
            
            // 添加切换显示/隐藏的点击事件
            this.attachReasoningToggleEvent(reasoningHeader, reasoningContainer);
        }
        
        // 更新思考内容
        const reasoningContentDiv = reasoningContainer.querySelector('.reasoning-content');
        if (reasoningContentDiv) {
            // 累加原始内容
            if (!reasoningContentDiv.dataset.rawContent) {
                reasoningContentDiv.dataset.rawContent = '';
            }
            reasoningContentDiv.dataset.rawContent += reasoningText;
            
            // 处理内容并渲染
            const processedContent = reasoningContentDiv.dataset.rawContent
                .replace(/\n/g, '\n')
                .replace(/\s/g, function(match) {
                    return match;
                });
            
            reasoningContentDiv.innerHTML = this.parseMarkdown(processedContent);
            
            // 处理代码高亮
            this.processCodeBlocks(reasoningContentDiv);
            
            // 如果容器未折叠，滚动到底部
            if (!reasoningContainer.classList.contains('collapsed')) {
                reasoningContentDiv.scrollTop = reasoningContentDiv.scrollHeight;
            }
        }
        
        // 计算并更新思考时间显示 - 只有在思考未结束时才更新思考时间
        if (messageDiv.dataset.thinkingStartTime && messageDiv.dataset.reasoningEnded !== "true") {
            const thinkingElapsedSeconds = Math.round((Date.now() - parseInt(messageDiv.dataset.thinkingStartTime)) / 1000);
            
            // 更新思考时间显示
            const thinkingTimeSpan = reasoningContainer.querySelector('.thinking-time span');
            if (thinkingTimeSpan) {
                thinkingTimeSpan.textContent = `${thinkingElapsedSeconds}秒`;
            }
            
            // 同时保存到数据属性中，确保其他地方可以获取到最新的思考时间
            reasoningContainer.dataset.thinkingTime = thinkingElapsedSeconds.toString();
            messageDiv.dataset.aiThinkingTime = thinkingElapsedSeconds.toString();
        }
    },
    
    // 绑定思考框的切换事件
    attachReasoningToggleEvent(header, container) {
        if (!header || !container) return;
        
        // 移除可能存在的旧事件
        const newHeader = header.cloneNode(true);
        if (header.parentNode) {
            header.parentNode.replaceChild(newHeader, header);
        }
        
        // 添加新的事件监听
        newHeader.addEventListener('click', function(event) {
            event.stopPropagation(); // 阻止冒泡
            
            container.classList.toggle('collapsed');
            
            // 调整内容高度
            const content = container.querySelector('.reasoning-content');
            if (content) {
                if (container.classList.contains('collapsed')) {
                    content.style.maxHeight = '0px';
                    content.style.paddingTop = '0px';
                    content.style.paddingBottom = '0px';
                } else {
                    content.style.maxHeight = '300px';
                    content.style.paddingTop = '12px';
                    content.style.paddingBottom = '12px';
                }
            }
        });
        
        return newHeader;
    },
    
    // 完成AI消息处理
    finalizeAIMessage(messageDiv) {
        // 确保思考状态被移除
        this.hideThinking(messageDiv);
        
        // 移除打字效果光标
        const cursor = messageDiv.querySelector('.cursor');
        if (cursor) cursor.remove();
        
        // 处理思考框
        const reasoningContainer = messageDiv.querySelector('.reasoning-container');
        if (reasoningContainer) {
            // 更新标题
            const headerText = reasoningContainer.querySelector('.reasoning-header .title-text');
            if (headerText && headerText.textContent === 'AI正在思考中...') {
                headerText.textContent = '查看AI思考过程';
            }
            
            // 使用已保存的思考时间，如果存在的话
            if (!messageDiv.dataset.reasoningEnded) {
                // 如果还没有设置思考结束标记，更新思考时间
                const thinkingTime = reasoningContainer.querySelector('.thinking-time span');
                if (thinkingTime && messageDiv.dataset.thinkingStartTime) {
                    // 使用已保存的思考时间，或者计算当前思考时间
                    let elapsedThinkingTime;
                    
                    if (messageDiv.dataset.aiThinkingTime) {
                        // 优先使用已保存的思考时间
                        elapsedThinkingTime = parseInt(messageDiv.dataset.aiThinkingTime);
                    } else {
                        // 计算思考时间
                        const thinkingEndTime = Date.now();
                        elapsedThinkingTime = Math.round((thinkingEndTime - parseInt(messageDiv.dataset.thinkingStartTime)) / 1000);
                        
                        // 保存计算结果
                        messageDiv.dataset.aiThinkingTime = elapsedThinkingTime.toString();
                        reasoningContainer.dataset.thinkingTime = elapsedThinkingTime.toString();
                    }
                    
                    // 更新显示
                    thinkingTime.textContent = `${elapsedThinkingTime}秒`;
                    console.log('最终思考时间:', elapsedThinkingTime, '秒');
                }
                
                // 设置思考结束标记
                messageDiv.dataset.reasoningEnded = "true";
            }
            
            // 消息完成后折叠思考框
            reasoningContainer.classList.add('collapsed');
            
            // 调整高度
            const reasoningContent = reasoningContainer.querySelector('.reasoning-content');
            if (reasoningContent) {
                reasoningContent.style.maxHeight = '0px';
                reasoningContent.style.paddingTop = '0px';
                reasoningContent.style.paddingBottom = '0px';
            }
            
            // 更新点击事件
            const reasoningHeader = reasoningContainer.querySelector('.reasoning-header');
            if (reasoningHeader) {
                this.attachReasoningToggleEvent(reasoningHeader, reasoningContainer);
            }
        }
        
        // 确保消息信息区域可见
        const messageInfo = messageDiv.querySelector('.message-info');
        if (messageInfo) {
            messageInfo.classList.remove('hidden');
        }
        
        // 应用代码高亮
        const markdownDiv = messageDiv.querySelector('.markdown-content');
        if (markdownDiv) {
            this.processCodeBlocks(markdownDiv);
        }
    },
    
    // 不更新时间的消息完成方法
    finalizeAIMessageWithoutTimeUpdate(messageDiv) {
        // 移除打字效果光标
        const cursor = messageDiv.querySelector('.cursor');
        if (cursor) cursor.remove();
        
        // 处理思考框
        const reasoningContainer = messageDiv.querySelector('.reasoning-container');
        if (reasoningContainer) {
            // 更新标题
            const headerText = reasoningContainer.querySelector('.reasoning-header .title-text');
            if (headerText && headerText.textContent === 'AI正在思考中...') {
                headerText.textContent = '查看AI思考过程';
            }
            
            // 消息完成后折叠思考框
            reasoningContainer.classList.add('collapsed');
            
            // 调整高度
            const reasoningContent = reasoningContainer.querySelector('.reasoning-content');
            if (reasoningContent) {
                reasoningContent.style.maxHeight = '0px';
                reasoningContent.style.paddingTop = '0px';
                reasoningContent.style.paddingBottom = '0px';
            }
            
            // 更新点击事件
            const reasoningHeader = reasoningContainer.querySelector('.reasoning-header');
            if (reasoningHeader) {
                this.attachReasoningToggleEvent(reasoningHeader, reasoningContainer);
            }
        }
        
        // 确保消息信息区域可见
        const messageInfo = messageDiv.querySelector('.message-info');
        if (messageInfo) {
            messageInfo.classList.remove('hidden');
        }
        
        // 应用代码高亮
        const markdownDiv = messageDiv.querySelector('.markdown-content');
        if (markdownDiv) {
            this.processCodeBlocks(markdownDiv);
        }
        
        console.log('完成消息处理（跳过时间更新）');
    },
    
    // 显示AI思考状态
    showThinking(messageDiv) {
        if (!messageDiv) return;
        
        console.log('显示AI思考状态');
        
        const chatBubble = messageDiv.querySelector('.chat-bubble');
        if (!chatBubble) return;
        
        // 检查是否已经有思考状态
        if (!chatBubble.querySelector('.ai-thinking')) {
            // 添加思考中状态
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'ai-thinking';
            thinkingDiv.innerHTML = '<div class="thinking-spinner"></div>AI正在思考中...';
            
            // 如果有Markdown内容，先清除
            const markdownContent = chatBubble.querySelector('.markdown-content');
            if (markdownContent) {
                markdownContent.remove();
            }
            
            // 添加到气泡前面
            const messageInfo = chatBubble.querySelector('.message-info');
            if (messageInfo) {
                chatBubble.insertBefore(thinkingDiv, messageInfo);
            } else {
                chatBubble.appendChild(thinkingDiv);
            }
        }
        
        // 记录思考开始时间
        messageDiv.dataset.thinkingStartTime = Date.now().toString();
        
        // 标记思考未结束
        messageDiv.dataset.reasoningEnded = "false";
    },
    
    // 隐藏AI思考状态
    hideThinking(messageDiv) {
        if (!messageDiv) return;
        
        const chatBubble = messageDiv.querySelector('.chat-bubble');
        if (!chatBubble) return;
        
        // 查找思考状态元素
        const thinkingDiv = chatBubble.querySelector('.ai-thinking');
        if (thinkingDiv) {
            // 移除思考状态
            thinkingDiv.remove();
        }
        
        // 如果已记录思考开始时间，计算思考时间
        if (messageDiv.dataset.thinkingStartTime && !messageDiv.dataset.reasoningEnded) {
            const thinkingEndTime = Date.now();
            const elapsedThinkingTime = Math.round((thinkingEndTime - parseInt(messageDiv.dataset.thinkingStartTime)) / 1000);
            
            // 保存思考时间数据
            messageDiv.dataset.aiThinkingTime = elapsedThinkingTime.toString();
            
            // 更新思考容器的时间显示
            const reasoningContainer = chatBubble.querySelector('.reasoning-container');
            if (reasoningContainer) {
                const thinkingTimeSpan = reasoningContainer.querySelector('.thinking-time span');
                if (thinkingTimeSpan) {
                    thinkingTimeSpan.textContent = `${elapsedThinkingTime}秒`;
                }
                
                // 更新标题
                const headerText = reasoningContainer.querySelector('.reasoning-header .title-text');
                if (headerText && headerText.textContent === 'AI正在思考中...') {
                    headerText.textContent = '查看AI思考过程';
                }
            }
            
            // 标记思考已结束
            messageDiv.dataset.reasoningEnded = "true";
        }
    },
    
    /**
     * 添加工具调用区块到AI消息中
     * @param {HTMLElement} messageDiv - AI消息元素
     * @param {Object} toolInfo - 工具调用信息
     * @param {string} toolInfo.name - 工具名称
     * @param {Object|string} toolInfo.args - 工具参数
     * @param {string} [toolInfo.id] - 工具调用ID，可选
     * @returns {HTMLElement} - 创建的工具调用元素
     */
    addToolCall(messageDiv, toolInfo) {
        if (!messageDiv) return null;
        
        const chatBubble = messageDiv.querySelector('.chat-bubble');
        if (!chatBubble) return null;
        
        // 创建工具调用容器
        const toolCall = document.createElement('div');
        toolCall.className = 'tool-call collapsed'; // 添加collapsed类使其默认折叠
        toolCall.dataset.toolName = toolInfo.name;
        if (toolInfo.id) {
            toolCall.dataset.toolId = toolInfo.id;
        }
        
        // 工具调用头部（名称和图标以及状态显示）
        const toolHeader = document.createElement('div');
        toolHeader.className = 'tool-call-header';
        
        // 创建左侧标题部分
        const toolTitle = document.createElement('div');
        toolTitle.className = 'tool-call-title';
        toolTitle.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            调用工具: <strong>${toolInfo.name}</strong>
            <div class="tool-call-toggle" title="折叠/展开结果">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
        `;
        
        // 创建右侧状态显示部分
        const toolStatus = document.createElement('div');
        toolStatus.className = 'tool-call-status';
        toolStatus.innerHTML = `<div class="status-indicator"></div>执行中...`;
        
        // 将标题和状态添加到头部
        toolHeader.appendChild(toolTitle);
        toolHeader.appendChild(toolStatus);
        toolCall.appendChild(toolHeader);
        
        // 创建内容容器（用于折叠/展开）
        const contentContainer = document.createElement('div');
        contentContainer.className = 'tool-call-content';
        toolCall.appendChild(contentContainer);
        
        // 工具参数区域
        const argsDiv = document.createElement('div');
        argsDiv.className = 'tool-call-args';
        
        // 将参数格式化为JSON字符串并美化显示
        let argsStr = '';
        try {
            // 尝试解析参数
            if (typeof toolInfo.args === 'string') {
                // 如果参数是字符串，尝试解析为JSON
                if (toolInfo.args.trim().startsWith('{') || toolInfo.args.trim().startsWith('[')) {
                    try {
                        const parsed = JSON.parse(toolInfo.args);
                        argsStr = JSON.stringify(parsed, null, 2);
                    } catch {
                        // 如果无法解析为JSON，直接显示原始字符串
                        argsStr = toolInfo.args;
                    }
                } else {
                    argsStr = toolInfo.args;
                }
            } else if (typeof toolInfo.args === 'object') {
                // 如果参数已经是对象，直接格式化
                argsStr = JSON.stringify(toolInfo.args, null, 2);
            } else {
                // 如果参数格式不确定，尝试直接字符串化
                argsStr = String(toolInfo.args || '{}');
            }
        } catch (e) {
            console.error('解析工具参数失败:', e);
            argsStr = typeof toolInfo.args === 'string' ? toolInfo.args : JSON.stringify(toolInfo.args || '{}');
        }
        
        // 检查参数是否为空，如果是则显示加载提示
        if (!argsStr) {
            argsDiv.innerHTML = '<div class="args-loading">正在接收参数...</div>';
        } else {
            argsDiv.textContent = argsStr;
        }
        
        contentContainer.appendChild(argsDiv);
        
        // 结果区域 - 初始为空，将在获取结果后更新
        const resultDiv = document.createElement('div');
        resultDiv.className = 'tool-call-result';
        resultDiv.innerHTML = '<div class="thinking-spinner"></div>执行中...';
        contentContainer.appendChild(resultDiv);
        
        // 添加到消息中
        // 查找合适的位置 - 如果有markdown-content，添加在它之前
        const markdownContent = chatBubble.querySelector('.markdown-content');
        const messageInfo = chatBubble.querySelector('.message-info');
        
        if (markdownContent) {
            chatBubble.insertBefore(toolCall, markdownContent);
        } else if (messageInfo) {
            chatBubble.insertBefore(toolCall, messageInfo);
        } else {
            chatBubble.appendChild(toolCall);
        }
        
        // 添加折叠/展开事件处理
        const toggleButton = toolCall.querySelector('.tool-call-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止事件冒泡
                toolCall.classList.toggle('collapsed');
            });
        }
        
        // 滚动到底部
        if (window.AIChatApp.elements.chatMessages) {
            window.AIChatApp.elements.chatMessages.scrollTop = window.AIChatApp.elements.chatMessages.scrollHeight;
        }
        
        return toolCall;
    },
    
    /**
     * 更新工具调用结果
     * @param {HTMLElement} messageDiv - 要更新的消息元素
     * @param {string} toolName - 工具名称
     * @param {any} result - 工具调用结果
     * @param {boolean} [isError=false] - 是否是错误结果
     * @param {number} [index=-1] - 工具调用在消息中的索引
     * @param {string} [toolId=null] - 工具调用ID
     * @param {number} [executionTime=null] - 执行时间(毫秒)
     * @param {Object} [tokenUsage] - Token使用情况，包含{promptTokens, completionTokens, totalTokens}
     */
    updateToolCallResult(messageDiv, toolName, result, isError = false, index = -1, toolId = null, executionTime = null, tokenUsage = null) {
        if (!messageDiv) return;
        
        console.log(`工具 ${toolName} token使用情况:`, tokenUsage);
        
        // 查找工具调用元素
        const toolCallElements = messageDiv.querySelectorAll('.tool-call');
        if (!toolCallElements.length) return;
        
        // 找到要更新的工具调用元素
        let targetToolCall;
        if (index >= 0 && toolCallElements.length > index) {
            targetToolCall = toolCallElements[index];
        } else if (toolId) {
            // 通过ID查找
            targetToolCall = Array.from(toolCallElements).find(el => el.dataset.toolId === toolId);
        } else {
            // 默认使用最后一个
            targetToolCall = toolCallElements[toolCallElements.length - 1];
        }
        
        if (!targetToolCall) return;
        
        // 查找或创建结果容器
        let resultDiv = targetToolCall.querySelector('.tool-call-result');
        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.className = 'tool-call-result';
            targetToolCall.appendChild(resultDiv);
        }
        
        // 转换结果为字符串
        let resultStr = '';
        if (result === null || result === undefined) {
            resultStr = '';
        } else if (typeof result === 'object') {
            try {
                resultStr = JSON.stringify(result, null, 2);
            } catch (error) {
                resultStr = String(result);
            }
        } else {
            resultStr = String(result);
        }
        
        // 构建结果HTML
        let resultHtml = '';
        
        // 使用不同样式显示错误结果
        if (isError) {
            resultHtml = `<strong class="error">错误:</strong><pre class="error-result">${resultStr}</pre>`;
            resultDiv.classList.add('error');
        } else {
            resultHtml = `<strong>结果:</strong><pre>${resultStr}</pre>`;
            resultDiv.classList.remove('error');
        }
        
        // 注意：详细的Token使用信息在结果区域已被移除
        
        // 更新HTML内容
        resultDiv.innerHTML = resultHtml;
        
        // 更新状态显示
        const statusDiv = targetToolCall.querySelector('.tool-call-status');
        if (statusDiv) {
            let statusHtml = '';
            
            // 执行状态指示器和文本
            if (isError) {
                statusHtml += `
                    <div class="status-indicator error"></div>
                    <span class="status-error">调用失败</span>
                `;
            } else {
                statusHtml += `
                    <div class="status-indicator success"></div>
                    <span class="status-success">调用成功</span>
                `;
            }
            
            // 执行时间显示 (始终显示，即使折叠)
            if (executionTime !== null && executionTime !== undefined) {
                const timeText = executionTime < 1000 
                    ? `${executionTime}ms` 
                    : `${(executionTime / 1000).toFixed(2)}s`;
                statusHtml += `<span class="tool-execution-time">${timeText}</span>`;
                
                // 保存执行时间到dataset以供其他地方使用
                targetToolCall.dataset.executionTime = executionTime;
            }
            
            // Token消耗显示 (简化版显示在状态栏)
            if (tokenUsage && tokenUsage.totalTokens) {
                statusHtml += `<span class="tool-token-usage" title="输入: ${tokenUsage.promptTokens || 0}|输出: ${tokenUsage.completionTokens || 0}">tokens:${tokenUsage.totalTokens}</span>`;
                
                // 保存token消耗到dataset以供其他地方使用
                targetToolCall.dataset.tokenUsage = tokenUsage.totalTokens;
            }
            
            statusDiv.innerHTML = statusHtml;
        }
        
        // 滚动到底部
        if (window.AIChatApp.elements.chatMessages) {
            window.AIChatApp.elements.chatMessages.scrollTop = window.AIChatApp.elements.chatMessages.scrollHeight;
        }
    },
    
    /**
     * 更新主要内容区域
     * 工具调用信息将保留，仅更新markdown内容部分
     */
    updateMainContent(messageDiv, text) {
        if (!messageDiv) return;
        
        const chatBubble = messageDiv.querySelector('.chat-bubble');
        if (!chatBubble) return;
        
        // 确保思考状态已移除
        const thinkingIndicator = chatBubble.querySelector('.ai-thinking');
        if (thinkingIndicator) {
            this.hideThinking(messageDiv);
        }
        
        // 查找或创建markdown内容区域
        let markdownDiv = chatBubble.querySelector('.markdown-content:not(.reasoning-content)');
        if (!markdownDiv) {
            markdownDiv = document.createElement('div');
            markdownDiv.className = 'markdown-content';
            
            // 添加到合适的位置 - 在所有工具调用之后、消息信息之前
            const messageInfo = chatBubble.querySelector('.message-info');
            if (messageInfo) {
                chatBubble.insertBefore(markdownDiv, messageInfo);
            } else {
                chatBubble.appendChild(markdownDiv);
            }
        }
        
        // 更新markdown内容
        markdownDiv.innerHTML = this.parseMarkdown(text);
        
        // 应用代码高亮
        this.processCodeBlocks(markdownDiv);
        
        // 确保光标存在
        let cursor = chatBubble.querySelector('.cursor');
        if (!cursor) {
            cursor = document.createElement('span');
            cursor.className = 'cursor';
            chatBubble.insertBefore(cursor, chatBubble.querySelector('.message-info'));
        }
        
        // 滚动到底部
        if (window.AIChatApp.elements.chatMessages) {
            window.AIChatApp.elements.chatMessages.scrollTop = window.AIChatApp.elements.chatMessages.scrollHeight;
        }
    },
    
    // 显示历史记录模态窗口
    showHistoryModal() {
        const modal = document.getElementById('history-modal');
        if (!modal) {
            console.error('找不到历史记录模态窗口');
            return;
        }
        
        // 显示模态窗口
        modal.style.display = 'block';
        
        // 设置关闭按钮事件
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        // 点击模态窗口外部区域关闭
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        // 加载会话列表
        this.loadSessionList();
    },
    
    // 加载会话列表
    loadSessionList() {
        // 获取当前供应商
        const currentProvider = window.AIChatApp.elements.provider
            ? window.AIChatApp.elements.provider.value 
            : '未知供应商';
        
        // 获取会话列表容器
        const sessionsContainer = document.getElementById('sessions-container');
        if (!sessionsContainer) {
            console.error('找不到会话列表容器');
            return;
        }
        
        // 显示加载中状态
        sessionsContainer.innerHTML = '<div class="loading-sessions">正在加载会话列表...</div>';
        
        // 更新会话列表标题
        const listHeader = document.querySelector('.session-list-header h3');
        if (listHeader) {
            listHeader.textContent = `${currentProvider} 会话列表`;
        }
        
        // 从数据库加载会话，传入当前供应商以过滤结果
        window.AIChatData.getAllChatSessions(currentProvider)
            .then(sessions => {
                if (sessions.length === 0) {
                    sessionsContainer.innerHTML = '<div class="no-sessions">暂无聊天会话</div>';
                    return;
                }
                
                this.renderSessionList(sessions);
                
                // 设置搜索功能
                this.setupSessionSearch();
            })
            .catch(error => {
                console.error('加载会话列表失败:', error);
                sessionsContainer.innerHTML = `<div class="loading-sessions error">加载会话列表失败: ${error.message}</div>`;
            });
    },
    
    // 渲染会话列表
    renderSessionList(sessions) {
        const sessionsContainer = document.getElementById('sessions-container');
        if (!sessionsContainer) return;
        
        // 如果没有会话，显示提示信息
        if (sessions.length === 0) {
            sessionsContainer.innerHTML = '<div class="loading-sessions">暂无聊天会话</div>';
            return;
        }
        
        // 清空列表
        sessionsContainer.innerHTML = '';
        
        // 创建会话项
        sessions.forEach(session => {
            try {
                // 验证会话ID是否有效
                if (!session.id || session.id === 'session_NaN' || !session.id.startsWith('session_')) {
                    console.warn('跳过渲染无效会话ID:', session.id);
                    return; // 跳过这个会话
                }
                
                const sessionItem = document.createElement('div');
                sessionItem.className = 'session-item';
                sessionItem.dataset.sessionId = session.id;
                
                // 提取会话ID，不再截断而是完整显示
                // 移除session_前缀，使用完整ID
                const sessionIdDisplay = session.id.replace('session_', '');
                
                // 再次验证显示ID是否有效
                if (!sessionIdDisplay || sessionIdDisplay === 'NaN' || sessionIdDisplay === 'undefined') {
                    console.warn('会话显示ID无效:', sessionIdDisplay);
                    return; // 跳过这个会话
                }
                
                // 格式化日期，只保留日期和时间，省略毫秒
                let formattedDate = '未知时间';
                try {
                    formattedDate = new Date(session.timestamp).toLocaleString();
                    // 检查日期是否有效
                    if (formattedDate === 'Invalid Date') {
                        formattedDate = '未知时间';
                    }
                } catch (e) {
                    console.warn('日期格式化失败:', e);
                }
                
                sessionItem.innerHTML = `
                    <div class="session-name">会话: ${sessionIdDisplay}</div>
                    <div class="session-modal-info">
                        <span class="session-date">${formattedDate}</span>
                        <span class="session-count">${session.messageCount || 0} 条消息</span>
                    </div>
                `;
                
                // 添加点击事件
                sessionItem.addEventListener('click', () => {
                    // 移除其他会话的选中状态
                    sessionsContainer.querySelectorAll('.session-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    // 添加选中状态
                    sessionItem.classList.add('active');
                    
                    // 加载会话详情
                    this.loadSessionDetail(session.id);
                    
                    // 启用操作按钮
                    const loadButton = document.getElementById('load-session');
                    const deleteButton = document.getElementById('delete-session');
                    if (loadButton) loadButton.disabled = false;
                    if (deleteButton) deleteButton.disabled = false;
                });
                
                sessionsContainer.appendChild(sessionItem);
            } catch (error) {
                console.error('渲染会话项时出错:', error, '会话:', session);
                // 继续处理下一个会话，不中断循环
            }
        });
        
        // 检查是否有渲染出的会话
        if (sessionsContainer.childElementCount === 0) {
            sessionsContainer.innerHTML = '<div class="no-sessions">暂无有效的聊天会话</div>';
        }
    },
    
    // 设置会话搜索功能
    setupSessionSearch() {
        const searchInput = document.getElementById('session-search');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const sessionItems = document.querySelectorAll('.session-item');
            
            sessionItems.forEach(item => {
                const sessionName = item.querySelector('.session-name').textContent.toLowerCase();
                const sessionDate = item.querySelector('.session-date').textContent.toLowerCase();
                
                // 如果名称或日期包含搜索词，显示该项，否则隐藏
                if (sessionName.includes(searchTerm) || sessionDate.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    },
    
    // 加载会话详情
    loadSessionDetail(sessionId) {
        const sessionMessages = document.getElementById('session-messages');
        const sessionTitle = document.getElementById('session-detail-title');
        
        if (!sessionMessages || !sessionTitle) {
            console.error('找不到会话详情容器');
            return;
        }
        
        // 移除session_前缀并完整显示ID
        const sessionIdDisplay = sessionId.replace('session_', '');
        
        // 更新标题
        sessionTitle.textContent = `会话详情: ${sessionIdDisplay}`;
        
        // 显示加载中
        sessionMessages.innerHTML = '<div class="loading-sessions">正在加载会话消息...</div>';
        
        // 加载会话消息
        window.AIChatData.getSessionMessages(sessionId)
            .then(messages => {
                this.renderSessionMessages(messages, sessionId);
            })
            .catch(error => {
                console.error('加载会话消息失败:', error);
                sessionMessages.innerHTML = `<div class="loading-sessions error">加载会话消息失败: ${error.message}</div>`;
            });
    },
    
    // 渲染会话消息
    renderSessionMessages(messages, sessionId) {
        const sessionMessages = document.getElementById('session-messages');
        if (!sessionMessages) return;
        
        // 如果没有消息，显示提示信息
        if (messages.length === 0) {
            sessionMessages.innerHTML = '<div class="no-session-selected">此会话暂无消息</div>';
            return;
        }
        
        // 清空消息容器
        sessionMessages.innerHTML = '';
        
        // 添加每一条消息
        messages.forEach(message => {
            if (!message.role || !message.content) return;
            
            const messageItem = document.createElement('div');
            messageItem.className = 'session-message';
            
            // 根据消息角色设置不同样式
            const isUser = message.role === 'user';
            messageItem.style.backgroundColor = isUser ? '#f1f3f5' : '#fff';
            messageItem.style.borderLeft = isUser ? '3px solid #4dabf7' : '3px solid #69db7c';
            
            // 格式化时间
            const time = new Date(message.timestamp).toLocaleString();
            
            messageItem.innerHTML = `
                <div class="session-message-user">${isUser ? '用户' : 'AI'}</div>
                <div class="session-message-content">${message.content}</div>
                <div class="session-message-time">${time}</div>
            `;
            
            sessionMessages.appendChild(messageItem);
        });
        
        // 设置加载和删除会话按钮事件
        this.setupSessionActions(sessionId);
    },
    
    // 设置会话操作按钮事件
    setupSessionActions(sessionId) {
        // 设置按钮动作
        const loadButton = document.getElementById('load-session');
        const deleteButton = document.getElementById('delete-session');
        
        if (!loadButton || !deleteButton) {
            console.error('未找到会话操作按钮');
            return;
        }
        
        // 加载会话
        loadButton.onclick = async () => {
            // 移除确认对话框，直接执行加载操作
            try {
                // 获取会话详情
                const messages = await window.AIChatData.getSessionMessages(sessionId);
                console.log('获取到会话消息:', messages);
                
                // 验证消息数组
                if (!Array.isArray(messages)) {
                    console.error('会话数据结构错误:', messages);
                    throw new Error('会话数据结构错误');
                }
                
                if (messages.length === 0) {
                    console.warn('该会话没有消息记录');
                    window.AIChatApp.state.sessionId = sessionId;
                    window.AIChatApp.clearChat();
                    window.AIChatApp.updateSessionDisplay();
                    
                    // 隐藏模态窗口
                    const modal = document.getElementById('history-modal');
                    modal.style.display = 'none';
                    
                    this.showTooltip('已加载空会话');
                    return;
                }
                
                // 清空当前聊天记录
                window.AIChatApp.clearChat();
                
                // 设置当前会话ID
                window.AIChatApp.state.sessionId = sessionId;
                
                // 更新会话显示
                window.AIChatApp.updateSessionDisplay();
                
                // 添加消息到聊天界面（仅显示最新的10条消息）
                const displayMessages = messages.slice(-10);
                displayMessages.forEach(msg => {
                    if (msg.role === 'user') {
                        this.addUserMessage(msg.content);
                    } else if (msg.role === 'assistant') {
                        const aiMessage = this.addAIMessage(msg.content);
                        this.finalizeAIMessageWithoutTimeUpdate(aiMessage);
                    }
                });
                
                // 隐藏模态窗口
                const modal = document.getElementById('history-modal');
                modal.style.display = 'none';
                
                this.showTooltip('已加载会话');
            } catch (error) {
                console.error('加载会话失败:', error);
                this.showTooltip('加载会话失败: ' + error.message);
            }
        };
        
        // 删除会话
        deleteButton.onclick = async () => {
            // 使用自定义确认对话框替代系统confirm
            this.showConfirm({
                title: '删除确认',
                message: '确定要删除此会话吗？此操作无法撤销！',
                okText: '删除',
                cancelText: '取消',
                onConfirm: async () => {
                    try {
                        // 从数据库中删除会话
                        await window.AIChatData.deleteSessionMessages(sessionId);
                        
                        // 刷新会话列表
                        this.loadSessionList();
                        
                        // 清空详情区域
                        const sessionMessages = document.getElementById('session-messages');
                        sessionMessages.innerHTML = `<div class="no-session-selected">请从左侧选择一个会话</div>`;
                        
                        // 禁用按钮
                        loadButton.disabled = true;
                        deleteButton.disabled = true;
                        
                        // 更新标题
                        document.getElementById('session-detail-title').textContent = '会话详情';
                        
                        this.showTooltip('已删除会话');
                        
                        // 自动加载当前供应商的最新会话
                        window.AIChatData.loadLatestProviderSession()
                            .then(() => {
                                // 更新会话显示
                                window.AIChatApp.updateSessionDisplay();
                                
                                // 关闭历史记录模态窗口
                                const modal = document.getElementById('history-modal');
                                if (modal) {
                                    modal.style.display = 'none';
                                }
                                
                                this.showTooltip('已加载最新会话');
                            })
                            .catch(error => {
                                console.error('自动加载最新会话失败:', error);
                                this.showTooltip('加载最新会话失败，请手动选择会话');
                            });
                    } catch (error) {
                        console.error('删除会话失败:', error);
                        this.showTooltip('删除会话失败: ' + error.message);
                    }
                }
            });
        };
    },
    
    // 显示设置面板
    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (!modal) {
            console.error('设置模态窗口未找到');
            return;
        }
        
        modal.style.display = 'block';
        
        // 为关闭按钮设置事件
        document.querySelector('#settings-modal .close').onclick = () => {
            modal.style.display = 'none';
            this.saveSettings();
        };
        
        // 点击模态窗口外部时关闭
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                this.saveSettings();
            }
        };
        
        // 重置设置按钮事件
        const resetBtn = document.getElementById('reset-settings');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.resetSettings();
                this.showTooltip('设置已重置为默认值');
            };
        }
    },
    
    // 显示快捷消息模态窗口
    showQuickMessagesModal() {
        window.AIChatQuickMessage.showQuickMessagesModal();
    },

    // 在已有聊天内容后追加显示快捷消息气泡
    showAppendedQuickMessages() {
        window.AIChatQuickMessage.showAppendedQuickMessages();
    },
    
    // 显示随机快捷消息气泡
    showRandomQuickMessages() {
        window.AIChatQuickMessage.showRandomQuickMessages();
    },

    // 保存设置
    saveSettings() {
        // 获取设置值
        const app = window.AIChatApp;
        const elements = app.elements;
        
        // 更新响应模式设置
        app.state.isStreamMode = elements.modeStream.checked;
        
        // 更新UI以反映新的模式设置
        app.UI.updateUIForMode();
        
        // 更新模型设置
        app.state.model = elements.model.value;
        app.state.temperature = parseFloat(elements.temperature.value);
        app.state.maxTokens = parseInt(elements.maxTokens.value);
        
        // 更新工具设置
        app.state.enableMCPTools = elements.enableMCPTools.checked;
        app.state.enableParamValidation = elements.enableParamValidation.checked;
        
        // 更新历史消息设置
        app.state.enableMessageHistory = elements.enableMessageHistory.checked;
        app.state.messageHistoryCount = parseInt(elements.messageHistoryCount.value);
        
        // 保存到本地存储
        try {
            const settings = {
                isStreamMode: app.state.isStreamMode,
                model: app.state.model,
                temperature: app.state.temperature,
                maxTokens: app.state.maxTokens,
                enableMCPTools: app.state.enableMCPTools,
                enableParamValidation: app.state.enableParamValidation,
                enableMessageHistory: app.state.enableMessageHistory,
                messageHistoryCount: app.state.messageHistoryCount
            };
            
            localStorage.setItem('aiChatSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('保存设置到本地存储失败:', error);
        }
    },
    
    // 重置设置为默认值
    resetSettings() {
        const app = window.AIChatApp;
        const elements = app.elements;
        
        // 重置为默认值
        elements.modeStream.checked = true;
        elements.modeRegular.checked = false;
        elements.temperature.value = 0.7;
        elements.maxTokens.value = 2048;
        elements.enableMCPTools.checked = true;
        elements.enableParamValidation.checked = false;
        elements.enableMessageHistory.checked = false;
        elements.messageHistoryCount.value = 3;
        
        // 保存设置
        this.saveSettings();
    },
    
    // 加载设置
    loadSettings() {
        try {
            const settingsJson = localStorage.getItem('aiChatSettings');
            if (!settingsJson) return;
            
            const settings = JSON.parse(settingsJson);
            const app = window.AIChatApp;
            const elements = app.elements;
            
            // 应用响应模式设置
            if (typeof settings.isStreamMode === 'boolean') {
                elements.modeStream.checked = settings.isStreamMode;
                elements.modeRegular.checked = !settings.isStreamMode;
                app.state.isStreamMode = settings.isStreamMode;
                
                // 更新UI以反映加载的模式设置
                app.UI.updateUIForMode();
            }
            
            // 应用设置
            if (settings.model && elements.model.querySelector(`option[value="${settings.model}"]`)) {
                elements.model.value = settings.model;
            }
            
            if (typeof settings.temperature === 'number') {
                elements.temperature.value = settings.temperature;
            }
            
            if (typeof settings.maxTokens === 'number') {
                elements.maxTokens.value = settings.maxTokens;
            }
            
            if (typeof settings.enableMCPTools === 'boolean') {
                elements.enableMCPTools.checked = settings.enableMCPTools;
                app.state.enableMCPTools = settings.enableMCPTools;
            }
            
            if (typeof settings.enableParamValidation === 'boolean') {
                elements.enableParamValidation.checked = settings.enableParamValidation;
                app.state.enableParamValidation = settings.enableParamValidation;
            }
            
            if (typeof settings.enableMessageHistory === 'boolean') {
                elements.enableMessageHistory.checked = settings.enableMessageHistory;
                app.state.enableMessageHistory = settings.enableMessageHistory;
            }
            
            if (typeof settings.messageHistoryCount === 'number') {
                elements.messageHistoryCount.value = settings.messageHistoryCount;
                app.state.messageHistoryCount = settings.messageHistoryCount;
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    },
}; 