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
 * 获取资源文件的完整路径
 * @param resourcePath 资源文件相对于项目根目录的路径
 * @param importMetaUrl 当前模块的import.meta.url
 * @returns 资源文件的完整路径
 */
export function getResourcePath(resourcePath: string, importMetaUrl: string): string {
  const root = getProjectRoot(importMetaUrl);
  return join(root, resourcePath);
} 