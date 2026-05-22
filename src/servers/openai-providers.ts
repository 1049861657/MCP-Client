import { ConfigService } from '../services/config.service.js';
import { Logger } from '../utils/logger.js';
import { OpenAI } from './openai.js';

export const providerServices: Record<string, OpenAI> = {};

export let openaiService: OpenAI | undefined;

let isInitialized = false;

export async function initializeProviders(): Promise<void> {
  try {
    const config = await ConfigService.getAIProvidersConfig();

    if (!config || !config.providers || config.providers.length === 0) {
      Logger.info('OPENAI', '数据库中没有提供商配置，需要先添加提供商');
      isInitialized = true;
      return;
    }

    for (const provider of config.providers) {
      providerServices[provider.name] = new OpenAI(provider);
    }

    const defaultProviderName = config.defaultProvider;
    if (defaultProviderName && providerServices[defaultProviderName]) {
      openaiService = providerServices[defaultProviderName];
      Logger.info('OPENAI', `使用默认提供商实例: ${defaultProviderName}`);
    } else if (config.providers.length > 0) {
      openaiService = providerServices[config.providers[0].name];
      Logger.info('OPENAI', `默认提供商未指定，使用第一个提供商: ${config.providers[0].name}`);
    }

    isInitialized = true;
    Logger.info('OPENAI', '所有AI提供商服务初始化完成');
  } catch (error) {
    Logger.error('OPENAI', '初始化AI提供商服务失败:', error);
    isInitialized = true;
  }
}

export async function getProviderService(providerName?: string): Promise<OpenAI> {
  if (!isInitialized) {
    await initializeProviders();
  }

  if (providerName && providerServices[providerName]) {
    return providerServices[providerName];
  }

  if (!openaiService) {
    throw new Error('无法获取有效的AI提供商服务，请先添加至少一个提供商');
  }

  return openaiService;
}

export async function getDefaultService(): Promise<OpenAI> {
  if (!isInitialized) {
    await initializeProviders();
  }

  if (!openaiService) {
    throw new Error('无法获取默认AI提供商服务，请先添加至少一个提供商');
  }

  return openaiService;
}

export async function reloadProviders(): Promise<{ providers: string[]; default: string }> {
  Logger.info('OPENAI', '开始重新加载AI提供商配置');

  try {
    const config = await ConfigService.getAIProvidersConfig();

    if (!config || !config.providers || config.providers.length === 0) {
      Object.keys(providerServices).forEach(key => {
        delete providerServices[key];
      });
      openaiService = undefined;

      return {
        providers: [],
        default: ''
      };
    }

    Object.keys(providerServices).forEach(key => {
      delete providerServices[key];
    });

    for (const provider of config.providers) {
      providerServices[provider.name] = new OpenAI(provider);
    }

    const fromDb =
      config.defaultProvider != null && String(config.defaultProvider).trim() !== ''
        ? String(config.defaultProvider).trim()
        : '';
    const runtimeDefault =
      fromDb || (config.providers.length > 0 ? config.providers[0].name : '');

    if (runtimeDefault && providerServices[runtimeDefault]) {
      openaiService = providerServices[runtimeDefault];
      if (fromDb) {
        Logger.info('OPENAI', `重新加载：默认提供商（来自数据库 Setting.defaultProvider）: ${runtimeDefault}`);
      } else {
        Logger.info(
          'OPENAI',
          `重新加载：数据库未写入 defaultProvider，进程内暂用第一个提供商: ${runtimeDefault}（保存配置时须把下拉选中项写入请求体 defaultProvider 才会落库）`
        );
      }
    } else {
      openaiService = undefined;
    }

    return {
      providers: Object.keys(providerServices),
      default: runtimeDefault
    };
  } catch (error) {
    Logger.error('OPENAI', '重新加载AI提供商配置失败:', error);
    throw error;
  }
}

initializeProviders().catch(error => {
  Logger.error('OPENAI', '自动初始化AI提供商服务失败:', error);
});
