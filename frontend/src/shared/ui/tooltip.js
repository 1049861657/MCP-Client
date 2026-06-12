/** @type {number | undefined} */
let tooltipTimer;

/**
 * @param {HTMLElement | null | undefined} element
 * @param {string} message
 * @param {number} [durationMs]
 */
export function showFloatingTooltip(element, message, durationMs = 2000) {
  if (!element) {
    return;
  }
  if (tooltipTimer) {
    window.clearTimeout(tooltipTimer);
    tooltipTimer = undefined;
  }
  element.textContent = message;
  element.classList.add('show');
  tooltipTimer = window.setTimeout(() => {
    element.classList.remove('show');
    tooltipTimer = undefined;
  }, durationMs);
}
