/**
 * 应用配置常量
 * 仅定义不变的应用常量
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';

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
  host: 'localhost',
  /** Express JSON 解析上限（含 context-preview / compact 全量 messages） */
  jsonBodyLimit: '32mb',
};

/** MCP OAuth 回调路径（完整 URL 由运行时 host/port 或 MCP_OAUTH_REDIRECT_URL 拼出） */
export const McpOAuthConfig = {
  callbackPath: '/api/mcp/oauth/callback',
};

/**
 * 从环境变量解析 MCP roots 路径（`;` 或 `,` 分隔）。未设置则不开 roots 能力。
 */
export function parseMcpClientRootPathsFromEnv(): string[] {
  const raw = process.env.MCP_CLIENT_ROOTS?.trim();
  if (!raw) {
    return [];
  }
  return raw.split(/[;,]/).map((segment) => segment.trim()).filter((segment) => segment.length > 0);
}

/**
 * 构建 MCP 握手 capabilities（P2-01）：默认 sampling；MCP_CLIENT_ROOTS 非空时启用 roots
 */
export function buildMcpClientCapabilities(): ClientCapabilities {
  const capabilities: ClientCapabilities = {
    sampling: {},
  };
  if (parseMcpClientRootPathsFromEnv().length > 0) {
    capabilities.roots = { listChanged: false };
  }
  return capabilities;
}

/**
 * MCP 客户端身份信息
 * 作为 MCP SDK Client 构造时的握手参数（name / version / capabilities）
 * name / version 直接来自 package.json，避免双份维护
 */
export const MCPClientIdentity = {
  name: pkg.name,
  version: pkg.version,
  capabilities: buildMcpClientCapabilities(),
};
