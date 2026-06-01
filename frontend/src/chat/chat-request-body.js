/**
 * Web Chat HTTP 请求体构建。
 *
 * 显式字段须与 `src/channels/web/normalize-web-inbound.ts`
 * 中 `buildChatOptionsFromBody` 映射一致。
 * `enableTools === true` 时须始终发送 `mcpServerIds`（含 `[]`），覆盖 Profile 默认启用列表。
 *
 * @see normalizeWebInbound
 */

/**
 * 服务端 `buildChatOptionsFromBody` 识别的 body 键（顺序与 normalize 一致）。
 * @type {readonly string[]}
 */
export const CHAT_OPTION_BODY_FIELDS = [
  'enableTools',
  'enableParamValidation',
  'enablePrompts',
  'maxToolCallRounds',
  'enableAutoCompact',
  'model',
  'temperature',
  'maxTokens',
  'compactModel',
  'mcpServerIds',
];

/**
 * @typedef {object} BuildChatStreamRequestInput
 * @property {string} message 当前轮用户输入（与 messages 并存时服务端优先 messages）
 * @property {object[] | undefined} messages API 上下文（history / compact / override）
 * @property {string} model
 * @property {number} temperature
 * @property {number} maxTokens
 * @property {string} vendor 供应商 name，映射 envelope channelMeta.vendor
 * @property {boolean} enableTools
 * @property {boolean} enableParamValidation
 * @property {boolean} enablePrompts
 * @property {number} maxToolCallRounds
 * @property {boolean} enableAutoCompact
 * @property {string | undefined} compactModel
 * @property {string[] | undefined} mcpServerIds enableTools 为 true 时写入 body（含空数组表示不启用 MCP）
 */

/**
 * 构建 `/api/chat/stream` 与 `/api/chat` 共用请求体。
 *
 * @param {BuildChatStreamRequestInput} input
 * @returns {Record<string, unknown>}
 */
export function buildChatStreamRequestBody(input) {
  const {
    message,
    messages,
    model,
    temperature,
    maxTokens,
    vendor,
    enableTools,
    enableParamValidation,
    enablePrompts,
    maxToolCallRounds,
    enableAutoCompact,
    compactModel,
    mcpServerIds,
  } = input;

  /** @type {Record<string, unknown>} */
  const body = {
    message,
    model,
    temperature,
    maxTokens,
    vendor,
    enableTools,
    enableParamValidation,
    enablePrompts,
    maxToolCallRounds,
    enableAutoCompact,
    compactModel,
  };

  if (enableTools) {
    body.mcpServerIds = Array.isArray(mcpServerIds) ? mcpServerIds : [];
  }

  if (Array.isArray(messages) && messages.length > 0) {
    body.messages = messages;
  }

  return body;
}
