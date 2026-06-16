const DEFAULT_DURATION_MS = 3200;

const CHECK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4" aria-hidden="true"><path d="M13.485 3.515a1 1 0 0 1 0 1.414l-7.07 7.071-3.536-3.536a1 1 0 1 1 1.414-1.415l2.122 2.122 6.364-6.364a1 1 0 0 1 1.414 0z"/></svg>';

const CLOSE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z"/></svg>';

/** @type {HTMLElement | null} */
let container = null;

/**
 * @returns {HTMLElement}
 */
function getContainer() {
  if (container && document.body.contains(container)) {
    return container;
  }

  container = document.createElement('div');
  container.id = 'shared-toast-container';
  container.className = 'fb-toast-stack';
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
  return container;
}

/**
 * @param {'info' | 'success' | 'error'} variant
 */
function toastVariantClass(variant) {
  if (variant === 'success') return 'fb-toast--success';
  if (variant === 'error') return 'fb-toast--error';
  return 'fb-toast--info';
}

/**
 * @param {string} message
 * @param {'info' | 'success' | 'error'} [variant]
 * @param {number} [durationMs]
 */
export function showToast(message, variant = 'info', durationMs = DEFAULT_DURATION_MS) {
  const root = getContainer();
  const toastId = `shared-toast-${Math.random().toString(36).slice(2, 9)}`;

  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `fb-toast ${toastVariantClass(variant)}`;
  toast.setAttribute('role', 'alert');

  const messageEl = document.createElement('div');
  messageEl.className = 'fb-toast__message';
  messageEl.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'fb-toast__close';
  closeBtn.setAttribute('aria-label', '关闭');
  closeBtn.innerHTML = CLOSE_ICON;

  if (variant === 'success') {
    const icon = document.createElement('span');
    icon.className = 'shrink-0 text-green-600';
    icon.innerHTML = CHECK_ICON;
    toast.append(icon, messageEl, closeBtn);
  } else {
    toast.append(messageEl, closeBtn);
  }

  root.appendChild(toast);

  let dismissTimer = 0;

  const removeToast = () => {
    if (dismissTimer) {
      window.clearTimeout(dismissTimer);
      dismissTimer = 0;
    }
    toast.remove();
    if (root.childElementCount === 0) {
      root.remove();
      container = null;
    }
  };

  closeBtn.addEventListener('click', removeToast);
  dismissTimer = window.setTimeout(removeToast, durationMs);
}
