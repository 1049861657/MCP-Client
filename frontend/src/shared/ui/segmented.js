/**
 * @typedef {object} SegmentedOption
 * @property {string} value
 * @property {string} label
 * @property {boolean} [disabled]
 * @property {boolean} [active]
 * @property {string} [title]
 */

/**
 * @param {HTMLElement | null} container
 * @param {{
 *   attributeName: string;
 *   onSelect: (value: string) => void;
 *   activeClass?: string;
 * }} options
 */
export function bindSegmentedControl(container, options) {
  if (!container || container.dataset.segBound === '1') {
    return;
  }
  container.dataset.segBound = '1';
  const attr = `data-${options.attributeName}`;
  container.querySelectorAll(`[${attr}]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!(btn instanceof HTMLButtonElement) || btn.disabled) {
        return;
      }
      const value = btn.getAttribute(attr);
      if (!value) {
        return;
      }
      options.onSelect(value);
    });
  });
}

/**
 * @param {HTMLElement | null} container
 * @param {string} value
 * @param {string} attributeName
 * @param {string} [activeClass]
 */
export function syncSegmentedControl(container, value, attributeName, activeClass = 'active') {
  if (!container) {
    return;
  }
  const attr = `data-${attributeName}`;
  container.querySelectorAll(`[${attr}]`).forEach((btn) => {
    btn.classList.toggle(activeClass, btn.getAttribute(attr) === value);
  });
}
