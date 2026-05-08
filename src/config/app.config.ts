/**
 * 应用配置常量
 * 仅定义不变的应用常量
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProviderType } from '../generated/prisma/client.js';
import { ProviderTypeInfo } from '../types/config.types.js';

/**
 * 项目元数据：以 package.json 为单一真源（SSOT）
 * 编译后位置 dist/config/app.config.js → ../../package.json 即仓库根 package.json
 */
const pkg = JSON.parse(
  readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'),
    'utf8'
  )
) as { name: string; version: string };

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

/**
 * MCP 客户端身份信息
 * 作为 MCP SDK Client 构造时的握手参数（name / version / capabilities）
 * name / version 直接来自 package.json，避免双份维护
 */
export const MCPClientIdentity = {
  name: pkg.name,
  version: pkg.version,
  capabilities: {} as Record<string, unknown>
};
