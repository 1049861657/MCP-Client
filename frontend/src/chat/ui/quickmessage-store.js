import { CHAT_QUICK_MESSAGES_KEY } from '../storage-contract.js';

/**
 * @param {unknown} data
 * @returns {{ messages: Array<{ id: string; sortId: number; content: string; result: string; category: string }>; categories: string[] }}
 */
function parseQuickMessagesResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('响应格式无效');
  }
  const payload = /** @type {{ messages?: unknown; categories?: unknown }} */ (data);
  if (!Array.isArray(payload.messages)) {
    throw new Error('响应缺少 messages');
  }
  if (!Array.isArray(payload.categories)) {
    throw new Error('响应缺少 categories');
  }
  return {
    messages: payload.messages,
    categories: payload.categories.filter((item) => typeof item === 'string' && item.trim().length > 0),
  };
}

/**
 * @param {Array<{ id: string; sortId: number; content: string; result: string; category: string }>} messages
 * @param {string[]} categories
 */
export function persistLocalQuickMessages(messages, categories) {
  localStorage.setItem(CHAT_QUICK_MESSAGES_KEY, JSON.stringify({ messages, categories }));
}

/**
 * 本地优先加载快捷消息：localStorage 有则用，无则拉服务端种子并落地（T4-02-04）。
 * @returns {Promise<{ messages: Array<{ id: string; sortId: number; content: string; result: string; category: string }>; categories: string[] }>}
 */
export async function loadLocalQuickMessages() {
  try {
    const raw = localStorage.getItem(CHAT_QUICK_MESSAGES_KEY);
    if (raw) {
      return parseQuickMessagesResponse(JSON.parse(raw));
    }
  } catch {
    // 本地数据损坏则回落服务端种子
  }
  const response = await fetch('/api/config/quick-messages');
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }
  const seed = parseQuickMessagesResponse(await response.json());
  persistLocalQuickMessages(seed.messages, seed.categories);
  return seed;
}
