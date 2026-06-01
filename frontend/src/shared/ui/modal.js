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
    const overlay = document.createElement('div');
    overlay.className = 'app-confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'shared-modal-title');

    const panel = document.createElement('div');
    panel.className = 'app-confirm-panel';

    const titleEl = document.createElement('h2');
    titleEl.id = 'shared-modal-title';
    titleEl.className = 'app-confirm-title';
    titleEl.textContent = title;
    panel.appendChild(titleEl);

    if (message) {
      const body = document.createElement('p');
      body.className = 'app-confirm-message';
      body.textContent = message;
      panel.appendChild(body);
    }

    const actions = document.createElement('div');
    actions.className = `app-confirm-actions${showCancel ? '' : ' app-confirm-actions--single'}`;

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = `app-confirm-btn app-confirm-btn--${variant === 'danger' ? 'danger' : 'primary'}`;
    confirmBtn.textContent = confirmLabel;

    /** @param {boolean} value */
    const close = (value) => {
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
      resolve(value);
    };

    /** @param {KeyboardEvent} event */
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && showCancel) {
        close(false);
      }
    };

    confirmBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay && showCancel) {
        close(false);
      }
    });

    document.addEventListener('keydown', onKeyDown);

    if (showCancel) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'app-confirm-btn app-confirm-btn--ghost';
      cancelBtn.textContent = cancelLabel;
      cancelBtn.addEventListener('click', () => close(false));
      actions.appendChild(cancelBtn);
    }

    actions.appendChild(confirmBtn);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    (showCancel ? actions.querySelector('.app-confirm-btn--ghost') : confirmBtn)?.focus();
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
