import { ChatTool } from '../types.js';
import {
  executeReadPersistedOutput,
  READ_PERSISTED_OUTPUT_CODE_NAME,
  readPersistedOutputSchema
} from './read-persisted-output.js';

/** System 工具输出策略：slice_only 在工具内分页/限幅，仍走统一 persistLargeOutput */
export type SystemToolOutputPolicy = 'default' | 'slice_only';

export interface SystemToolContext {
  signal?: AbortSignal;
}

type SystemToolExecutor = (
  args: Record<string, unknown>,
  ctx: SystemToolContext
) => Promise<string>;

interface SystemToolEntry {
  codeName: string;
  description: string;
  outputPolicy: SystemToolOutputPolicy;
  parameters: typeof readPersistedOutputSchema;
  execute: SystemToolExecutor;
}

const REGISTRY: SystemToolEntry[] = [
  {
    codeName: READ_PERSISTED_OUTPUT_CODE_NAME,
    outputPolicy: 'slice_only',
    description:
      '读取 agentOutputs 中落盘的大段 tool 输出（Harness 超阈自动落盘）。' +
      '当且仅当某次 tool 结果含 <persisted-output> 且需要完整内容或更多行时调用；' +
      '无该标签或预览已够回答用户时不要调用。' +
      'path 为 tool_call_id、文件名或落盘消息中的路径；大文件先不传 offset/limit 得 PARTIAL，续读用 1-based 的 offset/limit 分页。',
    parameters: readPersistedOutputSchema,
    execute: (args, _ctx) => executeReadPersistedOutput(args)
  }
];

const REGISTRY_BY_NAME = new Map(REGISTRY.map(entry => [entry.codeName, entry]));

export function isSystemTool(codeName: string): boolean {
  return REGISTRY_BY_NAME.has(codeName);
}

export function getSystemToolOutputPolicy(codeName: string): SystemToolOutputPolicy {
  return REGISTRY_BY_NAME.get(codeName)?.outputPolicy ?? 'default';
}

/** 转为 OpenAI tools[]（enableSystemTools 为 true 时注入） */
export function getSystemToolSchemas(): ChatTool[] {
  return REGISTRY.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.codeName,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

export async function executeSystemTool(
  codeName: string,
  args: Record<string, unknown>,
  ctx: SystemToolContext = {}
): Promise<string> {
  const entry = REGISTRY_BY_NAME.get(codeName);
  if (!entry) {
    throw new Error(`未注册的 System 工具: ${codeName}`);
  }

  return entry.execute(args, ctx);
}
