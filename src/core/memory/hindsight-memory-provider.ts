import { createHash } from 'node:crypto';

import {
  HindsightClient,
  HindsightError,
  type RecallResponse
} from '@vectorize-io/hindsight-client';

import { parseMcpClientRootPathsFromEnv } from '../../config/app.config.js';
import {
  isHindsightMemoryConfigured,
  MemoryConfig
} from '../../config/feature-config.js';
import { logMemoryRecallAudit } from '../agent-harness/audit.js';
import { Logger } from '../../utils/logger.js';

const RECALL_LOG_TEXT_MAX = 300;

const MEMORY_SECTION_PREFIX =
  '## 跨会话记忆（Hindsight）\n\n' +
  '以下为历史会话中提取的用户偏好与项目约定。**当前任务进度、目录结构、工具实时观察结果以本会话上下文为准。**' +
  '若多条记忆矛盾，优先采纳含状态演变（曾为 X、现为 Y）的条目及本会话用户最新表述。';

const RECALL_TYPE_LABELS: Record<string, string> = {
  observation: '已巩固的偏好与模式',
  world: '项目约定与客观事实',
  experience: '相关经历'
};

let client: HindsightClient | null = null;
const ensuredBanks = new Set<string>();
const syncedBankConfigKeys = new Map<string, string>();

function resolveBankConfigSyncKey(): string {
  return [
    MemoryConfig.retainMission,
    MemoryConfig.observationsMission,
    MemoryConfig.retainExtractionMode
  ].join('\x1e');
}

/** 供 memory-debug 等同 bank 复用 */
export function getHindsightClient(): HindsightClient | null {
  if (!isHindsightMemoryConfigured()) {
    return null;
  }
  if (!client) {
    client = new HindsightClient({
      baseUrl: MemoryConfig.baseUrl,
      ...(MemoryConfig.apiKey ? { apiKey: MemoryConfig.apiKey } : {}),
      userAgent: 'mcp-client-harness/1.0'
    });
  }
  return client;
}

function formatHindsightError(error: unknown): string {
  if (error instanceof HindsightError) {
    const code = error.statusCode !== undefined ? ` status=${error.statusCode}` : '';
    return `${error.message}${code}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/** 可读 bullet 列表，避免 recallResponseToPromptString 的 FACTS JSON 噪音 */
export function formatRecallResultsForPrompt(response: RecallResponse): string {
  if (!response.results?.length) {
    return '';
  }

  const grouped = new Map<string, string[]>();
  for (const result of response.results) {
    const type = result.type ?? 'unknown';
    const texts = grouped.get(type) ?? [];
    const text = result.text?.trim();
    if (text) {
      texts.push(text);
    }
    grouped.set(type, texts);
  }

  const sections: string[] = [];
  for (const [type, texts] of grouped) {
    if (texts.length === 0) {
      continue;
    }
    const label = RECALL_TYPE_LABELS[type] ?? type;
    const bullets = texts.map((text) => `- ${text}`).join('\n');
    sections.push(`### ${label}\n${bullets}`);
  }

  return sections.join('\n\n');
}

function toRecallAuditResults(response: RecallResponse): Array<{ type: string; text: string }> {
  return (response.results ?? []).map((result) => ({
    type: result.type ?? 'unknown',
    text: (result.text ?? '').trim().slice(0, RECALL_LOG_TEXT_MAX)
  }));
}

function emitMemoryRecallLog(entry: {
  requestId?: string;
  bankId: string;
  query: string;
  skipped: boolean;
  skipReason?: string;
  resultCount: number;
  results: Array<{ type: string; text: string }>;
}): void {
  const requestId = entry.requestId?.trim();
  if (!requestId) {
    return;
  }

  logMemoryRecallAudit({
    requestId,
    bankId: entry.bankId,
    query: entry.query,
    skipped: entry.skipped,
    skipReason: entry.skipReason,
    resultCount: entry.resultCount,
    results: entry.results
  });
}

/** 对话日志：skipMemory / 未配置等跳过 recall 时调用 */
export function logMemoryRecallSkipped(
  requestId: string | undefined,
  options: { bankId: string; query: string; reason: string }
): void {
  emitMemoryRecallLog({
    requestId,
    bankId: options.bankId,
    query: options.query,
    skipped: true,
    skipReason: options.reason,
    resultCount: 0,
    results: []
  });
}

function resolveRetainDocumentId(documentSessionId?: string): string | undefined {
  const sessionId = documentSessionId?.trim();
  if (!sessionId) {
    return undefined;
  }
  const hash = createHash('sha256').update(sessionId).digest('hex').slice(0, 16);
  return `mcp-session-${hash}`;
}

