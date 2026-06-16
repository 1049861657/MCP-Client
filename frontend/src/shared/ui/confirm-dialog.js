import { escapeHtml } from '../escape-html.js';

/**
 * 通用确认模态；返回用户是否确认。
 *
 * @param {{
 *   title: string;
 *   message?: string;
 *   confirmLabel?: string;
 *   cancelLabel?: string;
 *   variant?: 'default' | 'danger';
 *   showCancel?: boolean;
 * }} options
 * @returns {Promise<boolean>}
 */
export function confirmModal(options) {
  const {
    title,
    message = '',
    confirmLabel = '确认',
    cancelLabel = '取消',
    variant = 'default',
    showCancel = true,
  } = options;

  return new Promise((resolve) => {
    const modalId = `shared-confirm-${Math.random().toString(36).slice(2, 9)}`;
    let settled = false;

    /** @param {boolean} value */
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const shell = document.createElement('div');
    shell.id = modalId;
    shell.setAttribute('aria-hidden', 'true');
    shell.className =
      'fb-confirm-shell fixed inset-0 z-[120] hidden flex items-center justify-center overflow-y-auto p-4';

    const confirmBtnClass = variant === 'danger' ? 'btn-danger' : 'btn-primary';

    shell.innerHTML =
      '<div class="mx-auto w-full max-w-md">' +
      '<div class="fb-confirm-card">' +
      '<div class="fb-confirm-body">' +
      `<h2 id="${modalId}-title" class="fb-confirm-title m-0">${escapeHtml(title)}</h2>` +
      (message ? `<p class="fb-confirm-message m-0">${escapeHtml(message)}</p>` : '') +
      '</div>' +
      `<div class="fb-confirm-actions${showCancel ? '' : ' fb-confirm-actions--single'}">` +
      (showCancel
        ? `<button type="button" class="btn-secondary" data-role="cancel">${escapeHtml(cancelLabel)}</button>`
        : '') +
      `<button type="button" class="${confirmBtnClass}" data-role="confirm">${escapeHtml(confirmLabel)}</button>` +
      '</div></div></div>';

    document.body.appendChild(shell);

    /** @type {HTMLElement | null} */
    let backdrop = null;

    /** @type {((event: KeyboardEvent) => void) | null} */
    let onKeydown = null;

    const hide = () => {
      shell.classList.add('hidden');
      shell.setAttribute('aria-hidden', 'true');
      backdrop?.remove();
      backdrop = null;
      if (onKeydown) {
        document.removeEventListener('keydown', onKeydown);
        onKeydown = null;
      }
      shell.remove();
    };

    /** @param {boolean} value */
    const settleAndHide = (value) => {
      settle(value);
      hide();
    };

    shell.querySelector('[data-role="confirm"]')?.addEventListener('click', () => settleAndHide(true));
    shell.querySelector('[data-role="cancel"]')?.addEventListener('click', () => settleAndHide(false));

    shell.classList.remove('hidden');
    shell.setAttribute('aria-hidden', 'false');
    backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[119] bg-slate-900/42 backdrop-blur-[3px]';
    document.body.insertBefore(backdrop, shell);
    if (showCancel) {
      backdrop.addEventListener('click', () => settleAndHide(false));
      onKeydown = (event) => {
        if (event.key === 'Escape') {
          settleAndHide(false);
        }
      };
      document.addEventListener('keydown', onKeydown);
    }

    (showCancel ? shell.querySelector('[data-role="cancel"]') : shell.querySelector('[data-role="confirm"]'))?.focus();
  });
}
