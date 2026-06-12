import { escapeHtml } from '../escape-html.js';

/** @typedef {'ok' | 'off' | 'pending' | 'warn' | 'danger'} StatusChipVariant */

/**
 * @param {string} value
 * @returns {StatusChipVariant}
 */
function normalizeStatusChipVariant(value) {
  if (value === 'on') {
    return 'ok';
  }
  if (value === 'err') {
    return 'danger';
  }
  if (value === 'ok' || value === 'off' || value === 'pending' || value === 'warn' || value === 'danger') {
    return value;
  }
  return 'off';
}

/**
 * @param {string} label
 * @param {StatusChipVariant | 'on' | 'err'} [variant]
 */
export function renderStatusChipHtml(label, variant = 'off') {
  const normalized = normalizeStatusChipVariant(variant);
  return (
    `<span class="ui-status-chip ui-status-chip--${normalized}" role="status">` +
    `<span class="ui-status-chip__dot" aria-hidden="true"></span>` +
    `<span class="ui-status-chip__label">${escapeHtml(label)}</span></span>`
  );
}

/**
 * @param {HTMLElement | null} root
 * @param {string} label
 * @param {StatusChipVariant | 'on' | 'err'} [variant]
 */
export function setStatusChipElement(root, label, variant = 'off') {
  if (!root) {
    return;
  }
  const normalized = normalizeStatusChipVariant(variant);
  root.className = `ui-status-chip ui-status-chip--${normalized}`;
  const dot = root.querySelector('.ui-status-chip__dot, .dot');
  if (dot instanceof HTMLElement) {
    dot.className = 'ui-status-chip__dot';
  }
  const labelEl = root.querySelector('.ui-status-chip__label, #h-status-text');
  if (labelEl) {
    labelEl.textContent = label;
  }
}
