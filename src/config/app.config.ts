/**
 * 应用配置常量
 * 仅定义不变的应用常量
 */
import { ProviderType } from '../../prisma/generated/index.js';
import { ProviderTypeInfo } from '../types/config.types.js';

/**
 * 定义提供商类型列表
 */
export const ProviderTypes: ProviderTypeInfo[] = [
  { value: ProviderType.OPENAI, label: 'OpenAI' }
];

/**
 * 服务器基本配置
 */
export const ServerConfig = {
  port: 3000,
  host: 'localhost'
}; 