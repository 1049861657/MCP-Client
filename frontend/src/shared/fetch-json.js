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
    response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      ...init,
    });
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

/**
 * POST JSON；解析 `{ success, error }` 业务错误体。
 *
 * @param {string} url
 * @param {unknown} body
 * @param {AbortSignal} [signal]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function postApiJson(url, body, signal) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    const error = new Error(`请求失败: ${url}`);
    error.cause = cause;
    throw error;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    const message =
      (data && typeof data.error === 'string' && data.error) || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}
