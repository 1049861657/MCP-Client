/**
 * 特性 / 供应商 / 思考模式配置加载与下拉选项同步
 */

import { refreshDropdownSelect } from '../shared/ui/dropdown-select.js';

/**
 * @returns {Record<string, Function>}
 */
export function createConfigFetchMethods() {
  return {
    async fetchFeatureConfig() {
      try {
        console.log('正在加载特性配置...');

        const response = await fetch('/api/config/features');

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`获取特性配置失败: ${data.error}`);
        }

        if (data.success && data.config) {
          if (Array.isArray(data.config.systemTools)) {
            this.state.systemToolCatalog = data.config.systemTools;
            if (!this.state.enabledSystemToolNames?.length) {
              this.state.enabledSystemToolNames = data.config.systemTools.map(
                (tool) => tool.codeName,
              );
            }
          }
          if (data.config.tools) {
            this.state.enableMCPTools = data.config.tools.enableMCPTools;
            this.state.enablePrompts = data.config.tools.enablePrompts;

            if (this.elements.enableMCPTools) {
              this.elements.enableMCPTools.checked = this.state.enableMCPTools;
            }
            if (this.elements.enablePrompts) {
              this.elements.enablePrompts.checked = this.state.enablePrompts;
            }

            console.log('已更新工具配置:', {
              enableMCPTools: this.state.enableMCPTools,
              enablePrompts: this.state.enablePrompts,
            });
          }

          if (data.config.tools && typeof data.config.tools.maxToolCallRounds === 'number') {
            this.state.maxToolCallRounds = data.config.tools.maxToolCallRounds;
            if (this.elements.maxToolCallRounds) {
              this.elements.maxToolCallRounds.value = this.state.maxToolCallRounds;
            }
          }

          if (data.config.history) {
            this.state.enableMessageHistory = data.config.history.enableMessageHistory;
            this.state.messageHistoryCount = data.config.history.defaultMessageHistoryCount;

            if (this.elements.enableMessageHistory) {
              this.elements.enableMessageHistory.checked = this.state.enableMessageHistory;
            }
            if (this.elements.messageHistoryCount) {
              this.elements.messageHistoryCount.value = this.state.messageHistoryCount;
            }

            console.log('已更新历史记录配置:', {
              enableMessageHistory: this.state.enableMessageHistory,
              messageHistoryCount: this.state.messageHistoryCount,
            });
          }

          if (data.config.context) {
            if (typeof data.config.context.enableAutoCompact === 'boolean') {
              this.state.enableAutoCompact = data.config.context.enableAutoCompact;
              if (this.elements.enableAutoCompact) {
                this.elements.enableAutoCompact.checked = this.state.enableAutoCompact;
              }
            }
          }

          if (data.config.memory) {
            this.state.hindsightMemoryEnabled = data.config.memory.enabled === true;
          }
        }
      } catch (error) {
        console.error('加载特性配置失败:', error);
        throw error;
      }
    },

    async fetchProviderConfig() {
      try {
        console.log('开始获取供应商配置');
        const response = await fetch('/api/settings/providers', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status}`);
        }

        const config = await response.json();
        console.log('获取到供应商配置:', config);

        this.state.providers = {};
        config.providers.forEach((provider) => {
          const apiPath = '/api/chat';

          this.state.providers[provider.name] = {
            name: provider.name,
            apiPath,
            models: provider.models,
          };
        });

        this.state.isConfigLoaded = true;
        this.populateProviderSelect(config.defaultProvider);

        if (this.elements.provider && this.elements.provider.options.length > 0) {
          this.elements.provider.value = config.defaultProvider;
          this.updateModelOptions();
        }

        if (this.sessionStore.isAuthed()) {
          this.sessionStore
            .loadLatest()
            .then(() => this.updateSessionDisplay())
            .catch((error) => {
              console.error('自动加载最新会话失败:', error);
              this.sessionStore.newSession();
            });
        } else if (this.db.isReady && this.elements.provider) {
          console.log('尝试加载当前供应商的最新会话');

          setTimeout(() => {
            this.data
              .loadLatestProviderSession()
              .then(() => {
                this.updateSessionDisplay();
              })
              .catch((error) => console.error('自动加载最新会话失败:', error));
          }, 500);
        } else {
          console.log('数据库未就绪，创建新会话');
          this.data.createNewSession();
        }

        if (this.elements.sendButton) {
          this.elements.sendButton.disabled = false;
        }
      } catch (error) {
        console.error('加载供应商配置失败:', error);
        this.ui.showTooltip?.('无法加载供应商配置，请刷新页面重试');
        throw error;
      }
    },

    async fetchThinkingConfig() {
      try {
        console.log('获取思考模式配置');

        const thinkingConfig = {
          enabled: true,
          models: [
            'claude-3-5-sonnet-20240620',
            'gpt-4-0314',
            'gpt-4-0613',
            'gpt-4-1106-preview',
            'gpt-4-vision-preview',
            'gpt-4-turbo',
          ],
        };

        this.state.thinkingModels = thinkingConfig.models || [];
        this.state.showReasoning = thinkingConfig.enabled !== false;

        console.log('思考模式配置加载完成', {
          enabled: this.state.showReasoning,
          models: this.state.thinkingModels.length,
        });

        return thinkingConfig;
      } catch (error) {
        console.error('获取思考模式配置失败:', error);
        throw error;
      }
    },

    populateProviderSelect(defaultProviderName) {
      if (!this.elements.provider) {
        throw new Error('供应商下拉框元素不存在');
      }

      this.elements.provider.innerHTML = '';

      Object.keys(this.state.providers).forEach((providerName) => {
        const option = document.createElement('option');
        option.value = providerName;
        option.textContent = this.state.providers[providerName].name;
        this.elements.provider.appendChild(option);
      });

      if (defaultProviderName && this.state.providers[defaultProviderName]) {
        this.elements.provider.value = defaultProviderName;
      }
      refreshDropdownSelect(this.elements.provider);
    },

    updateModelOptions() {
      if (!this.state.isConfigLoaded) {
        return;
      }

      if (!this.elements.provider || !this.elements.model) {
        throw new Error('更新模型选项失败: provider或model元素不存在');
      }

      const provider = this.elements.provider.value;
      if (!this.state.providers[provider]) {
        throw new Error(`更新模型选项失败: 未找到供应商配置 ${provider}`);
      }

      const models = this.state.providers[provider].models;

      this.elements.model.innerHTML = '';

      models.forEach((model) => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.label;
        this.elements.model.appendChild(option);
      });

      refreshDropdownSelect(this.elements.model);
      this.updateCompactModelOptions();
    },

    updateCompactModelOptions() {
      if (!this.state.isConfigLoaded || !this.elements.compactModel) {
        return;
      }
      if (!this.elements.provider) {
        return;
      }

      const provider = this.elements.provider.value;
      if (!this.state.providers[provider]) {
        return;
      }

      const models = this.state.providers[provider].models;
      const prev = this.state.compactModel || this.elements.compactModel.value;

      this.elements.compactModel.innerHTML = '';
      models.forEach((model) => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.label;
        this.elements.compactModel.appendChild(option);
      });

      if (prev && this.elements.compactModel.querySelector(`option[value="${prev}"]`)) {
        this.elements.compactModel.value = prev;
      } else if (models.length > 0) {
        this.elements.compactModel.value = models[0].value;
      }

      this.state.compactModel = this.elements.compactModel.value;
      refreshDropdownSelect(this.elements.compactModel);
    },
  };
}
