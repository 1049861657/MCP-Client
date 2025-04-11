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

// 连接类型
export type ConnectionType = 'stdio' | 'sse';

// MCP服务器配置接口
export interface MCPServer {
  id: string;
  name: string;
  connectionType: ConnectionType;
  command?: string;
  args?: string[];
  sseUrl?: string;
}

// MCP客户端配置接口
export interface MCPClient {
  name: string;
  version: string;
  capabilities: {
    tools: Record<string, any>;
  };
}

// MCP配置接口
export interface MCPConfigType {
  client: MCPClient;
  servers: MCPServer[];
  defaultServerId: string;
  autoConnect: boolean;
  toolPrompt: string;
} 