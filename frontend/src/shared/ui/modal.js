/**
 * 最小确认模态；返回用户是否确认。
 *
 * @param {{ title: string; message?: string; confirmLabel?: string; cancelLabel?: string }} options
 * @returns {Promise<boolean>}
 */
export function confirmModal(options) {
  const {
    title,
    message = '',
    confirmLabel = '确认',
    cancelLabel = '取消',
  } = options;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'shared-modal-title');

    const panel = document.createElement('div');
    panel.className =
      'w-full max-w-sm rounded-lg border border-border bg-white p-5 shadow-xl';

    const titleEl = document.createElement('h2');
    titleEl.id = 'shared-modal-title';
    titleEl.className = 'text-base font-semibold text-text';
    titleEl.textContent = title;

    panel.appendChild(titleEl);

    if (message) {
      const body = document.createElement('p');
      body.className = 'mt-2 text-sm text-text-muted';
      body.textContent = message;
      panel.appendChild(body);
    }

    const actions = document.createElement('div');
    actions.className = 'mt-4 flex justify-end gap-2';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className =
      'rounded border border-border bg-white px-3 py-1.5 text-sm text-text hover:bg-page-bg';
    cancelBtn.textContent = cancelLabel;

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className =
      'rounded bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark';
    confirmBtn.textContent = confirmLabel;

    /** @param {boolean} value */
    const close = (value) => {
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
      resolve(value);
    };

    /** @param {KeyboardEvent} event */
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        close(false);
      }
    };

    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close(false);
      }
    });

    document.addEventListener('keydown', onKeyDown);

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    confirmBtn.focus();
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
