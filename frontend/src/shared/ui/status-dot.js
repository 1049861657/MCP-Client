/** @typedef {'ok' | 'off' | 'warn' | 'pending' | 'danger'} StatusDotVariant */

/**
 * @param {StatusDotVariant | 'on' | 'err'} [variant]
 */
export function renderStatusDotHtml(variant = 'off') {
  const normalized =
    variant === 'on' ? 'ok' : variant === 'err' ? 'danger' : variant;
  return `<span class="ui-status-dot ui-status-dot--${normalized}" aria-hidden="true"></span>`;
}
