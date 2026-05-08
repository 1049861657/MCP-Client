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
        let htmlContent = marked.parse(text);
        
        htmlContent = this.processTablesInHtml(htmlContent);
        htmlContent = this.detectAndReplaceImageUrls(htmlContent);
        
        setTimeout(() => this.bindTableWheelEvents(), 0);
        
        return htmlContent;
    },
    
    // 处理HTML中的表格，添加滚动容器和智能单元格处理
    processTablesInHtml(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        tempDiv.querySelectorAll('table').forEach(table => {
            if (table.parentElement && table.parentElement.classList.contains('table-container')) {
                return;
            }
            
            const tableContainer = document.createElement('div');
            tableContainer.className = 'table-container';
            
            table.parentNode.insertBefore(tableContainer, table);
            tableContainer.appendChild(table);
            
            this.processTableCells(table);
            
            const containerId = 'table-container-' + Math.random().toString(36).substring(2, 15);
            tableContainer.id = containerId;
            tableContainer.setAttribute('data-needs-wheel-handler', 'true');
        });
        
        return tempDiv.innerHTML;
    },
    
    // 处理表格单元格，添加智能分类和悬停提示
    processTableCells(table) {
        table.querySelectorAll('td').forEach(cell => {
            const text = cell.textContent.trim();
            
            if (!text) return;
            
            if (text.length > 20) {
                cell.setAttribute('title', text);
                
                cell.addEventListener('mouseenter', function(e) {
                    if (document.getElementById('cell-tooltip')) {
                        document.body.removeChild(document.getElementById('cell-tooltip'));
                    }
                    
                    const tooltip = document.createElement('div');
                    tooltip.id = 'cell-tooltip';
                    tooltip.textContent = text;
                    tooltip.style.position = 'absolute';
                    tooltip.style.backgroundColor = '#ffffff';
                    tooltip.style.border = '1px solid #dfe2e5';
                    tooltip.style.borderRadius = '4px';
                    tooltip.style.padding = '8px 12px';
                    tooltip.style.maxWidth = '300px';
                    tooltip.style.maxHeight = '200px';
                    tooltip.style.overflowY = 'auto';
                    tooltip.style.zIndex = '1000';
                    tooltip.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                    tooltip.style.whiteSpace = 'normal';
                    tooltip.style.wordBreak = 'break-word';
                    tooltip.style.fontSize = '14px';
                    tooltip.style.lineHeight = '1.5';
                    
                    const rect = cell.getBoundingClientRect();
                    const left = Math.min(rect.left, window.innerWidth - 310);
                    const top = rect.bottom + window.scrollY;
                    
                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                    
                    document.body.appendChild(tooltip);
                    
                    cell._tooltip = tooltip;
                });
                
                cell.addEventListener('mouseleave', function() {
                    if (cell._tooltip && document.body.contains(cell._tooltip)) {
                        document.body.removeChild(cell._tooltip);
                        cell._tooltip = null;
                    }
                });
                
                cell.classList.add('long-text');
                cell.setAttribute('data-truncated', 'true');
                cell.setAttribute('data-full-text', text);
            }
            
            if (this.isNumeric(text)) {
                cell.classList.add('number-cell');
            } else if (this.isDateTime(text)) {
                cell.classList.add('datetime-cell');
            }
        });
        
        table.querySelectorAll('th').forEach(header => {
            if (header.textContent.trim()) {
                header.setAttribute('title', header.textContent.trim());
            }
        });
    },
    
    isNumeric(text) {
        const cleanText = text.replace(/[,%\s]/g, '');
        return !isNaN(parseFloat(cleanText)) && isFinite(cleanText);
    },
    
    isDateTime(text) {
        return /^\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}/.test(text) || 
               /^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}/.test(text) || 
               /^\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}\s\d{1,2}:\d{1,2}/.test(text);
    },
    
    // 检测并替换HTML中的图片URL
    detectAndReplaceImageUrls(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const imgUrlRegex = /(https?:\/\/[^\s"'<>]+?\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s"'<>]*)?)/gi;
        
        function processNode(node) {
            for (let i = 0; i < node.childNodes.length; i++) {
                const child = node.childNodes[i];
                
                if (child.nodeType === 3) {
                    const content = child.nodeValue;
                    if (!content || !imgUrlRegex.test(content)) continue;
                    
                    imgUrlRegex.lastIndex = 0;
                    
                    const fragment = document.createDocumentFragment();
                    let lastIndex = 0;
                    let match;
                    
                    while ((match = imgUrlRegex.exec(content)) !== null) {
                        if (match.index > lastIndex) {
                            fragment.appendChild(document.createTextNode(
                                content.substring(lastIndex, match.index)));
                        }
                        
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'auto-detected-image';
                        
                        const img = document.createElement('img');
                        img.src = match[0];
                        img.alt = '图片';
                        img.loading = 'lazy';
                        img.onerror = function() {
                            this.onerror = null;
                            this.classList.add('image-load-error');
                        };
                        
                        imgContainer.appendChild(img);
                        fragment.appendChild(imgContainer);
                        
                        lastIndex = match.index + match[0].length;
                    }
                    
                    if (lastIndex < content.length) {
                        fragment.appendChild(document.createTextNode(
                            content.substring(lastIndex)));
                    }
                    
                    if (lastIndex > 0) {
                        node.replaceChild(fragment, child);
                        i--;
                    }
                } 
                else if (child.nodeType === 1 && 
                         child.tagName !== 'IMG' && 
                         !child.classList.contains('auto-detected-image')) {
                    processNode(child);
                }
            }
        }
        
        processNode(tempDiv);
        return tempDiv.innerHTML;
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
        window.AIChatApp.elements.chatMessages.scrollTop = window.AIChatApp.elements.chatMessages.scrollHeight;
        
        return messageDiv;
    },
    
    // 添加AI消息到对话框
    addAIMessage(text = '') {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message ai';
        messageDiv.dataset.aiMessage = true;
        
        let initialContent;
        if (text === '') {
            initialContent = '<div class="ai-thinking"><div class="thinking-spinner"></div>AI正在思考中...</div>';
        } else {
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
        window.AIChatApp.elements.chatMessages.scrollTop = window.AIChatApp.elements.chatMessages.scrollHeight;
        
        return messageDiv;
    },
    
    // 更新AI消息内容
    updateAIMessage(messageDiv, text) {
        const chatBubble = messageDiv.querySelector('.chat-bubble');
        if (!chatBubble) return;
        
        const messageInfo = chatBubble.querySelector(':scope > .message-info');
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
        
        const reasoningContainer = chatBubble.querySelector('.reasoning-container');
        
        const thinkingIndicator = chatBubble.querySelector('.ai-thinking');
        if (thinkingIndicator && text.trim() !== '') {
            this.hideThinking(messageDiv);
            
            let savedReasoningContainer = null;
            if (reasoningContainer) {
                savedReasoningContainer = reasoningContainer.cloneNode(true);
            }
            
            chatBubble.innerHTML = '';
            
            if (savedReasoningContainer) {
                chatBubble.appendChild(savedReasoningContainer);
                
                const reasoningHeader = savedReasoningContainer.querySelector('.reasoning-header');
                if (reasoningHeader) {
                    this.attachReasoningToggleEvent(reasoningHeader, savedReasoningContainer);
                }
            }
            
            const markdownDiv = document.createElement('div');
            markdownDiv.className = 'markdown-content';
            markdownDiv.innerHTML = this.parseMarkdown(text);
            chatBubble.appendChild(markdownDiv);
            
            this.processCodeBlocks(markdownDiv);
            
            chatBubble.appendChild(document.createElement('span')).className = 'cursor';
            
            const newMessageInfo = document.createElement('div');
            newMessageInfo.className = 'message-info';
            
            const newMessageTime = document.createElement('div');
            newMessageTime.className = 'message-time';
            newMessageTime.textContent = messageTimeContent || window.AIChatApp.timeManager.getTimeString();
            newMessageInfo.appendChild(newMessageTime);
            
            const newTokenInfo = document.createElement('div');
            newTokenInfo.className = 'token-info';
            newTokenInfo.textContent = tokenInfoContent || '';
            newMessageInfo.appendChild(newTokenInfo);
            
            chatBubble.appendChild(newMessageInfo);
        } else if (!thinkingIndicator) {
            const markdownDiv = chatBubble.querySelector(':scope > .markdown-content:not(.reasoning-content)');
            if (markdownDiv) {
                markdownDiv.innerHTML = this.parseMarkdown(text);
                this.processCodeBlocks(markdownDiv);
            } else {
                const markdownDiv = document.createElement('div');
                markdownDiv.className = 'markdown-content';
                markdownDiv.innerHTML = this.parseMarkdown(text);
                
                this.processCodeBlocks(markdownDiv);
                
                if (reasoningContainer) {
                    chatBubble.insertBefore(markdownDiv, reasoningContainer.nextSibling);
                } else if (messageInfo) {
                    chatBubble.insertBefore(markdownDiv, messageInfo);
                } else {
                    chatBubble.appendChild(markdownDiv);
                }
            }
        }
        
        window.AIChatApp.elements.chatMessages.scrollTop = window.AIChatApp.elements.chatMessages.scrollHeight;
    },
    
    // 处理代码块：添加高亮和语言标签
    processCodeBlocks(container) {
        container.querySelectorAll('pre code').forEach((block) => {
            const languageClass = Array.from(block.classList).find(cls => cls.startsWith('language-'));
            const language = languageClass ? languageClass.replace('language-', '') : 'text';
            
            if (languageClass && language !== 'plaintext') {
                const pre = block.parentElement;
                
                const langLabel = document.createElement('div');
                langLabel.className = 'code-language-label';
                langLabel.textContent = language;
                
                if (pre && !pre.querySelector('.code-language-label')) {
                    pre.insertBefore(langLabel, pre.firstChild);
                }
            }
            
            hljs.highlightElement(block);
        });
    },
    
    // 更新思考内容
    updateReasoningContent(messageDiv, reasoningText) {
        if (messageDiv.dataset.reasoningEnded === "true") return;
        
        const chatBubble = messageDiv.querySelector('.chat-bubble');
        if (!chatBubble) return;
        
        let reasoningContainer = chatBubble.querySelector('.reasoning-container');
        
        if (!messageDiv.dataset.thinkingStartTime) {
            messageDiv.dataset.thinkingStartTime = Date.now().toString();
        }
        
        if (!reasoningContainer) {
            reasoningContainer = document.createElement('div');
            reasoningContainer.className = 'reasoning-container';
            
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
            
            const reasoningContentDiv = document.createElement('div');
            reasoningContentDiv.className = 'reasoning-content markdown-content';
            reasoningContentDiv.dataset.rawContent = '';
            
            reasoningContainer.appendChild(reasoningHeader);
            reasoningContainer.appendChild(reasoningContentDiv);
            
            chatBubble.insertBefore(reasoningContainer, chatBubble.firstChild);
            
            this.attachReasoningToggleEvent(reasoningHeader, reasoningContainer);
        }
        
        const reasoningContentDiv = reasoningContainer.querySelector('.reasoning-content');
        if (reasoningContentDiv) {
            if (!reasoningContentDiv.dataset.rawContent) {
                reasoningContentDiv.dataset.rawContent = '';
            }
            reasoningContentDiv.dataset.rawContent += reasoningText;
            
            const processedContent = reasoningContentDiv.dataset.rawContent
                .replace(/\n/g, '\n')
                .replace(/\s/g, function(match) {
                    return match;
                });
            
            reasoningContentDiv.innerHTML = this.parseMarkdown(processedContent);
            
            this.processCodeBlocks(reasoningContentDiv);
            
            if (!reasoningContainer.classList.contains('collapsed')) {
                reasoningContentDiv.scrollTop = reasoningContentDiv.scrollHeight;
            }
        }
        
        if (messageDiv.dataset.thinkingStartTime && messageDiv.dataset.reasoningEnded !== "true") {
            const thinkingElapsedSeconds = Math.round((Date.now() - parseInt(messageDiv.dataset.thinkingStartTime)) / 1000);
            
            const thinkingTimeSpan = reasoningContainer.querySelector('.thinking-time span');
            if (thinkingTimeSpan) {
                thinkingTimeSpan.textContent = `${thinkingElapsedSeconds}秒`;
            }
            
            reasoningContainer.dataset.thinkingTime = thinkingElapsedSeconds.toString();
            messageDiv.dataset.aiThinkingTime = thinkingElapsedSeconds.toString();
        }
    },
    
    // 绑定思考框的切换事件
    attachReasoningToggleEvent(header, container) {
        if (!header || !container) return;
        
        const newHeader = header.cloneNode(true);
        if (header.parentNode) {
            header.parentNode.replaceChild(newHeader, header);
        }
        
        newHeader.addEventListener('click', function(event) {
            event.stopPropagation();
            
            container.classList.toggle('collapsed');
            
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
    finalizeAIMessage(messageDiv, updateTime = true) {
        this.hideThinking(messageDiv);
        
        const cursor = messageDiv.querySelector('.cursor');
        if (cursor) cursor.remove();
        
        const reasoningContainer = messageDiv.querySelector('.reasoning-container');
        if (reasoningContainer) {
            const headerText = reasoningContainer.querySelector('.reasoning-header .title-text');
            if (headerText && headerText.textContent === 'AI正在思考中...') {
                headerText.textContent = '查看AI思考过程';
            }
            
            if (updateTime && !messageDiv.dataset.reasoningEnded) {
                const thinkingTime = reasoningContainer.querySelector('.thinking-time span');
                if (thinkingTime && messageDiv.dataset.thinkingStartTime) {
                    let elapsedThinkingTime;
                    
                    if (messageDiv.dataset.aiThinkingTime) {
                        elapsedThinkingTime = parseInt(messageDiv.dataset.aiThinkingTime);
                    } else {
                        const thinkingEndTime = Date.now();
                        elapsedThinkingTime = Math.round((thinkingEndTime - parseInt(messageDiv.dataset.thinkingStartTime)) / 1000);
                        
                        messageDiv.dataset.aiThinkingTime = elapsedThinkingTime.toString();
                        reasoningContainer.dataset.thinkingTime = elapsedThinkingTime.toString();
                    }
                    
                    thinkingTime.textContent = `${elapsedThinkingTime}秒`;
                }
                
                messageDiv.dataset.reasoningEnded = "true";
            }
            
            reasoningContainer.classList.add('collapsed');
            
            const reasoningContent = reasoningContainer.querySelector('.reasoning-content');
            if (reasoningContent) {
                reasoningContent.style.maxHeight = '0px';
                reasoningContent.style.paddingTop = '0px';
                reasoningContent.style.paddingBottom = '0px';
            }
            
            const reasoningHeader = reasoningContainer.querySelector('.reasoning-header');
            if (reasoningHeader) {
                this.attachReasoningToggleEvent(reasoningHeader, reasoningContainer);
            }
        }
        
        const messageInfo = messageDiv.querySelector('.chat-bubble > .message-info');
        if (messageInfo) {
            messageInfo.classList.remove('hidden');
        }
        
        const markdownDiv = messageDiv.querySelector('.chat-bubble > .markdown-content:not(.reasoning-content)');
        if (markdownDiv) {
            this.processCodeBlocks(markdownDiv);
        }
    },
    
    // 显示AI思考状态
    showThinking(messageDiv) {
        if (!messageDiv) return;
        
        const chatBubble = messageDiv.querySelector('.chat-bubble');
        if (!chatBubble) return;
        
        if (!chatBubble.querySelector('.ai-thinking')) {
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'ai-thinking';
            thinkingDiv.innerHTML = '<div class="thinking-spinner"></div>AI正在思考中...';
            
            const markdownContent = chatBubble.querySelector(':scope > .markdown-content:not(.reasoning-content)');
            if (markdownContent) {
                markdownContent.remove();
            }
            
            const messageInfo = chatBubble.querySelector(':scope > .message-info');
            if (messageInfo) {
                chatBubble.insertBefore(thinkingDiv, messageInfo);
            } else {
                chatBubble.appendChild(thinkingDiv);
            }
        }
        
        messageDiv.dataset.thinkingStartTime = Date.now().toString();
        messageDiv.dataset.reasoningEnded = "false";
    },
    
    // 隐藏AI思考状态
    hideThinking(messageDiv) {
        if (!messageDiv) return;
        
        const chatBubble = messageDiv.querySelector('.chat-bubble');
        if (!chatBubble) return;
        
        const thinkingDiv = chatBubble.querySelector('.ai-thinking');
        if (thinkingDiv) {
            thinkingDiv.remove();
        }
        
        if (messageDiv.dataset.thinkingStartTime && !messageDiv.dataset.reasoningEnded) {
            const thinkingEndTime = Date.now();
            const elapsedThinkingTime = Math.round((thinkingEndTime - parseInt(messageDiv.dataset.thinkingStartTime)) / 1000);
            
            messageDiv.dataset.aiThinkingTime = elapsedThinkingTime.toString();
            
            const reasoningContainer = chatBubble.querySelector('.reasoning-container');
            if (reasoningContainer) {
                const thinkingTimeSpan = reasoningContainer.querySelector('.thinking-time span');
                if (thinkingTimeSpan) {
                    thinkingTimeSpan.textContent = `${elapsedThinkingTime}秒`;
                }
                
                const headerText = reasoningContainer.querySelector('.reasoning-header .title-text');
                if (headerText && headerText.textContent === 'AI正在思考中...') {
                    headerText.textContent = '查看AI思考过程';
                }
            }
            
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
        
        const toolCall = document.createElement('div');
        toolCall.className = 'tool-call collapsed';
        toolCall.dataset.toolName = toolInfo.name;
        if (toolInfo.id) {
            toolCall.dataset.toolId = toolInfo.id;
        }
        
        const toolHeader = document.createElement('div');
        toolHeader.className = 'tool-call-header';
        
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
        
        const toolStatus = document.createElement('div');
        toolStatus.className = 'tool-call-status';
        toolStatus.innerHTML = `<div class="status-indicator"></div>执行中...`;
        
        toolHeader.appendChild(toolTitle);
        toolHeader.appendChild(toolStatus);
        toolCall.appendChild(toolHeader);
        
        const contentContainer = document.createElement('div');
        contentContainer.className = 'tool-call-content';
        toolCall.appendChild(contentContainer);
        
        const argsDiv = document.createElement('div');
        argsDiv.className = 'tool-call-args';
        
        let argsStr = '';
        if (typeof toolInfo.args === 'string') {
            if (toolInfo.args.trim().startsWith('{') || toolInfo.args.trim().startsWith('[')) {
                try {
                    const parsed = JSON.parse(toolInfo.args);
                    argsStr = JSON.stringify(parsed, null, 2);
                } catch {
                    argsStr = toolInfo.args;
                }
            } else {
                argsStr = toolInfo.args;
            }
        } else if (typeof toolInfo.args === 'object') {
            argsStr = JSON.stringify(toolInfo.args, null, 2);
        } else {
            argsStr = String(toolInfo.args || '{}');
        }
        
        if (!argsStr) {
            argsDiv.innerHTML = '<div class="args-loading">正在接收参数...</div>';
        } else {
            argsDiv.textContent = argsStr;
        }
        
        contentContainer.appendChild(argsDiv);
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'tool-call-result';
        resultDiv.innerHTML = '<div class="thinking-spinner"></div>执行中...';
        contentContainer.appendChild(resultDiv);
        
        const markdownContent = chatBubble.querySelector(':scope > .markdown-content:not(.reasoning-content)');
        const messageInfo = chatBubble.querySelector(':scope > .message-info');
        
        if (markdownContent) {
            chatBubble.insertBefore(toolCall, markdownContent);
        } else if (messageInfo) {
            chatBubble.insertBefore(toolCall, messageInfo);
        } else {
            chatBubble.appendChild(toolCall);
        }
        
        const toggleButton = toolCall.querySelector('.tool-call-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', (e) => {
                e.stopPropagation();
                toolCall.classList.toggle('collapsed');
            });
        }
        
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
        
        const toolCallElements = messageDiv.querySelectorAll('.tool-call');
        if (!toolCallElements.length) return;
        
        let targetToolCall;
        if (index >= 0 && toolCallElements.length > index) {
            targetToolCall = toolCallElements[index];
        } else if (toolId) {
            targetToolCall = Array.from(toolCallElements).find(el => el.dataset.toolId === toolId);
        } else {
            targetToolCall = toolCallElements[toolCallElements.length - 1];
        }
        
        if (!targetToolCall) return;
        
        let resultDiv = targetToolCall.querySelector('.tool-call-result');
        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.className = 'tool-call-result';
            targetToolCall.appendChild(resultDiv);
        }
        
        let resultStr = '';
        if (result === null || result === undefined) {
            resultStr = '';
        } else if (typeof result === 'object') {
            resultStr = JSON.stringify(result, null, 2);
        } else {
            resultStr = String(result);
        }
        
        let resultHtml = '';
        
        if (isError) {
            resultHtml = `<strong class="error">错误:</strong><pre class="error-result">${resultStr}</pre>`;
            resultDiv.classList.add('error');
        } else {
            resultHtml = `<strong>结果:</strong><pre>${resultStr}</pre>`;
            resultDiv.classList.remove('error');
        }

        resultDiv.innerHTML = resultHtml;
        
        const statusDiv = targetToolCall.querySelector('.tool-call-status');
        if (statusDiv) {
            let statusHtml = '';
            
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
            
            if (executionTime !== null && executionTime !== undefined) {
                const timeText = executionTime < 1000 
                    ? `${executionTime}ms` 
                    : `${(executionTime / 1000).toFixed(2)}s`;
                statusHtml += `<span class="tool-execution-time">${timeText}</span>`;
                
                targetToolCall.dataset.executionTime = executionTime;
            }
            
            if (tokenUsage && tokenUsage.totalTokens) {
                statusHtml += `<span class="tool-token-usage" title="输入: ${tokenUsage.promptTokens || 0}|输出: ${tokenUsage.completionTokens || 0}">tokens:${tokenUsage.totalTokens}</span>`;
                
                targetToolCall.dataset.tokenUsage = tokenUsage.totalTokens;
            }
            
            statusDiv.innerHTML = statusHtml;
        }
        
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
        
        const thinkingIndicator = chatBubble.querySelector('.ai-thinking');
        if (thinkingIndicator) {
            this.hideThinking(messageDiv);
        }
        
        let markdownDiv = chatBubble.querySelector(':scope > .markdown-content:not(.reasoning-content)');
        if (!markdownDiv) {
            markdownDiv = document.createElement('div');
            markdownDiv.className = 'markdown-content';
            
            const footerInfo = chatBubble.querySelector(':scope > .message-info');
            if (footerInfo) {
                chatBubble.insertBefore(markdownDiv, footerInfo);
            } else {
                chatBubble.appendChild(markdownDiv);
            }
        }
        
        markdownDiv.innerHTML = this.parseMarkdown(text);
        
        this.processCodeBlocks(markdownDiv);
        
        let cursor = chatBubble.querySelector(':scope > .cursor');
        if (!cursor) {
            cursor = document.createElement('span');
            cursor.className = 'cursor';
            const footerInfo = chatBubble.querySelector(':scope > .message-info');
            if (footerInfo && footerInfo.parentNode === chatBubble) {
                chatBubble.insertBefore(cursor, footerInfo);
            } else {
                chatBubble.appendChild(cursor);
            }
        }
        
        if (window.AIChatApp.elements.chatMessages) {
            window.AIChatApp.elements.chatMessages.scrollTop = window.AIChatApp.elements.chatMessages.scrollHeight;
        }
    },
    
    // 显示历史记录模态窗口
    showHistoryModal() {
        const modal = document.getElementById('history-modal');
        if (!modal) return;
        
        modal.style.display = 'block';
        
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        this.loadSessionList();
    },
    
    // 加载会话列表
    loadSessionList() {
        const currentProvider = window.AIChatApp.elements.provider
            ? window.AIChatApp.elements.provider.value 
            : '未知供应商';
        
        const sessionsContainer = document.getElementById('sessions-container');
        if (!sessionsContainer) return;
        
        sessionsContainer.innerHTML = '<div class="loading-sessions">正在加载会话列表...</div>';
        
        const listHeader = document.querySelector('.session-list-header h3');
        if (listHeader) {
            listHeader.textContent = `${currentProvider} 会话列表`;
        }
        
        window.AIChatData.getAllChatSessions(currentProvider)
            .then(sessions => {
                if (sessions.length === 0) {
                    sessionsContainer.innerHTML = '<div class="no-sessions">暂无聊天会话</div>';
                    return;
                }
                
                this.renderSessionList(sessions);
                this.setupSessionSearch();
            })
            .catch(error => {
                sessionsContainer.innerHTML = `<div class="loading-sessions error">加载会话列表失败: ${error.message}</div>`;
            });
    },
    
    // 渲染会话列表
    renderSessionList(sessions) {
        const sessionsContainer = document.getElementById('sessions-container');
        if (!sessionsContainer) return;
        
        if (sessions.length === 0) {
            sessionsContainer.innerHTML = '<div class="loading-sessions">暂无聊天会话</div>';
            return;
        }
        
        sessionsContainer.innerHTML = '';
        
        sessions.forEach(session => {
            if (!session.id || session.id === 'session_NaN' || !session.id.startsWith('session_')) {
                return;
            }
            
            const sessionItem = document.createElement('div');
            sessionItem.className = 'session-item';
            sessionItem.dataset.sessionId = session.id;
            
            const sessionIdDisplay = session.id.replace('session_', '');
            
            if (!sessionIdDisplay || sessionIdDisplay === 'NaN' || sessionIdDisplay === 'undefined') {
                return;
            }
            
            let formattedDate = '未知时间';
            try {
                formattedDate = new Date(session.timestamp).toLocaleString();
                if (formattedDate === 'Invalid Date') {
                    formattedDate = '未知时间';
                }
            } catch (e) {}
            
            sessionItem.innerHTML = `
                <div class="session-name">会话: ${sessionIdDisplay}</div>
                <div class="session-modal-info">
                    <span class="session-date">${formattedDate}</span>
                    <span class="session-count">${session.messageCount || 0} 条消息</span>
                </div>
            `;
            
            sessionItem.addEventListener('click', () => {
                sessionsContainer.querySelectorAll('.session-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                sessionItem.classList.add('active');
                
                this.loadSessionDetail(session.id);
                
                const loadButton = document.getElementById('load-session');
                const deleteButton = document.getElementById('delete-session');
                if (loadButton) loadButton.disabled = false;
                if (deleteButton) deleteButton.disabled = false;
            });
            
            sessionsContainer.appendChild(sessionItem);
        });
        
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
        
        if (!sessionMessages || !sessionTitle) return;
        
        const sessionIdDisplay = sessionId.replace('session_', '');
        
        sessionTitle.textContent = `会话详情: ${sessionIdDisplay}`;
        
        sessionMessages.innerHTML = '<div class="loading-sessions">正在加载会话消息...</div>';
        
        window.AIChatData.getSessionMessages(sessionId)
            .then(messages => {
                this.renderSessionMessages(messages, sessionId);
            })
            .catch(error => {
                sessionMessages.innerHTML = `<div class="loading-sessions error">加载会话消息失败: ${error.message}</div>`;
            });
    },
    
    // 渲染会话消息
    renderSessionMessages(messages, sessionId) {
        const sessionMessages = document.getElementById('session-messages');
        if (!sessionMessages) return;
        
        if (messages.length === 0) {
            sessionMessages.innerHTML = '<div class="no-session-selected">此会话暂无消息</div>';
            return;
        }
        
        sessionMessages.innerHTML = '';
        
        messages.forEach(message => {
            if (!message.role || !message.content) return;
            
            const messageItem = document.createElement('div');
            messageItem.className = 'session-message';
            
            const isUser = message.role === 'user';
            messageItem.style.backgroundColor = isUser ? '#f1f3f5' : '#fff';
            messageItem.style.borderLeft = isUser ? '3px solid #4dabf7' : '3px solid #69db7c';
            
            const time = new Date(message.timestamp).toLocaleString();
            
            messageItem.innerHTML = `
                <div class="session-message-user">${isUser ? '用户' : 'AI'}</div>
                <div class="session-message-content">${message.content}</div>
                <div class="session-message-time">${time}</div>
            `;
            
            sessionMessages.appendChild(messageItem);
        });
        
        this.setupSessionActions(sessionId);
    },
    
    // 设置会话操作按钮事件
    setupSessionActions(sessionId) {
        const loadButton = document.getElementById('load-session');
        const deleteButton = document.getElementById('delete-session');
        
        if (!loadButton || !deleteButton) return;
        
        loadButton.onclick = async () => {
            try {
                const messages = await window.AIChatData.getSessionMessages(sessionId);
                
                if (!Array.isArray(messages)) {
                    throw new Error('会话数据结构错误');
                }
                
                if (messages.length === 0) {
                    window.AIChatApp.state.sessionId = sessionId;
                    window.AIChatApp.clearChat();
                    window.AIChatApp.updateSessionDisplay();
                    
                    const modal = document.getElementById('history-modal');
                    modal.style.display = 'none';
                    
                    this.showTooltip('已加载空会话');
                    return;
                }
                
                window.AIChatApp.clearChat();
                window.AIChatApp.state.sessionId = sessionId;
                window.AIChatApp.updateSessionDisplay();
                
                const displayMessages = messages.slice(-10);
                displayMessages.forEach(msg => {
                    if (msg.role === 'user') {
                        this.addUserMessage(msg.content);
                    } else if (msg.role === 'assistant') {
                        const aiMessage = this.addAIMessage(msg.content);
                        this.finalizeAIMessage(aiMessage, false);
                    }
                });
                
                const modal = document.getElementById('history-modal');
                modal.style.display = 'none';
                
                this.showTooltip('已加载会话');
            } catch (error) {
                this.showTooltip('加载会话失败: ' + error.message);
            }
        };
        
        deleteButton.onclick = async () => {
            this.showConfirm({
                title: '删除确认',
                message: '确定要删除此会话吗？此操作无法撤销！',
                okText: '删除',
                cancelText: '取消',
                onConfirm: async () => {
                    try {
                        await window.AIChatData.deleteSessionMessages(sessionId);
                        
                        this.loadSessionList();
                        
                        const sessionMessages = document.getElementById('session-messages');
                        sessionMessages.innerHTML = `<div class="no-session-selected">请从左侧选择一个会话</div>`;
                        
                        loadButton.disabled = true;
                        deleteButton.disabled = true;
                        
                        document.getElementById('session-detail-title').textContent = '会话详情';
                        
                        this.showTooltip('已删除会话');
                        
                        window.AIChatData.loadLatestProviderSession()
                            .then(() => {
                                window.AIChatApp.updateSessionDisplay();
                                
                                const modal = document.getElementById('history-modal');
                                if (modal) {
                                    modal.style.display = 'none';
                                }
                                
                                this.showTooltip('已加载最新会话');
                            })
                            .catch(error => {
                                this.showTooltip('加载最新会话失败，请手动选择会话');
                            });
                    } catch (error) {
                        this.showTooltip('删除会话失败: ' + error.message);
                    }
                }
            });
        };
    },
    
    // 显示设置面板
    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;
        
        modal.style.display = 'block';
        
        document.querySelector('#settings-modal .close').onclick = () => {
            modal.style.display = 'none';
            this.saveSettings();
        };
        
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                this.saveSettings();
            }
        };
        
        const resetBtn = document.getElementById('reset-settings');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.resetSettings();
                this.showTooltip('设置已重置为默认值');
            };
        }
    },
    
    showQuickMessagesModal() {
        window.AIChatQuickMessage.showQuickMessagesModal();
    },

    showAppendedQuickMessages() {
        window.AIChatQuickMessage.showAppendedQuickMessages();
    },
    
    showRandomQuickMessages() {
        window.AIChatQuickMessage.showRandomQuickMessages();
    },

    saveSettings() {
        const app = window.AIChatApp;
        const elements = app.elements;
        
        app.state.isStreamMode = elements.modeStream.checked;
        app.UI.updateUIForMode();
        
        app.state.model = elements.model.value;
        app.state.temperature = parseFloat(elements.temperature.value);
        app.state.maxTokens = parseInt(elements.maxTokens.value);
        
        app.state.enableMCPTools = elements.enableMCPTools.checked;
        app.state.enableParamValidation = elements.enableParamValidation.checked;
        app.state.enablePrompts = elements.enablePrompts.checked
        
        app.state.enableMessageHistory = elements.enableMessageHistory.checked;
        app.state.messageHistoryCount = parseInt(elements.messageHistoryCount.value);
        
        try {
            const settings = {
                isStreamMode: app.state.isStreamMode,
                model: app.state.model,
                temperature: app.state.temperature,
                maxTokens: app.state.maxTokens,
                enableMCPTools: app.state.enableMCPTools,
                enableParamValidation: app.state.enableParamValidation,
                enablePrompts: app.state.enablePrompts,
                enableMessageHistory: app.state.enableMessageHistory,
                messageHistoryCount: app.state.messageHistoryCount
            };
            
            localStorage.setItem('aiChatSettings', JSON.stringify(settings));
        } catch (error) {}
    },
    
    resetSettings() {
        const app = window.AIChatApp;
        const elements = app.elements;
        
        elements.modeStream.checked = true;
        elements.modeRegular.checked = false;
        elements.temperature.value = 0.7;
        elements.maxTokens.value = 2048;
        elements.enableMCPTools.checked = true;
        elements.enableParamValidation.checked = false;
        elements.enablePrompts.checked = true;
        elements.enableMessageHistory.checked = false;
        elements.messageHistoryCount.value = 3;
        
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
            
            if (typeof settings.enablePrompts === 'boolean') {
                elements.enablePrompts.checked = settings.enablePrompts;
                app.state.enablePrompts = settings.enablePrompts;
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

    // 在DOM更新后添加鼠标滚轮事件处理
    bindTableWheelEvents() {
        document.querySelectorAll('.table-container[data-needs-wheel-handler="true"]').forEach(container => {
            container.removeAttribute('data-needs-wheel-handler');
            
            container.addEventListener('wheel', (event) => {
                event.preventDefault();
                container.scrollLeft += event.deltaY;
            }, { passive: false });
        });
    },

    // 显示MCP服务器选择模态框
    showMCPServersModal() {
        const modal = document.getElementById('mcp-servers-modal');
        if (!modal) return;
        
        modal.style.display = 'block';
        
        document.querySelector('#mcp-servers-modal .close').onclick = () => {
            modal.style.display = 'none';
        };
        
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        this.loadMCPServersList();
        
        const saveBtn = document.getElementById('mcp-save');
        const cancelBtn = document.getElementById('mcp-cancel');
        const selectAllBtn = document.getElementById('mcp-select-all');
        const deselectAllBtn = document.getElementById('mcp-deselect-all');
        
        if (saveBtn) {
            saveBtn.onclick = () => {
                this.saveMCPServersList();
                modal.style.display = 'none';
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        if (selectAllBtn) {
            selectAllBtn.onclick = () => {
                this.selectAllMCPServers();
            };
        }
        
        if (deselectAllBtn) {
            deselectAllBtn.onclick = () => {
                this.deselectAllMCPServers();
            };
        }
    },
    
    // 加载MCP服务器列表
    loadMCPServersList() {
        const app = window.AIChatApp;
        const container = document.getElementById('mcp-modal-servers-list');
        if (!container) return;
        
        container.innerHTML = '<div class="loading-servers">加载服务器列表...</div>';
        
        app.loadMCPServers().then(() => {
            const initialEnabledIds = [...app.state.enabledServerIds];
            
            app.state.enabledServerIds = app.state.enabledServerIds.filter(id => {
                const server = app.state.mcpServers.find(s => s.id === id);
                return server !== undefined;
            });
            
            app.state.mcpServers.forEach(server => {
                server.isEnabled = app.state.enabledServerIds.includes(server.id);
            });
            
            const hasChanges = initialEnabledIds.length !== app.state.enabledServerIds.length;
            if (hasChanges) {
                app.API.saveEnabledMCPServers(app.state.enabledServerIds)
                    .then(() => {
                        this.showTooltip('已自动移除不可用的服务器');
                    })
                    .catch(err => {});
            }
            
            this.renderMCPServersList();
            this.updateMCPButtonCounter();
        }).catch(error => {
            container.innerHTML = '<div class="no-servers">加载服务器列表失败，请重试</div>';
        });
    },
    
    // 渲染MCP服务器列表
    renderMCPServersList() {
        const app = window.AIChatApp;
        const container = document.getElementById('mcp-modal-servers-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (app.state.mcpServers.length === 0) {
            container.innerHTML = '<div class="no-servers">没有可用的MCP服务器</div>';
            return;
        }
        
        app.state.mcpServers.forEach(server => {
            const isSelected = server.isEnabled;
            
            const serverCard = document.createElement('div');
            serverCard.className = `server-card ${isSelected ? 'selected' : ''}`;
            serverCard.dataset.serverId = server.id;
            serverCard.dataset.selected = isSelected ? 'true' : 'false';
            
            const statusIndicator = document.createElement('div');
            statusIndicator.className = 'selection-indicator';
            
            const serverName = document.createElement('div');
            serverName.className = 'server-name';
            serverName.textContent = server.name;
            
            if (server.description) {
                const serverDesc = document.createElement('div');
                serverDesc.className = 'server-description';
                serverDesc.textContent = server.description;
                serverCard.appendChild(serverDesc);
            }
            
            serverCard.addEventListener('click', () => {
                const currentSelected = serverCard.dataset.selected === 'true';
                const newSelected = !currentSelected;
                
                serverCard.dataset.selected = newSelected ? 'true' : 'false';
                serverCard.classList.toggle('selected', newSelected);
                
                server.isEnabled = newSelected;
            });
            
            serverCard.appendChild(statusIndicator);
            serverCard.appendChild(serverName);
            
            container.appendChild(serverCard);
        });
    },
    
    selectAllMCPServers() {
        const app = window.AIChatApp;
        
        if (app.state.mcpServers.length === 0) {
            this.showTooltip('没有可用的服务器');
            return;
        }
        
        app.state.mcpServers.forEach(server => {
            const card = document.querySelector(`#mcp-modal-servers-list .server-card[data-server-id="${server.id}"]`);
            
            if (card) {
                card.classList.add('selected');
                card.dataset.selected = 'true';
                server.isEnabled = true;
            }
        });
    },
    
    deselectAllMCPServers() {
        const app = window.AIChatApp;
        
        app.state.mcpServers.forEach(server => {
            const card = document.querySelector(`#mcp-modal-servers-list .server-card[data-server-id="${server.id}"]`);
            
            if (card) {
                card.classList.remove('selected');
                card.dataset.selected = 'false';
                server.isEnabled = false;
            }
        });
    },
    
    saveMCPServersList() {
        const app = window.AIChatApp;
        
        const enabledIds = [];
        app.state.mcpServers.forEach(server => {
            const card = document.querySelector(`#mcp-modal-servers-list .server-card[data-server-id="${server.id}"]`);
            
            if (card && card.dataset.selected === 'true') {
                enabledIds.push(server.id);
                server.isEnabled = true;
            } else {
                server.isEnabled = false;
            }
        });
        
        app.state.enabledServerIds = enabledIds;
        
        app.API.saveEnabledMCPServers(enabledIds)
            .then(() => {
                this.showTooltip(`已更新启用的MCP服务器，当前启用 ${enabledIds.length} 个服务器`);
                
                this.updateMCPButtonCounter();
                app.updateMCPServersUI();
            })
            .catch(error => {
                this.showTooltip('保存MCP服务器启用状态失败');
            });
    },
    
    updateMCPButtonCounter() {
        const app = window.AIChatApp;
        const mcpButton = document.getElementById('mcp-quick-access');
        
        if (!mcpButton) return;
        
        const oldCounter = mcpButton.querySelector('.counter');
        if (oldCounter) {
            oldCounter.remove();
        }
        
        const enabledCount = app.state.enabledServerIds.length;
        
        if (enabledCount > 0) {
            const counter = document.createElement('span');
            counter.className = 'counter';
            counter.textContent = enabledCount;
            mcpButton.appendChild(counter);
        }
    },
};