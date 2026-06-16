/**
 * SSE data 行解析 — 纯函数，供 chat-api.js 流式处理使用
 */

/**
 * @param {string} raw
 * @returns {object[] | null}
 */
export function parseSseDataPayload(raw) {
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return [];
  }
  if (!/\}\s*\{/.test(trimmed)) {
    try {
      return [JSON.parse(trimmed)];
    } catch {
      return null;
    }
  }
  const parts = trimmed.split(/\}\s*\{/);
  const out = [];
  try {
    out.push(JSON.parse(`${parts[0]}}`));
    for (let k = 1; k < parts.length - 1; k++) {
      out.push(JSON.parse(`{${parts[k]}}`));
    }
    out.push(JSON.parse(`{${parts[parts.length - 1]}`));
  } catch {
    return null;
  }
  return out;
}

/**
 * @param {HTMLElement} messageDiv
 * @param {number} index
 * @param {string | undefined} toolCallId
 * @returns {HTMLElement | null}
 */
export function resolveToolCallElement(messageDiv, index, toolCallId) {
  const elements = messageDiv.querySelectorAll('.tool-call');
  if (!elements.length) {
    return null;
  }
  if (toolCallId) {
    const byId = Array.from(elements).find((el) => el.dataset.toolId === toolCallId);
    if (byId instanceof HTMLElement) {
      return byId;
    }
  }
  if (index >= 0 && elements[index] instanceof HTMLElement) {
    return elements[index];
  }
  const last = elements[elements.length - 1];
  return last instanceof HTMLElement ? last : null;
}
