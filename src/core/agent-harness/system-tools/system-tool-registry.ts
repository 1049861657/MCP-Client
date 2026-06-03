import { ChatTool } from '../types.js';
import {
  executeReadPersistedOutput,
  READ_PERSISTED_OUTPUT_CODE_NAME,
  readPersistedOutputSchema
} from './read-persisted-output.js';

/** System 工具输出策略：slice_only 在工具内分页/限幅，仍走 materializeToolOutput */
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
      '读取 agentOutputs 落盘文件。仅当 tool 结果为 type=tool_output_artifact 且需全文或更多行时调用。' +
      'path 为 toolCallId；大文件用 offset/limit（1-based 行号）分页。',
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
