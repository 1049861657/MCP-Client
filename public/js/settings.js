/**
 * 配置管理界面脚本
 */
document.addEventListener('DOMContentLoaded', () => {
    // 页面元素
    const providersContainer = document.getElementById('providers-container');
    const sidebarProvidersList = document.getElementById('sidebar-providers-list');
    const defaultProviderSelect = document.getElementById('default-provider');
    const saveProvidersButton = document.getElementById('save-providers');
    const addProviderButton = document.getElementById('add-provider');
    const notification = document.getElementById('notification');
    
    // 数据存储
    let providersData = null;
    let providerTypes = null; // 存储提供商类型列表
    let activeProviderIndex = 0; // 当前激活的提供商索引
    
    // 初始化
    init();
    
    /**
     * 初始化函数
     */
    async function init() {
        try {
            // 加载提供商类型
            await loadProviderTypes();
            
            // 加载提供商数据
            await loadProvidersData();
            
            // 设置事件监听器
            setupEventListeners();
        } catch (error) {
            console.error('初始化失败:', error);
            showNotification('加载配置失败，请刷新页面重试', true);
        }
    }
    
    /**
     * 加载提供商类型数据
     */
    async function loadProviderTypes() {
        try {
            const response = await fetch('/api/settings/provider-types');
            if (!response.ok) {
                throw new Error(`加载提供商类型失败: ${response.status}`);
            }
            
            providerTypes = await response.json();
            console.log('提供商类型加载成功:', providerTypes);
        } catch (error) {
            console.error('加载提供商类型失败:', error);
        }
    }
    
    /**
     * 加载提供商数据
     */
    async function loadProvidersData() {
        const response = await fetch('/api/settings/providers');
        if (!response.ok) {
            throw new Error(`加载失败: ${response.status}`);
        }
        
        providersData = await response.json();
        renderProvidersUI();
    }
    
    /** 保存/渲染后：用下拉选中项对应条目的名称写回 defaultProvider，否则 POST 里 defaultProvider 仍为 null，库不会更新 */
    function syncDefaultProviderFromSelectedProvider() {
        if (!providersData || !defaultProviderSelect || providersData.providers.length === 0) {
            return;
        }
        const i = defaultProviderSelect.selectedIndex;
        if (i >= 0 && i < providersData.providers.length) {
            const name = (providersData.providers[i].name || '').trim();
            if (name !== '') {
                providersData.defaultProvider = name;
                return;
            }
        }
        providersData.defaultProvider = defaultProviderSelect.value || '';
    }

    /**
     * 渲染提供商UI
     */
    function renderProvidersUI() {
        // 清空容器
        providersContainer.innerHTML = '';
        defaultProviderSelect.innerHTML = '';
        
        // 渲染侧边栏提供商列表
        renderSidebarProviders();
        
        // 渲染每个提供商卡片
        providersData.providers.forEach((provider, index) => {
            const providerCard = createProviderCard(provider, index);
            providersContainer.appendChild(providerCard);
            
            // 添加到默认提供商选择
            const option = document.createElement('option');
            option.value = provider.name;
            option.textContent = provider.name;
            defaultProviderSelect.appendChild(option);
            
            // 控制显示/隐藏
            if (index !== activeProviderIndex) {
                providerCard.style.display = 'none';
            }
        });
        
        if (providersData.defaultProvider) {
            defaultProviderSelect.value = providersData.defaultProvider;
        }
        syncDefaultProviderFromSelectedProvider();
    }
    
    /**
     * 渲染侧边栏提供商列表
     */
    function renderSidebarProviders() {
        // 清空侧边栏列表
        sidebarProvidersList.innerHTML = '';
        
        // 渲染每个提供商项
        providersData.providers.forEach((provider, index) => {
            const providerItem = document.createElement('div');
            providerItem.className = 'sidebar-provider-item';
            if (index === activeProviderIndex) {
                providerItem.classList.add('active');
            }
            providerItem.dataset.index = index;
            
            providerItem.innerHTML = `
                <div class="provider-icon">
                    ${provider.name.charAt(0).toUpperCase()}
                </div>
                ${provider.name || '新提供商'}
            `;
            
            // 添加点击事件
            providerItem.addEventListener('click', () => {
                // 更新激活索引
                activeProviderIndex = index;
                
                // 更新侧边栏选中状态
                document.querySelectorAll('.sidebar-provider-item').forEach(item => {
                    item.classList.remove('active');
                });
                providerItem.classList.add('active');
                
                // 显示对应的提供商卡片
                document.querySelectorAll('.provider-card').forEach((card, cardIndex) => {
                    card.style.display = cardIndex === index ? 'block' : 'none';
                });
            });
            
            sidebarProvidersList.appendChild(providerItem);
        });
    }
    
    /**
     * 创建提供商卡片
     */
    function createProviderCard(provider, index) {
        const card = document.createElement('div');
        card.className = 'provider-card';
        card.dataset.index = index;
        
        // 生成提供商类型选项
        const typeOptions = providerTypes.map(type => 
            `<option value="${type.value}" ${provider.type === type.value ? 'selected' : ''}>${type.label}</option>`
        ).join('');;
        
        card.innerHTML = `
            <div class="provider-card-header">
                <h3>${provider.name || '新提供商'}</h3>
                <button class="btn btn-danger btn-sm delete-provider">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
                        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/>
                    </svg>
                    删除
                </button>
            </div>
            <div class="provider-card-content">
                <div class="form-section">
                    <div class="form-section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                        </svg>
                        基本信息
                    </div>
                    <div class="form-grid">
                        <div class="form-row">
                            <label for="provider-name-${index}">提供商名称</label>
                            <input type="text" id="provider-name-${index}" value="${provider.name || ''}" placeholder="提供商名称">
                        </div>
                        <div class="form-row">
                            <label for="provider-type-${index}">提供商类型</label>
                            <select id="provider-type-${index}">
                                ${typeOptions}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="form-section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M14 6.5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5Zm-13-1A1.5 1.5 0 0 0 0 7v7a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 14V7a1.5 1.5 0 0 0-1.5-1.5h-13Z"/>
                            <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2H2V2Z"/>
                        </svg>
                        API配置
                    </div>
                    <div class="form-grid">
                        <div class="form-row">
                            <label for="provider-api-url-${index}">API URL</label>
                            <input type="text" id="provider-api-url-${index}" value="${provider.apiUrl || ''}" placeholder="https://api.example.com/v1">
                        </div>
                        <div class="form-row">
                            <label for="provider-api-key-${index}">API Key</label>
                            <div class="api-key-field">
                                <input type="password" id="provider-api-key-${index}" value="${provider.apiKey || ''}" placeholder="sk-...">
                                <button class="toggle-password" type="button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="form-section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 0 6v7zm1.5.5A.5.5 0 0 1 1 13V6a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-13z"/>
                        </svg>
                        模型配置
                    </div>
                    <div class="models-container">
                        ${provider.models && Array.isArray(provider.models) && provider.models.length > 0 ? 
                            provider.models.map((model, modelIndex) => `
                                <div class="model-item ${provider.defaultModel === model.value ? 'default-model' : ''}" data-model-index="${modelIndex}">
                                    <div class="model-radio">
                                        <input type="radio" 
                                            id="model-default-${index}-${modelIndex}" 
                                            name="default-model-${index}" 
                                            value="${model.value || ''}" 
                                            ${provider.defaultModel === model.value ? 'checked' : ''} 
                                            class="default-model-radio">
                                        <label for="model-default-${index}-${modelIndex}">默认</label>
                                    </div>
                                    <div class="model-values">
                                        <div class="model-value">
                                            <input type="text" placeholder="模型值" value="${model.value || ''}" class="model-value">
                                        </div>
                                        <div class="model-label">
                                            <input type="text" placeholder="显示名称" value="${model.label || ''}" class="model-label">
                                        </div>
                                    </div>
                                    <div class="model-actions">
                                        <button class="btn btn-danger btn-sm delete-model">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            `).join('') : ''
                        }
                    </div>
                    <div class="add-model" data-provider-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2H9v6a1 1 0 1 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
                        </svg>
                        添加模型
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }
    
    /**
     * 设置事件监听器
     */
    function setupEventListeners() {
        console.log('开始设置事件监听器...');
        
        // 保存提供商配置
        if (saveProvidersButton) {
            console.log('找到保存按钮，添加点击事件监听器');
            saveProvidersButton.addEventListener('click', saveProvidersConfig);
        } else {
            console.error('未找到保存按钮元素');
        }
        
        // 默认提供商改变时自动保存
        if (defaultProviderSelect) {
            console.log('找到默认提供商下拉框，添加change事件监听器');
            defaultProviderSelect.addEventListener('change', async function() {
                const selectedProvider = this.value;
                // 更新本地数据
                providersData.defaultProvider = selectedProvider;
                // 保存到服务器
                await saveDefaultProvider(selectedProvider);
            });
        } else {
            console.error('未找到默认提供商下拉框元素');
        }
        
        // 添加提供商
        if (addProviderButton) {
            console.log('找到添加提供商按钮，添加点击事件监听器');
            // 先移除可能已存在的事件监听器，防止重复添加
            addProviderButton.removeEventListener('click', addNewProvider);
            // 添加事件监听器
            addProviderButton.addEventListener('click', addNewProvider);
            // 为确保按钮可点击，添加额外调试信息
            console.log('添加提供商按钮状态:', {
                id: addProviderButton.id,
                className: addProviderButton.className,
                style: addProviderButton.style.cssText,
                disabled: addProviderButton.disabled,
                clientWidth: addProviderButton.clientWidth,
                clientHeight: addProviderButton.clientHeight,
                offsetParent: addProviderButton.offsetParent ? true : false
            });
        } else {
            console.error('未找到添加提供商按钮元素');
        }
        
        // 委托事件 - 删除提供商
        if (providersContainer) {
            console.log('为提供商容器添加委托事件(删除提供商)');
            providersContainer.addEventListener('click', event => {
                if (event.target.classList.contains('delete-provider')) {
                    deleteProvider(event);
                }
            });
        } else {
            console.error('未找到提供商容器元素');
        }
        
        // 委托事件 - 添加模型
        if (providersContainer) {
            console.log('为提供商容器添加委托事件(添加模型)');
            providersContainer.addEventListener('click', event => {
                const addModelButton = event.target.closest('.add-model');
                if (addModelButton) {
                    const providerIndex = addModelButton.dataset.providerIndex;
                    addModel(providerIndex);
                }
            });
        }
        
        // 委托事件 - 删除模型
        if (providersContainer) {
            console.log('为提供商容器添加委托事件(删除模型)');
            providersContainer.addEventListener('click', event => {
                if (event.target.classList.contains('delete-model')) {
                    deleteModel(event);
                }
            });
        }
        
        // 委托事件 - 切换默认模型
        if (providersContainer) {
            console.log('为提供商容器添加委托事件(切换默认模型)');
            providersContainer.addEventListener('change', event => {
                if (event.target.classList.contains('default-model-radio')) {
                    collectFormData();
                }
            });
        }
        
        // 委托事件 - 切换密码显示
        if (providersContainer) {
            console.log('为提供商容器添加委托事件(切换密码显示)');
            providersContainer.addEventListener('click', event => {
                if (event.target.closest('.toggle-password')) {
                    const button = event.target.closest('.toggle-password');
                    togglePasswordVisibility(button);
                }
            });
        }
        
        // 通知关闭按钮
        const notificationCloseBtn = document.querySelector('.notification .close');
        if (notificationCloseBtn) {
            console.log('找到通知关闭按钮，添加点击事件监听器');
            notificationCloseBtn.addEventListener('click', () => {
                notification.classList.remove('show');
            });
        }
        
        console.log('所有事件监听器设置完成');
    }
    
    /**
     * 保存并重载提供商配置
     * @param {Object} data 要保存的配置数据对象
     * @returns {Promise<void>}
     */
    async function saveAndReloadProviders(data) {
        // 发送到服务器并处理重载
        return fetch('/api/settings/providers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.error || '保存失败');
                });
            }
            
            // 更新本地数据
            providersData = data;
            
            // 保存成功后调用重载API
            return fetch('/api/settings/providers/reload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        })
        .then(reloadResponse => {
            if (reloadResponse.ok) {
                return reloadResponse.json().then(result => {
                    console.log('提供商配置已重载:', result);
                    showNotification('配置已保存并应用，无需重启服务器');
                });
            } else {
                console.warn('配置已保存，但无法自动应用');
                showNotification('配置已保存，但需要重启服务器才能应用更改', true);
            }
        })
        .catch(error => {
            console.error('配置操作失败:', error);
            showNotification(error.message || '操作失败', true);
            throw error; // 重新抛出错误，让调用者知道出错了
        })
        .finally(() => {
            // 无论成功失败都重新渲染UI
            renderProvidersUI();
        });
    }
    
    /**
     * 收集表单数据
     * 从表单中提取数据并更新providersData对象
     * @returns {boolean} 收集是否成功
     */
    function collectFormData() {
        try {
            // 收集表单数据
            const providerCards = providersContainer.querySelectorAll('.provider-card');
            
            providerCards.forEach(card => {
                const index = card.dataset.index;
                const provider = providersData.providers[index];
                if (!provider) return;

                // 获取基本信息
                const name = document.getElementById(`provider-name-${index}`).value.trim();
                const type = document.getElementById(`provider-type-${index}`).value.trim();
                const apiUrl = document.getElementById(`provider-api-url-${index}`).value.trim();
                const apiKey = document.getElementById(`provider-api-key-${index}`).value.trim();
                
                // 获取选中的默认模型
                const defaultModelRadio = card.querySelector('.default-model-radio:checked');
                const defaultModel = defaultModelRadio ? defaultModelRadio.value : '';
                
                // 更新基本信息
                provider.name = name;
                provider.type = type;
                provider.apiUrl = apiUrl;
                provider.apiKey = apiKey;
                provider.defaultModel = defaultModel;
                
                // 收集模型数据
                const models = [];
                const modelItems = card.querySelectorAll('.model-item');
                
                modelItems.forEach((item, mIndex) => {
                    try {
                        // 尝试不同的选择器找到正确的输入元素
                        let modelValueInput = item.querySelector('input.model-value');
                        if (!modelValueInput) {
                            modelValueInput = item.querySelector('.model-value input');
                        }
                        
                        let modelLabelInput = item.querySelector('input.model-label');
                        if (!modelLabelInput) {
                            modelLabelInput = item.querySelector('.model-label input');
                        }
                        
                        if (modelValueInput && modelLabelInput) {
                            const modelValue = modelValueInput.value.trim();
                            const modelLabel = modelLabelInput.value.trim();
                            
                            if (modelValue) { // 只添加有值的模型
                                models.push({
                                    value: modelValue,
                                    label: modelLabel || modelValue
                                });
                            }
                        }
                    } catch (modelError) {
                        console.error('处理模型项时出错:', modelError);
                    }
                });
                
                // 更新模型数据
                provider.models = models;
            });
            
            return true;
        } catch (error) {
            console.error('收集表单数据时出错:', error);
            return false;
        }
    }
    
    /**
     * 保存提供商配置
     */
    async function saveProvidersConfig() {
        try {
            // 收集表单数据
            if (!collectFormData()) {
                throw new Error('收集表单数据失败');
            }
            
            // 验证必填字段
            providersData.providers.forEach(provider => {
                if (!provider.name || !provider.apiUrl || !provider.apiKey) {
                    throw new Error('提供商名称、API URL和API Key不能为空');
                }
            });

            syncDefaultProviderFromSelectedProvider();

            // 保存配置
            await saveAndReloadProviders(providersData);
            
            showNotification('配置保存成功');
        } catch (error) {
            console.error('保存配置失败:', error);
            showNotification(error.message || '保存配置失败', true);
        }
    }
    
    /**
     * 添加新提供商
     */
    function addNewProvider() {
        try {
            console.log('开始添加新提供商');
            
            // 获取默认的提供商类型
            let defaultType = 'openai';
            
            // 如果已加载提供商类型列表，使用第一个作为默认
            if (providerTypes && providerTypes.length > 0) {
                defaultType = providerTypes[0].value;
                console.log(`使用提供商类型: ${defaultType}`);
            } 
            
            // 创建新提供商对象
            const newProvider = {
                name: '',
                type: defaultType,
                apiUrl: '',
                apiKey: '',
                defaultModel: '',
                models: []
            };
            
            console.log('新提供商对象已创建:', newProvider);
            
            // 检查providersData是否存在
            if (!providersData) {
                console.error('providersData对象不存在');
                providersData = { providers: [], defaultProvider: '' };
                console.log('已创建默认providersData对象');
            }
            
            // 检查providersData.providers是否是数组
            if (!Array.isArray(providersData.providers)) {
                console.error('providersData.providers不是数组');
                providersData.providers = [];
                console.log('已重置providersData.providers为空数组');
            }
            
            // 添加到数组
            providersData.providers.push(newProvider);
            console.log(`新提供商已添加，当前共有${providersData.providers.length}个提供商`);
            
            // 设置新添加的提供商为当前激活的提供商
            activeProviderIndex = providersData.providers.length - 1;
            console.log(`激活的提供商索引已更新为: ${activeProviderIndex}`);
            
            // 更新UI
            console.log('开始更新UI...');
            updateProviderFunctionality();
            console.log('UI更新完成');
            
            // 滚动到底部
            window.scrollTo(0, document.body.scrollHeight);
            console.log('已滚动到页面底部');
            
            console.log('添加新提供商完成');
        } catch (error) {
            console.error('添加新提供商时发生错误:', error);
            showNotification('添加新提供商失败: ' + (error.message || '未知错误'), true);
        }
    }
    
    /**
     * 删除提供商
     */
    async function deleteProvider(event) {
        // 获取提供商索引
        const card = event.target.closest('.provider-card');
        const index = parseInt(card.dataset.index);
        
        window.AIChatUI.showConfirm({
            title: '删除确认',
            message: '确定要删除这个提供商吗？',
            okText: '删除',
            cancelText: '取消',
            onConfirm: async () => {
                try {
                    // 删除提供商
                    providersData.providers.splice(index, 1);
                    
                    // 如果删除的是默认提供商，重置默认提供商
                    if (providersData.providers.length > 0 && providersData.defaultProvider === card.querySelector('#provider-name-' + index).value) {
                        providersData.defaultProvider = providersData.providers[0].name;
                    }
                    
                    // 更新激活的提供商索引
                    if (activeProviderIndex >= providersData.providers.length) {
                        activeProviderIndex = providersData.providers.length - 1;
                    }
                    if (activeProviderIndex < 0) {
                        activeProviderIndex = 0;
                    }
                    
                    // 保存更改并重载配置 - 这是关键变更
                    await saveAndReloadProviders(providersData);
                } catch (error) {
                    console.error('删除提供商失败:', error);
                    showNotification(error.message || '删除失败', true);
                    
                    // 更新UI，确保失败时UI仍然一致
                    updateProviderFunctionality();
                }
            }
        });
    }
    
    /**
     * 更新提供商功能
     * 在添加/删除提供商后统一处理UI更新
     */
    function updateProviderFunctionality() {
        // 重新渲染整个UI
        renderProvidersUI();
        
        // 如果没有提供商，显示默认内容
        if (providersData.providers.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="currentColor" viewBox="0 0 16 16" style="margin-bottom: 16px; opacity: 0.5;">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M4.285 12.433a.5.5 0 0 0 .683-.183A3.498 3.498 0 0 1 8 10.5c1.295 0 2.426.703 3.032 1.75a.5.5 0 0 0 .866-.5A4.498 4.498 0 0 0 8 9.5a4.5 4.5 0 0 0-3.898 2.25.5.5 0 0 0 .183.683zM7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5zm4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5z"/>
                    </svg>
                    <h3>暂无提供商</h3>
                    <p>请使用侧边栏的"添加新提供商"按钮添加您的第一个AI提供商</p>
                </div>
            `;
            providersContainer.appendChild(emptyMessage);
        }
        
        // 启用/禁用"保存"按钮
        const saveButton = document.getElementById('save-providers');
        if (providersData.providers.length === 0) {
            saveButton.disabled = true;
            saveButton.classList.add('disabled');
        } else {
            saveButton.disabled = false;
            saveButton.classList.remove('disabled');
        }
    }
    
    /**
     * 添加模型
     */
    function addModel(providerIndex) {
        // 确保providerIndex是数字类型
        providerIndex = parseInt(providerIndex);
        console.log(`添加模型到提供商[${providerIndex}]`);
        
        // 先保存当前表单数据
        collectFormData();
        
        // 获取提供商
        const provider = providersData.providers[providerIndex];
        if (!provider) {
            console.error('未找到对应索引的提供商:', providerIndex);
            showNotification('添加模型失败：未找到提供商', true);
            return;
        }
        
        // 初始化models数组（如果不存在）
        if (!provider.models) {
            provider.models = [];
        }
        
        // 创建新模型
        const newModel = {
            value: '',
            label: ''
        };
        
        // 添加新模型到数据中
        provider.models.push(newModel);
        
        // 如果这是第一个模型，将其设为默认
        if (provider.models.length === 1) {
            provider.defaultModel = newModel.value;
        }
        
        // 重新渲染UI
        renderProvidersUI();
        
        // 获取最新添加的模型输入框并设置焦点
        setTimeout(() => {
            try {
                const providerCard = document.querySelector(`.provider-card[data-index="${providerIndex}"]`);
                if (providerCard) {
                    // 尝试多种选择器来适应不同的DOM结构
                    let lastModelInput = providerCard.querySelector(`.model-item:last-child input.model-value`);
                    if (!lastModelInput) {
                        lastModelInput = providerCard.querySelector(`.model-item:last-child .model-value input`);
                    }
                    
                    if (lastModelInput) {
                        lastModelInput.focus();
                        console.log('成功设置新模型输入框的焦点');
                    } else {
                        console.warn('未能找到新模型的输入框');
                    }
                } else {
                    console.warn(`未找到索引为${providerIndex}的提供商卡片`);
                }
            } catch (focusError) {
                console.error('设置新模型焦点时出错:', focusError);
            }
        }, 100);
    }
    
    /**
     * 删除模型
     */
    function deleteModel(event) {
        // 先保存当前表单数据
        collectFormData();
        
        // 获取提供商和模型索引
        const card = event.target.closest('.provider-card');
        const providerIndex = parseInt(card.dataset.index);
        const modelItem = event.target.closest('.model-item');
        const modelIndex = parseInt(modelItem.dataset.modelIndex);
        
        // 获取模型值
        const modelValue = providersData.providers[providerIndex].models[modelIndex].value;
        
        // 删除模型
        providersData.providers[providerIndex].models.splice(modelIndex, 1);
        
        // 如果删除的是默认模型且还有其他模型，则设置第一个模型为默认
        if (providersData.providers[providerIndex].defaultModel === modelValue && 
            providersData.providers[providerIndex].models.length > 0) {
            providersData.providers[providerIndex].defaultModel = providersData.providers[providerIndex].models[0].value;
        } else if (providersData.providers[providerIndex].models.length === 0) {
            // 如果没有模型了，清空默认模型设置
            providersData.providers[providerIndex].defaultModel = '';
        }
        
        // 重新渲染UI
        renderProvidersUI();
    }
    
    /**
     * 切换密码可见性
     */
    function togglePasswordVisibility(button) {
        const input = button.previousElementSibling;
        
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                    <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                </svg>
            `;
        } else {
            input.type = 'password';
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                </svg>
            `;
        }
    }
    
    /**
     * 显示通知
     * @param {string} message 消息内容
     * @param {boolean} isError 是否为错误消息
     */
    function showNotification(message, isError = false) {
        // 获取通知元素
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        
        // 设置消息内容
        notificationText.textContent = message;
        
        // 设置样式
        notification.className = 'notification';
        if (isError) {
            notification.classList.add('error');
            notification.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
                <span id="notification-text">${message}</span>
            `;
        } else {
            notification.classList.add('success');
            notification.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>
                <span id="notification-text">${message}</span>
            `;
        }
        
        // 显示通知
        notification.classList.add('show');
        
        // 3秒后隐藏
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    /**
     * 保存默认提供商配置
     */
    async function saveDefaultProvider(providerName) {
        try {
            // 更新数据对象
            providersData.defaultProvider = providerName;
            
            // 发送到服务器 (使用与完整保存相同的端点)
            const response = await fetch('/api/settings/providers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(providersData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '保存失败');
            }
            
            // 调用重载API，确保配置立即生效（与其他保存操作一致）
            try {
                await fetch('/api/settings/providers/reload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.warn('重载配置失败:', error);
            }
        } catch (error) {
            console.error('保存默认提供商失败:', error);
            showNotification(error.message || '保存失败', true); // 保留错误通知
        }
    }
}); 