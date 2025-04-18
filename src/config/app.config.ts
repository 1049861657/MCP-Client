/**
 * 应用配置常量
 * 仅定义不变的应用常量，所有配置从数据库实时读取
 */
import { ProviderType } from '../../prisma/generated/index.js';
import { ProviderTypeInfo } from '../types/config.types.js';

/**
 * 定义提供商类型列表
 */
export const ProviderTypes: ProviderTypeInfo[] = [
  { value: ProviderType.OPENAI, label: 'OpenAI', apiPath: '/api/openai' }
];

/**
 * 应用程序基本信息
 */
export const AppConfig = {
  name: 'MCP-Client',
  version: '1.0.0',
  description: 'Model Context Protocol客户端 - 工具调用演示'
};

/**
 * 服务器基本配置
 */
export const ServerConfig = {
  port: 3000,
  host: 'localhost'
}; 