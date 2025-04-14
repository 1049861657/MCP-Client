/**
 * 导航栏组件
 * 用于在所有页面复用导航栏
 */

// 在DOMContentLoaded事件中加载导航栏
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否已存在导航栏，避免重复添加
    if (!document.querySelector('.navbar')) {
        loadNavbar();
    }
});

/**
 * 加载导航栏
 * 创建导航栏HTML并插入到页面body的开头
 */
function loadNavbar() {
    // 获取当前页面的路径，用于高亮显示当前页面的导航链接
    const currentPath = window.location.pathname;
    
    // 创建导航栏元素
    const navbar = document.createElement('nav');
    navbar.className = 'navbar';
    
    // 设置导航栏的HTML内容
    navbar.innerHTML = `
        <div class="navbar-links">
            <a href="/" ${currentPath === '/' || currentPath === '/index.html' ? 'class="active"' : ''}>首页</a>
            <a href="/ai.html" ${currentPath === '/ai.html' ? 'class="active"' : ''}>AI聊天</a>
            <a href="/info.html" ${currentPath === '/info.html' ? 'class="active"' : ''}>服务信息</a>
            <a href="/settings.html" ${currentPath === '/settings.html' ? 'class="active"' : ''}>配置管理</a>
        </div>
        <div id="client-info" class="client-info" style="display: none;">
            <svg class="client-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span id="client-name" class="client-name"></span>
            <span id="client-version" class="client-version"></span>
        </div>
    `;
    
    // 确保不同页面的导航栏样式保持一致，这里内联一些基本样式
    const navbarStyle = document.createElement('style');
    navbarStyle.textContent = `
        /* 导航栏基本样式 */
        .navbar {
            background-color: #1976d2;
            color: white;
            display: flex;
            padding: 0;
            margin: 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            justify-content: space-between;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 20;
            height: 50px;
        }
        
        .navbar-links {
            display: flex;
        }
        
        .navbar-links a {
            color: white;
            text-decoration: none;
            padding: 15px 20px;
            transition: background-color 0.3s;
            display: flex;
            align-items: center;
            height: 100%;
        }
        
        .navbar-links a:hover {
            background-color: rgba(255,255,255,0.1);
        }
        
        .navbar-links a.active {
            background-color: rgba(255,255,255,0.2);
            font-weight: bold;
        }
        
        /* 客户端信息样式 */
        .client-info {
            display: flex;
            align-items: center;
            padding: 0 15px;
            font-size: 14px;
        }
        
        .client-icon {
            width: 18px;
            height: 18px;
            margin-right: 8px;
        }
        
        .client-name {
            font-weight: bold;
            margin-right: 8px;
        }
        
        .client-version {
            opacity: 0.8;
        }
    `;
    
    // 将样式添加到页面头部
    document.head.appendChild(navbarStyle);
    
    // 将导航栏插入到页面的body开始处
    const bodyElement = document.body;
    if (bodyElement.firstChild) {
        bodyElement.insertBefore(navbar, bodyElement.firstChild);
    } else {
        bodyElement.appendChild(navbar);
    }
    
    // 为body添加上边距，防止内容被固定导航栏遮挡
    bodyElement.style.marginTop = '50px';
    
    console.log('导航栏已加载');
    
    // 加载客户端信息
    fetchClientInfo();
}

/**
 * 获取客户端信息
 * 从服务器获取当前客户端信息并更新到导航栏
 */
async function fetchClientInfo() {
    try {
        // 发起API请求获取客户端信息
        const response = await fetch('/api/client-info');
        
        // 如果请求失败，抛出错误
        if (!response.ok) {
            throw new Error('获取客户端信息失败');
        }
        
        // 解析响应数据
        const data = await response.json();
        
        // 更新导航栏中的客户端信息
        updateNavbarClientInfo(data);
    } catch (error) {
        console.error('获取客户端信息时发生错误:', error);
    }
}

/**
 * 更新导航栏中的客户端信息
 * @param {Object} clientInfo - 客户端信息对象，包含name和version属性
 */
function updateNavbarClientInfo(clientInfo) {
    if (!clientInfo) return;
    
    // 获取导航栏中的客户端信息元素
    const clientNameElement = document.getElementById('client-name');
    const clientVersionElement = document.getElementById('client-version');
    const clientInfoElement = document.getElementById('client-info');
    
    // 更新客户端名称和版本
    if (clientNameElement && clientInfo.name) {
        clientNameElement.textContent = clientInfo.name;
    }
    
    if (clientVersionElement && clientInfo.version) {
        clientVersionElement.textContent = 'v' + clientInfo.version;
    }
    
    // 显示客户端信息区域
    if (clientInfoElement) {
        clientInfoElement.style.display = 'flex';
    }
}