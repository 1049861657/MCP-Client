import { OpenAITool } from '../types.js';
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
      '读取此前落盘的大 tool 输出。含 <persisted-output> 时 path 传 tool_call_id 或落盘路径；' +
      '大文件默认 PARTIAL 预览，续读请传 offset/limit 分页。',
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
export function getSystemToolSchemas(): OpenAITool[] {
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

/** 系统 prompt 补充：落盘读回说明 */
export function buildSystemToolsPromptHint(): string {
  return (
    '当 tool 结果出现 <persisted-output> 时，用 read_persisted_output 读取；' +
    '大文件默认只返回 PARTIAL 预览，需 offset/limit 分页续读。'
  );
}
