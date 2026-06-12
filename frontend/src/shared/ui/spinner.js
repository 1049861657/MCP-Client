import { escapeHtml } from '../escape-html.js';

/** @typedef {'sm' | 'md' | 'lg'} SpinnerSize */

/**
 * @param {{ size?: SpinnerSize; className?: string; label?: string }} [options]
 */
export function renderSpinnerHtml(options = {}) {
  const { size = 'md', className = '', label = '' } = options;
  const sizeClass =
    size === 'sm' ? 'ui-spinner--sm' : size === 'lg' ? 'ui-spinner--lg' : 'ui-spinner--md';
  const labelHtml = label
    ? `<span class="ui-spinner-block__label">${escapeHtml(label)}</span>`
    : '';
  return (
    `<span class="ui-spinner-block ${className}" role="status">` +
    `<span class="ui-spinner ${sizeClass}" aria-hidden="true"></span>${labelHtml}</span>`
  );
}

/**
 * @param {HTMLButtonElement | null | undefined} button
 * @param {boolean} loading
 * @param {{ label?: string; restoreLabel?: string }} [options]
 */
export function setButtonLoading(button, loading, options = {}) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  if (loading) {
    if (!button.dataset.uiLoadingLabel) {
      button.dataset.uiLoadingLabel = button.textContent?.trim() ?? '';
    }
    button.classList.add('is-loading');
    button.disabled = true;
    if (options.label) {
      button.textContent = options.label;
    }
    return;
  }
  button.classList.remove('is-loading');
  button.disabled = false;
  const restore = options.restoreLabel ?? button.dataset.uiLoadingLabel ?? '';
  if (restore) {
    button.textContent = restore;
  }
  delete button.dataset.uiLoadingLabel;
}
