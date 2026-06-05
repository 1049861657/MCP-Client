/**
 * Chat 页客户端存储契约。
 *
 * 与 `data.js`、设置模态读写逻辑一致；后端不读取这些键。
 * 变更须同步 `frontend/src/chat/data.js`、`ui/settings-modal.js`、`api.js`。
 */

/** IndexedDB 库名（勿改，否则旧会话不可读） */
export const CHAT_DB_NAME = 'AIChatDatabase';

/** IndexedDB 版本（与 ai-data.js onupgradeneeded 一致） */
export const CHAT_DB_VERSION = 1;

/** messages 对象仓库名 */
export const CHAT_MESSAGES_STORE = 'messages';

/** messages 表索引（createIndex 名称） */
export const CHAT_DB_INDEX_SESSION = 'sessionId';
export const CHAT_DB_INDEX_TIMESTAMP = 'timestamp';
export const CHAT_DB_INDEX_PROVIDER = 'provider';

/** 新会话 ID 前缀，完整格式 `session_{yyyyMMdd-HHmmss}-{random}` */
export const CHAT_SESSION_ID_PREFIX = 'session_';

/** localStorage：聊天页 UI 偏好；MCP 勾选仅由 MCP 弹窗「保存」写入 enabledServerIds */
export const CHAT_SETTINGS_KEY = 'aiChatSettings';

/**
 * 压缩基线 localStorage 键前缀；完整键 `aiCompactBaseline:{sessionId}`。
 *
 * @param {string} sessionId
 * @returns {string}
 */
export function compactBaselineStorageKey(sessionId) {
  return `aiCompactBaseline:${sessionId || ''}`;
}

/**
 * @typedef {object} ChatSettingsStorage
 * @property {boolean} [isStreamMode] 始终流式（legacy 字段，加载时强制 true）
 * @property {string} [model] 当前模型 value
 * @property {boolean} [enableAutoCompact]
 * @property {string} [compactModel]
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 * @property {boolean} [enableMCPTools]
 * @property {boolean} [enablePrompts]
 * @property {boolean} [enableMessageHistory]
 * @property {number} [messageHistoryCount] 送入 API 的历史条数上限
 * @property {number} [maxToolCallRounds] 1–100
 * @property {'open'|'interactive'|'locked'} [permissionMode]
 * @property {string[]} [enabledServerIds] 用户勾选的 MCP server id
 * @property {string[]} [enabledSystemToolNames] 启用的系统工具 codeName
 */

/** @type {(keyof ChatSettingsStorage)[]} */
export const CHAT_SETTINGS_FIELDS = [
  'isStreamMode',
  'model',
  'enableAutoCompact',
  'compactModel',
  'temperature',
  'maxTokens',
  'enableMCPTools',
  'enablePrompts',
  'enableMessageHistory',
  'messageHistoryCount',
  'maxToolCallRounds',
  'permissionMode',
  'enabledServerIds',
  'enabledSystemToolNames',
];

/**
 * @typedef {object} CompactedBaselineStorage
 * @property {string} summaryContent 压缩摘要，作为 API 上下文首条 user 消息
 * @property {number} historyStartIndex messageHistory 中保留尾部的起始下标
 */

/**
 * @typedef {object} ChatIdbMessageRecord
 * @property {number} [id] autoIncrement 主键
 * @property {string} sessionId
 * @property {number} timestamp
 * @property {string} provider 发送时 vendor value
 * @property {object[]} messages 与 app.state.messageHistory 同构的 JSON 快照
 */
