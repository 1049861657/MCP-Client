/**
 * @param {HTMLElement | null} container
 * @param {string} attributeName
 * @param {string} activeClass
 */
export function clearChipGroupActive(container, attributeName, activeClass = 'active') {
  if (!container) {
    return;
  }
  const attr = `data-${attributeName}`;
  container.querySelectorAll(`[${attr}]`).forEach((chip) => {
    chip.classList.remove(activeClass);
  });
}

/**
 * @param {HTMLElement | null} container
 * @param {unknown} value
 * @param {string} attributeName
 * @param {(raw: string) => unknown} [parseValue]
 * @param {(a: unknown, b: unknown) => boolean} [isEqual]
 * @param {string} [activeClass]
 */
export function syncChipGroup(
  container,
  value,
  attributeName,
  parseValue = (raw) => raw,
  isEqual = (a, b) => a === b,
  activeClass = 'active',
) {
  if (!container) {
    return;
  }
  const attr = `data-${attributeName}`;
  container.querySelectorAll(`[${attr}]`).forEach((chip) => {
    if (!(chip instanceof HTMLButtonElement)) {
      return;
    }
    const raw = chip.getAttribute(attr) ?? '';
    chip.classList.toggle(activeClass, isEqual(parseValue(raw), value));
  });
}

/**
 * @param {HTMLElement | null} container
 * @param {{
 *   attributeName: string;
 *   onSelect: (value: string) => void;
 *   parseValue?: (raw: string) => unknown;
 *   activeClass?: string;
 * }} options
 */
export function bindChipGroup(container, options) {
  if (!container || container.dataset.chipBound === '1') {
    return;
  }
  container.dataset.chipBound = '1';
  const attr = `data-${options.attributeName}`;
  const activeClass = options.activeClass ?? 'active';
  container.querySelectorAll(`[${attr}]`).forEach((chip) => {
    if (!(chip instanceof HTMLButtonElement)) {
      return;
    }
    chip.addEventListener('click', () => {
      const raw = chip.getAttribute(attr);
      if (!raw) {
        return;
      }
      container.querySelectorAll(`[${attr}]`).forEach((node) => {
        node.classList.remove(activeClass);
      });
      chip.classList.add(activeClass);
      options.onSelect(raw);
    });
  });
}
