import { readFileSync } from 'fs';
import { AIProvidersConfigType, ProviderTypeInfo, MCPConfigType } from '../types/config.types.js';
import { getProjectRoot, getConfigPath } from '../utils/path-util.js';

// 读取JSON配置文件
function loadJSONConfig<T>(filename: string): T {
  try {
    const filePath = getConfigPath(filename, import.meta.url);
    const fileContent = readFileSync(filePath, 'utf-8');
    console.log(`成功加载配置文件: ${filePath}`);
    return JSON.parse(fileContent) as T;
  } catch (error) {
    console.error(`加载配置文件失败: ${filename}`, error);
    return {} as T;
  }
}

// 定义提供商类型列表
export const ProviderTypes: ProviderTypeInfo[] = [
  { value: 'openai', label: 'OpenAI', apiPath: '/api/openai' }
];

// 加载AI提供商配置
const aiProvidersConfig = loadJSONConfig<AIProvidersConfigType>('ai-providers.json');

// 加载MCP配置
const mcpConfig = loadJSONConfig<MCPConfigType>('mcp-config.json');

// 加载快捷消息配置
const quickMessagesConfig = loadJSONConfig<any>('quick-messages.json');

/**
 * 重新加载配置并更新指定的配置对象
 * @param configName 配置文件名
 * @param targetConfig 需要更新的目标配置对象
 * @returns 成功返回true，失败返回false
 */
export function reloadConfigAndUpdate(configName: string, targetConfig: any): boolean {
  try {
    const newConfig = loadJSONConfig<any>(configName);
    Object.assign(targetConfig, newConfig);
    console.log(`${configName}配置已重新加载`);
    return true;
  } catch (error) {
    console.error(`重新加载配置失败: ${configName}`, error);
    return false;
  }
}

/**
 * 应用程序配置
 */
export const AppConfig = {
  name: 'MCP-Client',
  version: '1.0.0',
  description: 'Model Context Protocol客户端 - 工具调用演示'
};

/**
 * 服务器配置
 */
export const ServerConfig = {
  port: 3000,
  host: 'localhost'
};

/**
 * AI供应商配置
 */
export const AIProvidersConfig = aiProvidersConfig;

/**
 * MCP配置
 */
export const MCPConfig = mcpConfig;

/**
 * 快捷消息配置
 */
export const QuickMessagesConfig = quickMessagesConfig; 