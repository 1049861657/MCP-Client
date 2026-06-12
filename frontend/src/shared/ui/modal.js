import { Modal } from 'flowbite';
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
    shell.tabIndex = -1;
    shell.setAttribute('aria-hidden', 'true');
    shell.className =
      'fb-confirm-shell fixed top-0 right-0 left-0 z-[120] hidden h-[calc(100%-1rem)] max-h-full w-full overflow-x-hidden overflow-y-auto p-4 md:inset-0';

    shell.innerHTML =
      '<div class="relative mx-auto w-full max-w-md p-4">' +
      '<div class="fb-confirm-card relative">' +
      '<div class="border-b border-[rgb(15_23_42/0.06)] px-5 pt-5 pb-4">' +
      `<h2 id="${modalId}-title" class="fb-confirm-title m-0">${escapeHtml(title)}</h2>` +
      (message ? `<p class="fb-confirm-message m-0 mt-2">${escapeHtml(message)}</p>` : '') +
      '</div>' +
      `<div class="flex px-5 py-4 ${showCancel ? 'fb-confirm-actions' : 'fb-confirm-actions fb-confirm-actions--single'}">` +
      (showCancel
        ? `<button type="button" class="fb-confirm-btn fb-confirm-btn--ghost" data-role="cancel">${escapeHtml(cancelLabel)}</button>`
        : '') +
      `<button type="button" class="fb-confirm-btn ${variant === 'danger' ? 'fb-confirm-btn--danger' : 'fb-confirm-btn--primary'}" data-role="confirm">${escapeHtml(confirmLabel)}</button>` +
      '</div></div></div>';

    document.body.appendChild(shell);

    const modal = new Modal(shell, {
      placement: 'center',
      backdrop: 'dynamic',
      backdropClasses: 'fixed inset-0 z-[119] bg-slate-900/42 backdrop-blur-[3px]',
      closable: showCancel,
      onHide: () => {
        settle(false);
        modal.destroyAndRemoveInstance();
        shell.remove();
      },
    });

    shell.querySelector('[data-role="confirm"]')?.addEventListener('click', () => {
      settle(true);
      modal.hide();
    });
    shell.querySelector('[data-role="cancel"]')?.addEventListener('click', () => {
      settle(false);
      modal.hide();
    });

    modal.show();
    (showCancel ? shell.querySelector('[data-role="cancel"]') : shell.querySelector('[data-role="confirm"]'))?.focus();
  });
}

/**
 * @param {HTMLElement} panel
 */
export function hideModal(panel) {
  panel.classList.add('hidden');
  panel.setAttribute('aria-hidden', 'true');
}

/**
 * @param {HTMLElement} panel
 */
export function showModal(panel) {
  panel.classList.remove('hidden');
  panel.setAttribute('aria-hidden', 'false');
}
