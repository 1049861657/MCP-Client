const DEFAULT_DURATION_MS = 3200;

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
  container.className =
    'pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-md flex-col gap-2';
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
  return container;
}

/**
 * @param {string} message
 * @param {'info' | 'success' | 'error'} [variant]
 * @param {number} [durationMs]
 */
export function showToast(message, variant = 'info', durationMs = DEFAULT_DURATION_MS) {
  const root = getContainer();
  const toast = document.createElement('div');
  toast.className = [
    'pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-lg',
    variant === 'success'
      ? 'border-green-200 bg-green-50 text-green-900'
      : variant === 'error'
        ? 'border-red-200 bg-red-50 text-red-900 max-w-md whitespace-pre-wrap break-words leading-relaxed'
        : 'border-border bg-white text-text',
  ].join(' ');
  toast.textContent = message;
  root.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
    if (root.childElementCount === 0) {
      root.remove();
      container = null;
    }
  }, durationMs);
}
