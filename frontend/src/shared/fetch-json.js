/**
 * 带状态码校验的 JSON fetch；失败时抛出带上下文的 Error。
 *
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<unknown>}
 */
export async function fetchJson(url, init) {
  let response;

  try {
    response = await fetch(url, init);
  } catch (cause) {
    const error = new Error(`请求失败: ${url}`);
    error.cause = cause;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${url}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}
