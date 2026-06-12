import { escapeHtml } from '../escape-html.js';

/** @typedef {'default' | 'inline' | 'dashed' | 'error' | 'compact' | 'panel'} EmptyStateVariant */

/**
 * @param {{
 *   title?: string;
 *   message: string;
 *   variant?: EmptyStateVariant;
 *   className?: string;
 * }} options
 */
export function renderEmptyStateHtml(options) {
  const { title = '', message, variant = 'default', className = '' } = options;
  const baseClass = ['ui-empty-state', `ui-empty-state--${variant}`, className].filter(Boolean).join(' ');

  if (variant === 'inline' || variant === 'error' || variant === 'dashed' || variant === 'compact') {
    return `<p class="${baseClass}" role="status">${escapeHtml(message)}</p>`;
  }

  const titleHtml = title
    ? `<h3 class="ui-empty-state__title">${escapeHtml(title)}</h3>`
    : '';
  return (
    `<div class="${baseClass}" role="status">` +
    `${titleHtml}<p class="ui-empty-state__message">${escapeHtml(message)}</p></div>`
  );
}
