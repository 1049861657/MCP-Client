/** @typedef {'ok' | 'off' | 'warn' | 'pending' | 'danger'} StatusDotVariant */

/**
 * @param {StatusDotVariant | 'on' | 'err'} [variant]
 */
export function renderStatusDotHtml(variant = 'off') {
  const normalized =
    variant === 'on' ? 'ok' : variant === 'err' ? 'danger' : variant;
  return `<span class="ui-status-dot ui-status-dot--${normalized}" aria-hidden="true"></span>`;
}

/**
 * @param {HTMLElement | null} dot
 * @param {StatusDotVariant | 'on' | 'err'} [variant]
 */
export function setStatusDotElement(dot, variant = 'off') {
  if (!dot) {
    return;
  }
  const normalized =
    variant === 'on' ? 'ok' : variant === 'err' ? 'danger' : variant;
  dot.className = `ui-status-dot ui-status-dot--${normalized}`;
}
