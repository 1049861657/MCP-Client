import { LogConfig } from '../config/feature-config.js';
import type { ChatTool } from '../core/agent-harness/types.js';
import { Logger } from './logger.js';

let dumpSeq = 0;

/** LLM 请求前输出 tools schema（feature-config LogConfig.debugLlmTools） */
export function logLlmToolsIfEnabled(model: string, tools: readonly ChatTool[]): void {
  if (!LogConfig.debugLlmTools) {
    return;
  }
  dumpSeq += 1;
  Logger.debug(
    'LLM_TOOLS',
    `#${dumpSeq} model=${model} tools=${tools.length} tool_choice=auto\n${JSON.stringify(tools, null, 2)}`
  );
}
