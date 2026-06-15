/**
 * @param {HTMLElement | null} display
 * @param {HTMLInputElement | null} input
 * @param {number} min
 * @param {number} max
 * @param {number} step
 */
export function bindStepper(display, input, min, max, step) {
  if (!display || !input) {
    return;
  }
  const minus = display.previousElementSibling;
  const plus = display.nextElementSibling;
  const apply = (value) => {
    const clamped = Math.min(max, Math.max(min, value));
    display.textContent = String(clamped);
    input.value = String(clamped);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  if (minus instanceof HTMLButtonElement) {
    minus.addEventListener('click', () => apply(parseInt(display.textContent ?? '0', 10) - step));
  }
  if (plus instanceof HTMLButtonElement) {
    plus.addEventListener('click', () => apply(parseInt(display.textContent ?? '0', 10) + step));
  }
}
