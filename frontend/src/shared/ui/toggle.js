import { escapeAttr } from '../escape-html.js';

/**
 * @param {HTMLInputElement | null} checkbox
 * @param {HTMLButtonElement | null} toggle
 * @param {HTMLElement | null} [nested]
 */
export function syncToggleFromCheckbox(checkbox, toggle, nested) {
  if (!checkbox || !toggle) return;
  const on = checkbox.checked;
  toggle.classList.toggle('on', on);
  toggle.classList.toggle('is-on', on);
  toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (nested) {
    nested.classList.toggle('hidden', !on);
  }
}

/**
 * @param {HTMLButtonElement} toggle
 * @param {HTMLInputElement} checkbox
 * @param {HTMLElement | null} [nested]
 */
export function bindToggle(toggle, checkbox, nested) {
  if (!(toggle instanceof HTMLButtonElement) || !(checkbox instanceof HTMLInputElement)) {
    return;
  }
  toggle.addEventListener('click', () => {
    if (toggle.disabled || checkbox.disabled) return;
    checkbox.checked = !checkbox.checked;
    syncToggleFromCheckbox(checkbox, toggle, nested);
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/**
 * @param {{
 *   checked?: boolean;
 *   disabled?: boolean;
 *   id?: string;
 *   inputClass?: string;
 * }} [options]
 */
export function renderToggleSwitchHtml(options = {}) {
  const { checked = false, disabled = false, id = '', inputClass = '' } = options;
  const idAttr = id ? ` id="${escapeAttr(id)}"` : '';
  const classAttr = inputClass ? ` class="${escapeAttr(inputClass)}"` : '';
  return (
    '<label class="ui-toggle-switch">' +
    `<input type="checkbox"${idAttr}${classAttr}${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}>` +
    '<span class="ui-toggle-switch__track" aria-hidden="true"></span>' +
    '</label>'
  );
}
