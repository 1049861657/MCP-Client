/**
 * 通用AI聊天前端脚本入口
 * 支持多种AI供应商（OpenAI和Deepseek）的聊天功能
 * 
 * 该文件仅作为入口文件，负责加载其他模块
 */

// 定义要加载的模块（按照依赖顺序）
const modules = [
    'ai-ui.js',  // 先加载UI模块，因为它包含TimeManager
    'ai-api.js', // 再加载API模块，它依赖UI模块
    'ai-core.js' // 最后加载核心模块，它依赖前两个模块
];

// 按顺序加载模块
function loadModulesSequentially() {
    console.log('开始加载AI聊天应用模块...');
    
    return new Promise((resolve, reject) => {
        let index = 0;
        
        // 递归加载下一个模块
        function loadNextModule() {
            if (index >= modules.length) {
                console.log('所有模块加载完成');
                resolve();
                return;
            }
            
            const moduleName = modules[index++];
            const script = document.createElement('script');
            script.src = `/js/${moduleName}`;
            
            script.onload = () => {
                console.log(`已加载模块: ${moduleName}`);
                loadNextModule(); // 加载下一个模块
            };
            
            script.onerror = () => {
                console.error(`加载模块失败: ${moduleName}`);
                reject(new Error(`加载模块失败: ${moduleName}`));
            };
            
            document.head.appendChild(script);
        }
        
        // 开始加载第一个模块
        loadNextModule();
    });
}

// 在页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 按顺序加载所有模块
        await loadModulesSequentially();
        
        // 所有模块加载完成后，手动初始化应用
        if (window.AIChatApp && window.AIChatUI && window.AIChatAPI && window.AIChatTimeManager) {
            // 添加必要的CSS样式
            const style = document.createElement('style');
            style.textContent = `
                /* 代码语言标签样式 */
                .code-language-label {
                    position: absolute;
                    top: 0;
                    right: 0;
                    background-color: #2d2d2d;
                    color: #ccc;
                    font-size: 0.8em;
                    padding: 2px 8px;
                    border-radius: 0 4px 0 4px;
                    font-family: monospace;
                    border-left: 1px solid #444;
                    border-bottom: 1px solid #444;
                }
                
                pre {
                    position: relative;
                    padding-top: 25px !important;
                }
                
                .response-content .markdown-content pre {
                    position: relative;
                    padding-top: 25px !important;
                }
                
                /* 思考容器样式 */
                .reasoning-container {
                    border: 1px solid #e1e4e8;
                    border-radius: 6px;
                    margin-bottom: 15px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }
                
                .reasoning-header {
                    background-color: #f6f8fa;
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    user-select: none;
                }
                
                .reasoning-header .toggle-icon {
                    margin-right: 8px;
                    transition: transform 0.3s ease;
                }
                
                .reasoning-header .title-text {
                    flex-grow: 1;
                    font-weight: 500;
                }
                
                .reasoning-header .thinking-time {
                    font-size: 12px;
                    color: #666;
                    margin-left: 8px;
                    display: inline-flex;
                    align-items: center;
                }
                
                .reasoning-header .thinking-time svg {
                    margin-right: 4px;
                }
                
                .reasoning-content {
                    padding: 12px;
                    overflow-y: auto;
                    transition: max-height 0.3s ease, padding 0.3s ease;
                    background-color: #f8f9fa;
                }
                
                /* 折叠状态 */
                .reasoning-container.collapsed .toggle-icon {
                    transform: rotate(-90deg);
                }
                
                .reasoning-container.collapsed .reasoning-content {
                    max-height: 0 !important;
                    padding-top: 0 !important;
                    padding-bottom: 0 !important;
                    overflow: hidden;
                }
            `;
            document.head.appendChild(style);
            
            // 初始化应用
            window.AIChatApp.init();
            console.log('AI聊天应用初始化完成');
        } else {
            console.error('初始化失败：缺少必要模块', { 
                hasApp: !!window.AIChatApp,
                hasUI: !!window.AIChatUI,
                hasAPI: !!window.AIChatAPI,
                hasTimeManager: !!window.AIChatTimeManager
            });
        }
    } catch (error) {
        console.error('AI聊天应用初始化失败', error);
    }
}); 
