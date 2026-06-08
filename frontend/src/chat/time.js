/**
 * 聊天 UI 时间格式化工具（无 DOM 依赖部分）
 */

/**
 * @returns {string}
 */
export function getTimeString() {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * @returns {string}
 */
export function getFullTimeString() {
  const now = new Date();
  return now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * @param {number} startTime
 * @returns {number}
 */
export function calculateElapsedTime(startTime) {
  return Date.now() - startTime;
}

/**
 * @param {HTMLElement} container
 * @param {number | undefined} timeInSeconds
 */
export function updateThinkingTime(container, timeInSeconds) {
  if (!container) {
    throw new Error('更新思考时间容器不存在');
  }

  const timeSpan = container.querySelector('.thinking-time span');
  if (timeSpan && timeInSeconds !== undefined) {
    const seconds = parseFloat(String(timeInSeconds));
    timeSpan.textContent = Number.isNaN(seconds) ? '0秒' : `${seconds}秒`;
  }
}

/**
 * @param {HTMLElement} messageDiv
 * @param {HTMLElement} container
 * @param {number | undefined} timeInSeconds
 */
export function saveThinkingTimeData(messageDiv, container, timeInSeconds) {
  if (!messageDiv || !container || timeInSeconds === undefined) {
    throw new Error('保存思考时间参数无效');
  }

  container.dataset.thinkingTime = String(timeInSeconds);
  messageDiv.dataset.aiThinkingTime = String(timeInSeconds);
}

/**
 * @param {number} milliseconds
 * @returns {string}
 */
export function formatElapsedTime(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds}毫秒`;
  }
  const seconds = (milliseconds / 1000).toFixed(2);
  return `${seconds}秒`;
}

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function formatMemoryMentionedAt(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
