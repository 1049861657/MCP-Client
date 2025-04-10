/**
 * 配置相关的类型定义
 */

// 提供商类型
export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'custom';

// 提供商类型信息
export interface ProviderTypeInfo {
  value: ProviderType;
  label: string;
  apiPath: string;
}

// 模型接口
export interface AIModel {
  value: string;
  label: string;
}

// 提供商接口
export interface AIProvider {
  name: string;
  type: ProviderType;
  apiPath: string;
  apiUrl: string;
  apiKey: string;
  defaultModel: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  models: AIModel[];
}

// 提供商配置接口
export interface AIProvidersConfigType {
  providers: AIProvider[];
  defaultProvider: string;
}

// API设置配置接口
export interface APISettings {
  apiUrl: string;
  apiKey: string;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

// 用户设置接口
export interface UserSettings {
  [key: string]: APISettings;
} 