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
 * @typedef {object} BuildChatStreamRequestInput
 * @property {string} message 当前轮用户输入（与 messages 并存时服务端优先 messages）
 * @property {object[] | undefined} messages API 上下文（history / compact / override）
 * @property {string} model
 * @property {number} temperature
 * @property {number} maxTokens
 * @property {string} vendor 供应商 name，映射 envelope channelMeta.vendor
 * @property {boolean} enableTools
 * @property {boolean} enablePrompts
 * @property {number} maxToolCallRounds
 * @property {'open'|'interactive'|'locked'} [permissionMode]
 * @property {string} sessionId 前端聊天会话 ID（权限会话键，必填）
 * @property {boolean} enableAutoCompact
 * @property {string | undefined} compactModel
 * @property {string[] | undefined} mcpServerIds enableTools 为 true 时写入 body（含空数组表示不启用 MCP）
 * @property {string[] | undefined} enabledSystemToolNames 启用的系统工具 codeName
 * @property {boolean} [skipMemory] 本次忽略 Hindsight 跨会话记忆
 * @property {{ messageHistoryCount?: number } | undefined} [contextOptions] authed 模式服务端组上下文裁剪参数（messages[] 不上行时随 body 上行）
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
    enablePrompts,
    maxToolCallRounds,
    enableAutoCompact,
    compactModel,
    mcpServerIds,
    enabledSystemToolNames,
    permissionMode,
    skipMemory,
    sessionId,
    contextOptions,
  } = input;

  /** @type {Record<string, unknown>} */
  const body = {
    message,
    model,
    temperature,
    maxTokens,
    vendor,
    enableTools,
    enablePrompts,
    maxToolCallRounds,
    enableAutoCompact,
    compactModel,
  };

  if (
    permissionMode === 'open' ||
    permissionMode === 'interactive' ||
    permissionMode === 'locked'
  ) {
    body.permissionMode = permissionMode;
  }

  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new Error('缺少 sessionId');
  }
  body.sessionId = sessionId.trim();

  if (enableTools) {
    body.mcpServerIds = Array.isArray(mcpServerIds) ? mcpServerIds : [];
  }

  if (Array.isArray(enabledSystemToolNames)) {
    body.enabledSystemToolNames = enabledSystemToolNames;
  }

  if (skipMemory === true) {
    body.skipMemory = true;
  }

  if (Array.isArray(messages) && messages.length > 0) {
    body.messages = messages;
  }

  if (contextOptions && typeof contextOptions.messageHistoryCount === 'number') {
    body.contextOptions = { messageHistoryCount: contextOptions.messageHistoryCount };
  }

  return body;
}
