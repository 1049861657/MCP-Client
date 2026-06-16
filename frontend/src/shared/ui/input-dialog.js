import { escapeAttr, escapeHtml } from '../escape-html.js';

/**
 * 通用单行输入模态（替代 `window.prompt`）；取消返回 `null`，确认返回输入字符串（未 trim）。
 *
 * @param {{
 *   title: string;
 *   message?: string;
 *   label?: string;
 *   defaultValue?: string;
 *   placeholder?: string;
 *   confirmLabel?: string;
 *   cancelLabel?: string;
 *   inputType?: 'text' | 'password';
 * }} options
 * @returns {Promise<string | null>}
 */
export function inputDialog(options) {
  const {
    title,
    message = '',
    label = '',
    defaultValue = '',
    placeholder = '',
    confirmLabel = '确认',
    cancelLabel = '取消',
    inputType = 'text',
  } = options;

  return new Promise((resolve) => {
    const modalId = `shared-input-${Math.random().toString(36).slice(2, 9)}`;
    let settled = false;

    /** @param {string | null} value */
    const settle = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    const shell = document.createElement('div');
    shell.id = modalId;
    shell.setAttribute('aria-hidden', 'true');
    shell.className =
      'fb-confirm-shell fixed inset-0 z-[120] hidden flex items-center justify-center overflow-y-auto p-4';

    const fieldLabel = label
      ? `<label class="ui-field-label ui-field-label--spaced" for="${modalId}-input">${escapeHtml(label)}</label>`
      : '';

    shell.innerHTML =
      '<div class="mx-auto w-full max-w-md">' +
      '<div class="fb-confirm-card">' +
      '<div class="fb-confirm-body">' +
      `<h2 id="${modalId}-title" class="fb-confirm-title m-0">${escapeHtml(title)}</h2>` +
      (message ? `<p class="fb-confirm-message m-0">${escapeHtml(message)}</p>` : '') +
      `<div class="fb-confirm-field">${fieldLabel}` +
      `<input id="${modalId}-input" type="${inputType === 'password' ? 'password' : 'text'}" data-role="input" class="ui-field-input" value="${escapeAttr(defaultValue)}" placeholder="${escapeAttr(placeholder)}" autocomplete="off">` +
      '</div></div>' +
      '<div class="fb-confirm-actions">' +
      `<button type="button" class="btn-secondary" data-role="cancel">${escapeHtml(cancelLabel)}</button>` +
      `<button type="button" class="btn-primary" data-role="confirm">${escapeHtml(confirmLabel)}</button>` +
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

    /** @param {string | null} value */
    const settleAndHide = (value) => {
      settle(value);
      hide();
    };

    const inputEl = shell.querySelector('[data-role="input"]');
    if (!(inputEl instanceof HTMLInputElement)) {
      settleAndHide(null);
      return;
    }

    const confirm = () => settleAndHide(inputEl.value);

    shell.querySelector('[data-role="confirm"]')?.addEventListener('click', confirm);
    shell.querySelector('[data-role="cancel"]')?.addEventListener('click', () => settleAndHide(null));

    inputEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirm();
      }
    });

    shell.classList.remove('hidden');
    shell.setAttribute('aria-hidden', 'false');
    backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[119] bg-slate-900/42 backdrop-blur-[3px]';
    document.body.insertBefore(backdrop, shell);
    backdrop.addEventListener('click', () => settleAndHide(null));
    onKeydown = (event) => {
      if (event.key === 'Escape') {
        settleAndHide(null);
      }
    };
    document.addEventListener('keydown', onKeydown);

    inputEl.focus();
    inputEl.select();
  });
}
