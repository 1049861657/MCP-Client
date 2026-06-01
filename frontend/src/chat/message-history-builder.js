/**
 * 消息历史 ↔ OpenAI API messages 转换（P0-03）
 */

/**
 * @param {object} entry
 * @returns {Array<{ role: string; content?: string; tool_calls?: unknown[]; tool_call_id?: string; reasoning_content?: string }>}
 */
export function entryToApiMessages(entry) {
  if (!entry || !entry.role) {
    return [];
  }

  if (entry.role === 'user') {
    return [{ role: 'user', content: entry.content ?? '' }];
  }

  if (entry.role === 'tool') {
    return [
      {
        role: 'tool',
        content: stringifyToolContent(entry.content),
        tool_call_id: entry.tool_call_id,
      },
    ];
  }

  if (entry.role === 'assistant') {
    const apiMessages = [];
    const assistant = {
      role: 'assistant',
      content: entry.content ?? '',
    };

    const reasoning = entry.reasoning_content ?? entry.reasoning;
    if (reasoning) {
      assistant.reasoning_content = reasoning;
    }

    const toolCalls = entry.tool_calls ?? buildToolCallsFromStored(entry.toolCalls);
    if (toolCalls.length > 0) {
      assistant.tool_calls = toolCalls;
    }

    apiMessages.push(assistant);

    if (!entry._toolResultsExpanded && entry.toolCalls?.length > 0) {
      for (const tc of entry.toolCalls) {
        if (tc.result === null || tc.result === undefined) {
          continue;
        }
        apiMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: stringifyToolContent(tc.result),
        });
      }
    }

    return apiMessages;
  }

  return [];
}

/**
 * @param {object[]} history
 * @param {number} count
 * @returns {object[]}
 */
export function buildApiMessagesFromHistory(history, count) {
  const recent = history.slice(-count);
  const apiMessages = [];

  for (const entry of recent) {
    if (entry.role === 'tool') {
      apiMessages.push({
        role: 'tool',
        content: stringifyToolContent(entry.content),
        tool_call_id: entry.tool_call_id,
      });
      continue;
    }
    apiMessages.push(...entryToApiMessages(entry));
  }

  return apiMessages;
}

/**
 * @param {object[] | undefined} toolCalls
 * @returns {object[]}
 */
export function buildToolCallsFromStored(toolCalls) {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return [];
  }
  return toolCalls.map((tc) => ({
    id: tc.id,
    type: 'function',
    function: {
      name: tc.name,
      arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args ?? {}),
    },
  }));
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function stringifyToolContent(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null && value._truncated === true) {
    return JSON.stringify(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
