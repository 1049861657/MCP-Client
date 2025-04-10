/**
 * MCP Echo工具调用前端
 */
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message');
    const sendButton = document.getElementById('send-button');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const resultContent = document.getElementById('result-content');
    const responseTimeDiv = document.getElementById('response-time');
    
    // 初始化焦点
    messageInput.focus();
    
    // 监听Enter键提交（同时按Ctrl防止误触）
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey && !sendButton.disabled) {
            e.preventDefault();
            sendButton.click();
        }
    });
    
    // 显示响应耗时
    function showResponseTime(elapsedTime) {
        responseTimeDiv.innerHTML = `响应耗时: <span class="response-time-value">${elapsedTime}ms</span>`;
    }
    
    // 美化工具返回结果
    function formatToolResult(result) {
        if (!result || !result.content || !Array.isArray(result.content)) {
            return "服务器返回的数据格式不正确";
        }
        
        let output = "";
        output += "{\n";
        output += "  \"content\": [\n";
        
        result.content.forEach((item, index) => {
            output += "    {\n";
            output += `      \"type\": \"${item.type}\",\n`;
            if (item.text) {
                output += `      \"text\": \"${item.text.replace(/"/g, '\\"')}\"\n`;
            }
            output += "    }";
            if (index < result.content.length - 1) {
                output += ",";
            }
            output += "\n";
        });
        
        output += "  ]\n";
        output += "}";
        
        return output;
    }
    
    // 发送消息到服务器
    sendButton.addEventListener('click', async () => {
        const message = messageInput.value.trim();
        
        if (!message) {
            messageInput.focus();
            // 高亮输入框提示用户输入
            messageInput.style.borderColor = 'var(--error-color)';
            setTimeout(() => {
                messageInput.style.borderColor = '';
            }, 1000);
            return;
        }
        
        // 显示加载中状态
        sendButton.disabled = true;
        loadingDiv.classList.remove('hidden');
        resultDiv.classList.add('hidden');
        
        try {
            // 记录开始时间
            const startTime = Date.now();
            
            const response = await fetch('/api/echo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            
            // 确保加载至少显示500ms，避免闪烁
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < 500) {
                await new Promise(resolve => setTimeout(resolve, 500 - elapsedTime));
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || '请求失败');
            }
            
            // 计算总耗时
            const totalTime = Date.now() - startTime;
            
            // 显示响应时间
            showResponseTime(totalTime);
            
            // 显示结果
            resultContent.textContent = formatToolResult(data.result);
            resultDiv.classList.remove('hidden');
            resultDiv.classList.remove('error');
            
            // 滚动到结果
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            // 显示错误
            resultContent.textContent = `错误: ${error.message}`;
            resultDiv.classList.remove('hidden');
            resultDiv.classList.add('error');
            responseTimeDiv.innerHTML = ''; // 出错时不显示响应时间
        } finally {
            // 恢复按钮状态并隐藏加载中
            sendButton.disabled = false;
            loadingDiv.classList.add('hidden');
        }
    });
}); 