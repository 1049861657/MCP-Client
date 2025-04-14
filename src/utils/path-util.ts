import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * 路径工具类
 * 提供项目路径相关的工具函数
 */

/**
 * 获取项目根目录路径
 * @param importMetaUrl 当前模块的import.meta.url
 * @returns 项目根目录的绝对路径
 */
export function getProjectRoot(importMetaUrl: string): string {
  const filename = fileURLToPath(importMetaUrl);
  const dirPath = dirname(filename);
  
  // 从源文件路径向上计算项目根目录
  // 这里假设utils在src下，所以向上两级是根目录
  return join(dirPath, '..', '..');
}

/**
 * 获取配置文件的完整路径
 * @param configFileName 配置文件名称
 * @param importMetaUrl 当前模块的import.meta.url
 * @returns 配置文件的完整路径
 */
export function getConfigPath(configFileName: string, importMetaUrl: string): string {
  const root = getProjectRoot(importMetaUrl);
  return join(root, 'config', configFileName);
}

/**
 * 获取MCP配置文件路径
 * @param importMetaUrl 当前模块的import.meta.url
 * @returns MCP配置文件的完整路径
 */
export function getMCPConfigPath(importMetaUrl: string): string {
  return getConfigPath('mcp-config.json', importMetaUrl);
}

/**
 * 获取AI提供商配置文件路径
 * @param importMetaUrl 当前模块的import.meta.url
 * @returns AI提供商配置文件的完整路径
 */
export function getAIProvidersConfigPath(importMetaUrl: string): string {
  return getConfigPath('ai-providers.json', importMetaUrl);
}

/**
 * 获取快捷消息配置文件路径
 * @param importMetaUrl 当前模块的import.meta.url
 * @returns 快捷消息配置文件的完整路径
 */
export function getQuickMessagesConfigPath(importMetaUrl: string): string {
  return getConfigPath('quick-messages.json', importMetaUrl);
} 