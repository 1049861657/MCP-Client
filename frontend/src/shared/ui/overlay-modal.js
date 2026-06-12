/**
 * 全屏遮罩模态壳（chat 大模态等共用）
 */

/**
 * @param {string} modalId
 */
export function openOverlayModal(modalId) {
  window.requestAnimationFrame(() => {
    const modal = document.getElementById(modalId);
    if (!modal) {
      return;
    }
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  });
}

/**
 * @param {string} modalId
 */
export function closeOverlayModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

/**
 * @param {string} modalId
 * @param {() => void} [onClose]
 * @param {{ extraCloseSelectors?: string[] }} [options]
 */
export function bindOverlayModalClose(modalId, onClose, options = {}) {
  const modal = document.getElementById(modalId);
  if (!modal || modal.dataset.closeBound === '1') {
    return;
  }
  modal.dataset.closeBound = '1';

  const extraCloseSelectors = options.extraCloseSelectors ?? ['.context-modal-close', '.md-close'];
  const closeSelector = [`[data-close-modal="${modalId}"]`, ...extraCloseSelectors].join(', ');

  modal.querySelectorAll(closeSelector).forEach((btn) => {
    btn.addEventListener('click', () => {
      closeOverlayModal(modalId);
      onClose?.();
    });
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeOverlayModal(modalId);
      onClose?.();
    }
  });
}
