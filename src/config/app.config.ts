import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AIProvidersConfigType, ProviderTypeInfo } from '../types/config.types.js';

// 获取当前目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 计算项目根目录路径（从当前目录向上两级：/config -> /src -> 项目根目录）
const projectRoot = join(__dirname, '..', '..');

// 读取JSON配置文件
function loadJSONConfig<T>(filename: string): T {
  try {
    const filePath = join(projectRoot, 'config', filename);
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
export const MCPConfig = {
  client: {
    name: "mcp-web-client",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  },
  servers: [
    {
      id: "echo-server",
      name: "Echo服务器",
      connectionType: "stdio",
      command: "node",
      args: ["dist/servers/echo-MCP.js"]
    },
    {
      id: "advanced-server",
      name: "高级工具服务器",
      connectionType: "stdio",
      command: "node",
      args: ["E:\\testProject\\MCP\\dist\\index.js"]
    },
    {
      id: "sse-server",
      name: "SSE服务器",
      connectionType: "sse",
      sseUrl: "http://192.168.1.173:3001/sse"
    }
  ],
  defaultServerId: "advanced-server",
  autoConnect: true,  // 是否在应用启动时自动连接服务器
  
  // MCP工具调用预设词
  toolPrompt: "先通过listAllApis获取可用的工具,然后根据用户的需求选择合适的工具,最后通过调用工具来解决问题。调用工具只能选择MCP列出来的tools。"
}; 