import { ConfigService } from '../services/config.service.js';
import { Logger } from '../utils/logger.js';
import { AiProvider } from './ai-provider.js';

export const providerServices: Record<string, AiProvider> = {};

export let aiService: AiProvider | undefined;

let isInitialized = false;

export async function initializeProviders(): Promise<void> {
  try {
    const config = await ConfigService.getAIProvidersConfig();

    if (!config || !config.providers || config.providers.length === 0) {
      Logger.info('AI', '数据库中没有提供商配置，需要先添加提供商');
      isInitialized = true;
      return;
    }

    for (const provider of config.providers) {
      providerServices[provider.name] = new AiProvider(provider);
    }

    const defaultProviderName = config.defaultProvider;
    if (defaultProviderName && providerServices[defaultProviderName]) {
      aiService = providerServices[defaultProviderName];
      Logger.info('AI', `使用默认提供商实例: ${defaultProviderName}`);
    } else if (config.providers.length > 0) {
      aiService = providerServices[config.providers[0].name];
      Logger.info('AI', `默认提供商未指定，使用第一个提供商: ${config.providers[0].name}`);
    }

    isInitialized = true;
    Logger.info('AI', '所有AI提供商服务初始化完成');
  } catch (error) {
    Logger.error('AI', '初始化AI提供商服务失败:', error);
    isInitialized = true;
  }
}

export async function getProviderService(providerName?: string): Promise<AiProvider> {
  if (!isInitialized) {
    await initializeProviders();
  }

  if (providerName && providerServices[providerName]) {
    return providerServices[providerName];
  }

  if (!aiService) {
    throw new Error('无法获取有效的AI提供商服务，请先添加至少一个提供商');
  }

  return aiService;
}

export async function getDefaultService(): Promise<AiProvider> {
  if (!isInitialized) {
    await initializeProviders();
  }

  if (!aiService) {
    throw new Error('无法获取默认AI提供商服务，请先添加至少一个提供商');
  }

  return aiService;
}

export async function reloadAiProviders(): Promise<{ providers: string[]; default: string }> {
  Logger.info('AI', '开始重新加载AI提供商配置');

  try {
    const config = await ConfigService.getAIProvidersConfig();

    if (!config || !config.providers || config.providers.length === 0) {
      Object.keys(providerServices).forEach(key => {
        delete providerServices[key];
      });
      aiService = undefined;

      return {
        providers: [],
        default: ''
      };
    }

    Object.keys(providerServices).forEach(key => {
      delete providerServices[key];
    });

    for (const provider of config.providers) {
      providerServices[provider.name] = new AiProvider(provider);
    }

    const fromDb =
      config.defaultProvider != null && String(config.defaultProvider).trim() !== ''
        ? String(config.defaultProvider).trim()
        : '';
    const runtimeDefault =
      fromDb || (config.providers.length > 0 ? config.providers[0].name : '');

    if (runtimeDefault && providerServices[runtimeDefault]) {
      aiService = providerServices[runtimeDefault];
      if (fromDb) {
        Logger.info('AI', `重新加载：默认提供商（来自数据库 Setting.defaultProvider）: ${runtimeDefault}`);
      } else {
        Logger.info(
          'AI',
          `重新加载：数据库未写入 defaultProvider，进程内暂用第一个提供商: ${runtimeDefault}（保存配置时须把下拉选中项写入请求体 defaultProvider 才会落库）`
        );
      }
    } else {
      aiService = undefined;
    }

    return {
      providers: Object.keys(providerServices),
      default: runtimeDefault
    };
  } catch (error) {
    Logger.error('AI', '重新加载AI提供商配置失败:', error);
    throw error;
  }
}

initializeProviders().catch(error => {
  Logger.error('AI', '自动初始化AI提供商服务失败:', error);
});
