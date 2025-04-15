/**
 * AI聊天应用 - 快捷消息模块
 * 包含所有快捷消息相关的功能
 */

// 快捷消息管理模块
window.AIChatQuickMessage = {
    // 快捷消息数据缓存
    quickMessagesData: null,
    
    // SVG图标常量
    ICONS: {
        EDIT: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>`,
        DELETE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"></path>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>`,
        ADD: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>`
    },
    
    // 辅助函数：获取DOM元素
    getElement(selector) {
        return document.querySelector(selector);
    },
    
    // 辅助函数：获取多个DOM元素
    getElements(selector) {
        return document.querySelectorAll(selector);
    },
    
    // 辅助函数：设置模态窗口关闭事件
    setupModalEvents(modalId) {
        const modal = this.getElement(`#${modalId}`);
        if (!modal) return;
        
        // 关闭按钮事件
        const closeButton = modal.querySelector('.close');
        if (closeButton) {
            closeButton.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        // 点击模态窗口外部时关闭 - 使用更可靠的方式绑定事件
        // 移除之前可能存在的点击事件以防止重复
        modal.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        return modal;
    },
    
    // 辅助函数：显示错误消息
    handleError(error, container, message) {
        console.error(message, error);
        if (container) {
            container.innerHTML = `<div class="error-message">${message}: ${error.message}</div>`;
        }
        window.AIChatUI.showTooltip(`${message}: ${error.message}`);
    },
    
    // 显示快捷消息模态窗口
    showQuickMessagesModal() {
        const modal = this.setupModalEvents('quick-messages-modal');
        if (!modal) return;
        
        const container = modal.querySelector('.quick-messages-container');
        if (!container) return;
        
        // 显示模态窗口
        modal.style.display = 'block';
        
        // 显示加载状态
        container.innerHTML = '<div class="loading-messages">正在加载快捷消息...</div>';
        
        // 加载数据
        fetch('/api/config/quick-messages')
            .then(response => {
                if (!response.ok) throw new Error(`请求失败: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!data) throw new Error('数据为空');
                this.renderQuickMessages(container, data);
                
                // 设置编辑模态窗口的事件
                this.setupEditMessageModal();
            })
            .catch(error => {
                this.handleError(error, container, '加载快捷消息失败');
            });
    },
    
    // 渲染快捷消息
    renderQuickMessages(container, data) {
        // 清空容器
        container.innerHTML = '';
        
        if (!data || !Array.isArray(data)) {
            container.innerHTML = '<div class="error-message">快捷消息配置格式错误</div>';
            return;
        }
        
        // 保存当前数据的引用，用于后续保存
        this.quickMessagesData = JSON.parse(JSON.stringify(data));
        
        // 创建表格容器
        const tableDiv = document.createElement('div');
        tableDiv.className = 'quick-messages-table';
        
        // 创建表头
        const headerDiv = document.createElement('div');
        headerDiv.className = 'quick-messages-header';
        headerDiv.innerHTML = `
            <div class="message-test-id">ID</div>
            <div class="message-test-item">测试项目</div>
            <div class="message-test-result">测试结果</div>
            <div class="message-test-actions">操作</div>
        `;
        tableDiv.appendChild(headerDiv);
        
        // 添加消息项
        data.forEach((message, index) => {
            if (!message.content) return;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'quick-messages-row';
            // 添加交替背景色
            if (index % 2 === 0) {
                itemDiv.classList.add('even-row');
            }
            
            // 标记可以点击并存储消息索引
            itemDiv.setAttribute('data-message', message.content);
            itemDiv.setAttribute('data-index', index);
            
            // 设置结果图标，默认为成功（√）
            const resultIcon = message.result === '×' ? 
                '<span class="result-icon failure">×</span>' : 
                '<span class="result-icon success">√</span>';
            
            // ID单元格
            const idCell = document.createElement('div');
            idCell.className = 'message-test-id';
            idCell.textContent = message.id;
            
            // HTML安全编码全文内容
            const contentCell = document.createElement('div');
            contentCell.className = 'message-test-item';
            contentCell.setAttribute('title', message.content);
            contentCell.textContent = message.content; // 使用textContent自动转义HTML
            
            const resultCell = document.createElement('div');
            resultCell.className = 'message-test-result';
            resultCell.innerHTML = resultIcon;
            
            // 添加操作列
            const actionsCell = document.createElement('div');
            actionsCell.className = 'message-test-actions';
            
            // 编辑按钮
            const editButton = document.createElement('span');
            editButton.className = 'action-icon edit';
            editButton.innerHTML = this.ICONS.EDIT;
            editButton.setAttribute('title', '编辑');
            editButton.setAttribute('data-index', index);
            
            // 删除按钮
            const deleteButton = document.createElement('span');
            deleteButton.className = 'action-icon delete';
            deleteButton.innerHTML = this.ICONS.DELETE;
            deleteButton.setAttribute('title', '删除');
            deleteButton.setAttribute('data-index', index);
            
            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);
            
            // 清空并添加安全的内容
            itemDiv.innerHTML = '';
            itemDiv.appendChild(idCell);
            itemDiv.appendChild(contentCell);
            itemDiv.appendChild(resultCell);
            itemDiv.appendChild(actionsCell);
            
            tableDiv.appendChild(itemDiv);
        });
        
        // 添加表格到容器
        container.appendChild(tableDiv);
        
        // 创建操作区域和添加按钮
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'quick-messages-actions';
        
        // 添加新增按钮
        const addButton = document.createElement('button');
        addButton.className = 'add-quick-message';
        addButton.innerHTML = `${this.ICONS.ADD} 添加消息`;
        
        // 只添加新增按钮，移除保存更改按钮
        actionsDiv.appendChild(addButton);
        container.appendChild(actionsDiv);
        
        // 设置事件委托
        this.setupQuickMessageEvents();
    },
    
    // 设置编辑模态窗口事件
    setupEditMessageModal() {
        const modal = this.setupModalEvents('edit-message-modal');
        if (!modal) return;
        
        // 取消按钮点击事件
        const cancelButton = document.getElementById('cancel-edit');
        if (cancelButton) {
            cancelButton.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        // 表单提交事件
        const form = document.getElementById('edit-message-form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.saveMessageEdit();
            };
        }
    },
    
    // 设置所有快捷消息相关事件（使用事件委托）
    setupQuickMessageEvents() {
        // 获取快捷消息容器
        const container = this.getElement('.quick-messages-container');
        if (!container) return;
        
        // 移除旧的事件监听器
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);
        
        // 使用事件委托绑定所有操作
        newContainer.addEventListener('click', (event) => {
            const target = event.target;
            
            // 处理编辑按钮点击
            if (target.closest('.action-icon.edit')) {
                event.stopPropagation();
                const row = target.closest('.quick-messages-row');
                if (row) {
                    const index = parseInt(row.getAttribute('data-index'));
                    this.editQuickMessage(index);
                }
            }
            // 处理删除按钮点击
            else if (target.closest('.action-icon.delete')) {
                event.stopPropagation();
                const row = target.closest('.quick-messages-row');
                if (row) {
                    const index = parseInt(row.getAttribute('data-index'));
                    this.deleteQuickMessage(index);
                }
            }
            // 处理结果图标点击
            else if (target.classList.contains('result-icon')) {
                event.stopPropagation();
                const row = target.closest('.quick-messages-row');
                if (row) {
                    const index = parseInt(row.getAttribute('data-index'));
                    // 切换结果状态
                    if (target.classList.contains('success')) {
                        // 成功 → 失败
                        target.classList.remove('success');
                        target.classList.add('failure');
                        target.textContent = '×';
                        this.quickMessagesData[index].result = '×';
                    } else {
                        // 失败 → 成功
                        target.classList.remove('failure');
                        target.classList.add('success');
                        target.textContent = '√';
                        this.quickMessagesData[index].result = '√';
                    }
                    
                    // 立即保存配置，但不重新加载
                    this.saveQuickMessagesWithoutReload();
                }
            }
            // 处理消息行点击（选择消息）
            else if (target.closest('.quick-messages-row')) {
                const row = target.closest('.quick-messages-row');
                const message = row.getAttribute('data-message');
                const messageInput = window.AIChatApp.elements.message;
                
                if (message && messageInput) {
                    // 将消息内容填入输入框
                    messageInput.value = message;
                    messageInput.focus();
                    
                    // 关闭模态窗口
                    document.getElementById('quick-messages-modal').style.display = 'none';
                    
                    // 显示提示
                    window.AIChatUI.showTooltip('已添加到输入框');
                }
            }
            // 处理添加按钮点击
            else if (target.closest('.add-quick-message')) {
                this.addQuickMessage();
            }
        });
    },
    
    // 添加新的快捷消息
    addQuickMessage() {
        const modal = document.getElementById('edit-message-modal');
        const title = document.getElementById('edit-message-title');
        const form = document.getElementById('edit-message-form');
        const indexInput = document.getElementById('edit-message-index');
        const idInput = document.getElementById('edit-message-id');
        const resultSelect = document.getElementById('edit-message-result');
        
        if (!modal || !form || !indexInput || !idInput || !resultSelect) return;
        
        // 设置标题和重置表单
        title.textContent = '添加快捷消息';
        form.reset();
        
        // 设置为添加模式
        indexInput.value = '-1';
        
        // 设置新ID为当前最大ID+1
        let maxId = 0;
        if (this.quickMessagesData && this.quickMessagesData.length > 0) {
            maxId = Math.max(...this.quickMessagesData.map(item => parseInt(item.id) || 0));
        }
        idInput.value = maxId + 1;
        
        // 禁用ID输入框，不允许修改
        idInput.disabled = true;
        
        // 默认结果为失败
        resultSelect.value = '×';
        
        // 显示模态窗口
        modal.style.display = 'block';
    },
    
    // 编辑快捷消息
    editQuickMessage(index) {
        if (!this.quickMessagesData || !this.quickMessagesData[index]) {
            window.AIChatUI.showTooltip('找不到要编辑的消息');
            return;
        }
        
        const message = this.quickMessagesData[index];
        const modal = document.getElementById('edit-message-modal');
        const title = document.getElementById('edit-message-title');
        const indexInput = document.getElementById('edit-message-index');
        const idInput = document.getElementById('edit-message-id');
        const contentInput = document.getElementById('edit-message-content');
        const resultSelect = document.getElementById('edit-message-result');
        
        if (!modal || !title || !indexInput || !idInput || !contentInput || !resultSelect) return;
        
        // 设置标题和填充表单
        title.textContent = '编辑快捷消息';
        indexInput.value = index;
        idInput.value = message.id || '';
        contentInput.value = message.content || '';
        resultSelect.value = message.result || '√';
        
        // 禁用ID输入框，不允许修改
        idInput.disabled = true;
        
        // 显示模态窗口
        modal.style.display = 'block';
    },
    
    // 保存编辑
    saveMessageEdit() {
        const indexInput = document.getElementById('edit-message-index');
        const idInput = document.getElementById('edit-message-id');
        const contentInput = document.getElementById('edit-message-content');
        const resultSelect = document.getElementById('edit-message-result');
        
        if (!indexInput || !idInput || !contentInput || !resultSelect) return;
        
        const index = parseInt(indexInput.value);
        const id = parseInt(idInput.value);
        const content = contentInput.value.trim();
        const result = resultSelect.value;
        
        // 验证数据
        if (!content) {
            window.AIChatUI.showTooltip('消息内容不能为空');
            return;
        }
        
        // 保存数据
        const newMessage = { id, content, result };
        let needRerender = false;
        
        // 关闭模态窗口
        const modal = document.getElementById('edit-message-modal');
        if (modal) modal.style.display = 'none';
        
        if (index === -1) {
            // 添加新消息
            const newIndex = this.quickMessagesData.length;
            this.quickMessagesData.push(newMessage);
            
            // 尝试直接添加新行，不重新渲染整个列表
            if (!this.insertNewQuickMessageRow(newMessage, newIndex)) {
                needRerender = true;
            } 
        } else {
            // 更新现有消息 - 尝试原地更新
            this.quickMessagesData[index] = newMessage;
            
            // 尝试原地更新UI，如果失败再重新渲染
            if (!this.updateQuickMessageInPlace(index, newMessage)) {
                needRerender = true;
            }
        }
        
        // 只有在需要时才重新渲染
        if (needRerender) {
            const container = this.getElement('.quick-messages-container');
            if (container) this.renderQuickMessages(container, this.quickMessagesData);
        }
        
        // 显示提示
        window.AIChatUI.showTooltip(index === -1 ? '添加成功' : '更新成功');
        
        // 自动保存到服务器，但不重新加载
        this.saveQuickMessagesWithoutReload();
    },
    
    // 在不重新渲染整个列表的情况下插入新消息行
    insertNewQuickMessageRow(message, index) {
        const container = this.getElement('.quick-messages-container');
        if (!container) return false;
        
        // 查找表格容器
        const tableDiv = container.querySelector('.quick-messages-table');
        if (!tableDiv) return false;
        
        // 创建新行
        const itemDiv = document.createElement('div');
        itemDiv.className = 'quick-messages-row';
        
        // 添加交替背景色
        if (index % 2 === 0) {
            itemDiv.classList.add('even-row');
        }
        
        // 标记可以点击并存储消息索引
        itemDiv.setAttribute('data-message', message.content);
        itemDiv.setAttribute('data-index', index);
        
        // 设置结果图标
        const resultIcon = message.result === '×' ? 
            '<span class="result-icon failure">×</span>' : 
            '<span class="result-icon success">√</span>';
        
        // ID单元格
        const idCell = document.createElement('div');
        idCell.className = 'message-test-id';
        idCell.textContent = message.id;
        
        // 内容单元格
        const contentCell = document.createElement('div');
        contentCell.className = 'message-test-item';
        contentCell.setAttribute('title', message.content);
        contentCell.textContent = message.content;
        
        // 结果单元格
        const resultCell = document.createElement('div');
        resultCell.className = 'message-test-result';
        resultCell.innerHTML = resultIcon;
        
        // 操作单元格
        const actionsCell = document.createElement('div');
        actionsCell.className = 'message-test-actions';
        
        // 编辑按钮
        const editButton = document.createElement('span');
        editButton.className = 'action-icon edit';
        editButton.innerHTML = this.ICONS.EDIT;
        editButton.setAttribute('title', '编辑');
        editButton.setAttribute('data-index', index);
        
        // 删除按钮
        const deleteButton = document.createElement('span');
        deleteButton.className = 'action-icon delete';
        deleteButton.innerHTML = this.ICONS.DELETE;
        deleteButton.setAttribute('title', '删除');
        deleteButton.setAttribute('data-index', index);
        
        // 组装单元格
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
        
        itemDiv.appendChild(idCell);
        itemDiv.appendChild(contentCell);
        itemDiv.appendChild(resultCell);
        itemDiv.appendChild(actionsCell);
        
        // 添加到表格
        tableDiv.appendChild(itemDiv);
        
        // 添加后滚动到底部，确保新行可见
        setTimeout(() => {
            tableDiv.scrollTop = tableDiv.scrollHeight;
        }, 50);
        
        return true;
    },
    
    // 删除快捷消息
    deleteQuickMessage(index) {
        if (!this.quickMessagesData || !this.quickMessagesData[index]) {
            window.AIChatUI.showTooltip('找不到要删除的消息');
            return;
        }
        
        window.AIChatUI.showConfirm({
            title: '删除确认',
            message: '确定要删除这条快捷消息吗？',
            okText: '删除',
            cancelText: '取消',
            onConfirm: () => {
                // 删除数据
                this.quickMessagesData.splice(index, 1);
                
                // 重新计算所有消息的ID，确保ID序列连续
                this.quickMessagesData.forEach((item, idx) => {
                    item.id = idx + 1; // 从1开始重新编号
                });
                
                // 尝试直接从DOM中删除行
                const container = this.getElement('.quick-messages-container');
                if (container) {
                    const row = container.querySelector(`.quick-messages-row[data-index="${index}"]`);
                    if (row) {
                        // 直接删除该行
                        row.remove();
                        
                        // 更新后续行的索引（防止索引错乱）
                        const rows = container.querySelectorAll('.quick-messages-row');
                        rows.forEach((row, i) => {
                            if (i >= index) {
                                const currentIndex = parseInt(row.getAttribute('data-index'));
                                if (currentIndex > index) {
                                    // 更新行索引
                                    row.setAttribute('data-index', currentIndex - 1);
                                    
                                    // 更新编辑和删除按钮的索引
                                    const editButton = row.querySelector('.action-icon.edit');
                                    const deleteButton = row.querySelector('.action-icon.delete');
                                    
                                    if (editButton) editButton.setAttribute('data-index', currentIndex - 1);
                                    if (deleteButton) deleteButton.setAttribute('data-index', currentIndex - 1);
                                }
                                
                                // 更新ID显示
                                const idCell = row.querySelector('.message-test-id');
                                if (idCell) {
                                    // 获取对应的新ID
                                    const newId = this.quickMessagesData[i].id;
                                    idCell.textContent = newId;
                                }
                            }
                        });
                        
                        // 更新交替背景色
                        rows.forEach((row, i) => {
                            if (i % 2 === 0) {
                                row.classList.add('even-row');
                            } else {
                                row.classList.remove('even-row');
                            }
                        });
                    } else {
                        // 找不到行时回退到重新渲染
                        this.renderQuickMessages(container, this.quickMessagesData);
                    }
                }
                
                // 显示提示
                window.AIChatUI.showTooltip('删除成功');
                
                // 自动保存到服务器，但不重新加载
                this.saveQuickMessagesWithoutReload();
            }
        });
    },
    
    // 显示快捷消息气泡（通用方法，合并了之前的两个函数）
    showQuickMessageBubbles(options = {}) {
        const {
            isAppended = false,  // 是否是追加模式
            bubbleCount = 3,     // 气泡数量
            containerClass = isAppended ? 'appended-quick-bubbles' : 'quick-message-bubbles',
            bubbleClass = isAppended ? 'appended-quick-bubble' : 'quick-message-bubble'
        } = options;
        
        const chatMessages = window.AIChatApp.elements.chatMessages;
        if (!chatMessages) return;
        
        // 检查是否正在加载会话
        if (window.AIChatApp.state.isLoading) {
            console.log('正在加载会话，跳过显示快捷消息气泡');
            return;
        }
        
        // 非追加模式时，检查聊天界面是否为空
        if (!isAppended && chatMessages.childElementCount > 0) {
            return; // 如果不为空，不显示气泡
        }
        
        // 移除已有的相同类型气泡(如果有)
        const existingBubbles = chatMessages.querySelector(`.${containerClass}`);
        if (existingBubbles) {
            existingBubbles.remove();
        }
        
        // 加载快捷消息数据
        fetch('/api/config/quick-messages')
            .then(response => {
                if (!response.ok) throw new Error(`请求失败: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    return; // 没有数据或格式错误
                }
                
                // 非追加模式时，再次检查是否仍然需要显示气泡（可能此时已经加载了会话）
                if (!isAppended && chatMessages.childElementCount > 0) {
                    return; // 不再需要显示气泡
                }
                
                // 随机选择指定数量的问题
                const randomMessages = this.getRandomElements(data, bubbleCount);
                
                // 创建气泡容器
                const bubblesContainer = document.createElement('div');
                bubblesContainer.className = containerClass;
                
                // 为每个随机消息创建气泡
                randomMessages.forEach(message => {
                    const bubble = document.createElement('div');
                    bubble.className = bubbleClass;
                    bubble.textContent = message.content;
                    
                    // 点击事件：将消息填入输入框并发送
                    bubble.addEventListener('click', () => {
                        const messageInput = window.AIChatApp.elements.message;
                        if (messageInput) {
                            messageInput.value = message.content;
                            
                            // 移除所有气泡
                            if (bubblesContainer.parentNode) {
                                bubblesContainer.parentNode.removeChild(bubblesContainer);
                            }
                            
                            // 触发发送按钮点击
                            const sendButton = window.AIChatApp.elements.sendButton;
                            if (sendButton) {
                                sendButton.click();
                            }
                        }
                    });
                    
                    bubblesContainer.appendChild(bubble);
                });
                
                // 添加到聊天界面
                chatMessages.appendChild(bubblesContainer);
                
                // 滚动到底部以确保气泡可见
                if (isAppended) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            })
            .catch(error => {
                console.error('加载随机快捷消息失败:', error);
            });
    },
    
    // 显示追加的快捷消息气泡（保留原函数名称，但使用通用方法）
    showAppendedQuickMessages() {
        this.showQuickMessageBubbles({ isAppended: true });
    },
    
    // 显示随机快捷消息气泡（保留原函数名称，但使用通用方法）
    showRandomQuickMessages() {
        this.showQuickMessageBubbles({ isAppended: false });
    },
    
    // 获取数组中的随机元素
    getRandomElements(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, array.length));
    },
    
    // 在不重新渲染整个列表的情况下更新单个消息
    updateQuickMessageInPlace(index, newMessage) {
        const container = this.getElement('.quick-messages-container');
        if (!container) return false;
        
        // 查找对应的行
        const row = container.querySelector(`.quick-messages-row[data-index="${index}"]`);
        if (!row) return false;
        
        // 更新行的数据属性
        row.setAttribute('data-message', newMessage.content);
        
        // 更新各个单元格
        const idCell = row.querySelector('.message-test-id');
        if (idCell) idCell.textContent = newMessage.id;
        
        const contentCell = row.querySelector('.message-test-item');
        if (contentCell) {
            contentCell.textContent = newMessage.content;
            contentCell.setAttribute('title', newMessage.content);
        }
        
        // 更新结果图标
        const resultCell = row.querySelector('.message-test-result');
        if (resultCell) {
            const resultIcon = newMessage.result === '×' ? 
                '<span class="result-icon failure">×</span>' : 
                '<span class="result-icon success">√</span>';
            resultCell.innerHTML = resultIcon;
        }
        
        return true;
    },
    
    // 保存快捷消息配置（使用async/await简化）
    async saveQuickMessagesWithoutReload() {
        if (!this.quickMessagesData) {
            window.AIChatUI.showTooltip('没有可保存的数据');
            return;
        }
        
        // 显示正在保存的提示
        window.AIChatUI.showTooltip('正在保存...');
        
        try {
            // 调用API保存数据
            const response = await fetch('/api/config/quick-messages/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.quickMessagesData)
            });
            
            if (!response.ok) {
                throw new Error('保存失败: ' + response.status);
            }
            
            const data = await response.json();
            window.AIChatUI.showTooltip(data.success ? '保存成功' : ('保存失败: ' + (data.message || '未知错误')));
        } catch (error) {
            console.error('保存快捷消息失败:', error);
            window.AIChatUI.showTooltip('保存失败: ' + error.message);
        }
    }
}; 
