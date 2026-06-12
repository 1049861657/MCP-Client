/**
 * @param {unknown} text
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {unknown} text
 */
export function escapeAttr(text) {
  return escapeHtml(text).replace(/'/g, '&#39;');
}
