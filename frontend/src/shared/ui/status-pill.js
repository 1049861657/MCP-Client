import { escapeHtml } from '../escape-html.js';

/** @typedef {'ok' | 'warn' | 'danger' | 'neutral'} StatusPillVariant */

/**
 * @param {string} label
 * @param {StatusPillVariant} [variant]
 */
export function renderStatusPill(label, variant = 'neutral') {
  return (
    `<span class="ui-status-pill ui-status-pill--${variant}" role="status">${escapeHtml(label)}</span>`
  );
}