/** 首期：prefix + 工作区首路径 hash；无 MCP_CLIENT_ROOTS 时用 default */
export function resolveHindsightBankId(): string {
  const roots = parseMcpClientRootPathsFromEnv();
  const scope = roots.length > 0 ? roots[0] : 'default';
  const hash = createHash('sha256').update(scope).digest('hex').slice(0, 12);
  return `${MemoryConfig.bankIdPrefix}-${hash}`;
}

async function syncBankRetainConfig(
  bankId: string,
  signal?: AbortSignal
): Promise<void> {
  const hindsight = getHindsightClient();
  if (!hindsight) {
    return;
  }

  try {
    await hindsight.updateBankConfig(bankId, {
      retainMission: MemoryConfig.retainMission,
      observationsMission: MemoryConfig.observationsMission,
      retainExtractionMode: MemoryConfig.retainExtractionMode,
      signal
    });
  } catch (error) {
    Logger.warn(
      'MEMORY',
      `updateBankConfig(${bankId}) failed: ${formatHindsightError(error)}`
    );
  }
}

export async function ensureHindsightBank(
  bankId: string,
  signal?: AbortSignal
): Promise<void> {
  const configSyncKey = resolveBankConfigSyncKey();
  if (ensuredBanks.has(bankId) && syncedBankConfigKeys.get(bankId) === configSyncKey) {
    return;
  }

  const hindsight = getHindsightClient();
  if (!hindsight) {
    return;
  }

  let bankExists = false;
  try {
    await hindsight.getBankProfile(bankId, { signal });
    bankExists = true;
  } catch {
    // bank 可能尚未创建
  }

  if (!bankExists) {
    try {
      await hindsight.createBank(bankId, {
        reflectMission:
          'You are a helpful assistant. Use stored preferences and project conventions when relevant.',
        signal
      });
    } catch (error) {
      if (
        !(error instanceof HindsightError && (error.statusCode === 409 || error.statusCode === 400))
      ) {
        Logger.warn('MEMORY', `createBank(${bankId}) failed: ${formatHindsightError(error)}`);
        return;
      }
    }
  }

  await syncBankRetainConfig(bankId, signal);
  ensuredBanks.add(bankId);
  syncedBankConfigKeys.set(bankId, configSyncKey);
}

export async function recallForPrompt(
  bankId: string,
  query: string,
  options?: { signal?: AbortSignal; requestId?: string }
): Promise<string> {
  const signal = options?.signal;
  const trimmedQuery = query.trim();
  const hindsight = getHindsightClient();
  if (!hindsight || !trimmedQuery) {
    return '';
  }

  try {
    await ensureHindsightBank(bankId, signal);
    const response = await hindsight.recall(bankId, trimmedQuery, {
      budget: 'mid',
      maxTokens: MemoryConfig.recallMaxTokens,
      types: [...MemoryConfig.recallTypes],
      signal
    });
    const auditResults = toRecallAuditResults(response);
    emitMemoryRecallLog({
      requestId: options?.requestId,
      bankId,
      query: trimmedQuery,
      skipped: false,
      resultCount: auditResults.length,
      results: auditResults
    });

    const body = formatRecallResultsForPrompt(response).trim();
    if (!body) {
      return '';
    }
    return `${MEMORY_SECTION_PREFIX}\n\n${body}`;
  } catch (error) {
    Logger.warn('MEMORY', `recall(${bankId}) failed: ${formatHindsightError(error)}`);
    return '';
  }
}

export async function retainConversation(
  bankId: string,
  content: string,
  options: {
    requestId?: string;
    documentSessionId?: string;
    conversationStartedAt?: string;
    signal?: AbortSignal;
  }
): Promise<void> {
  const hindsight = getHindsightClient();
  if (!hindsight || !content.trim()) {
    return;
  }

  const documentId = resolveRetainDocumentId(options.documentSessionId);

  try {
    await ensureHindsightBank(bankId, options.signal);
    await hindsight.retain(bankId, content, {
      async: true,
      context: MemoryConfig.retainContext,
      timestamp: options.conversationStartedAt ?? new Date().toISOString(),
      ...(documentId
        ? { documentId, updateMode: 'append' as const }
        : {}),
      ...(options.requestId
        ? { metadata: { requestId: options.requestId } }
        : {}),
      signal: options.signal
    });
    Logger.info(
      'MEMORY',
      `retain queued bank=${bankId} chars=${content.length}` +
        (documentId ? ` documentId=${documentId} mode=append` : '')
    );
  } catch (error) {
    Logger.warn('MEMORY', `retain(${bankId}) failed: ${formatHindsightError(error)}`);
  }
}
