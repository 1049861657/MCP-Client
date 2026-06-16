import { escapeHtml } from '../escape-html.js';

const CHECK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.485 3.515a1 1 0 0 1 0 1.414l-7.07 7.071-3.536-3.536a1 1 0 1 1 1.414-1.415l2.122 2.122 6.364-6.364a1 1 0 0 1 1.414 0z"/></svg>';

/**
 * @typedef {{ close: () => void; destroy: () => void }} DropdownInstance
 */

/** @type {WeakMap<HTMLElement, DropdownInstance>} */
const dropdownInstances = new WeakMap();

/**
 * @typedef {object} DropdownSelectOption
 * @property {string} value
 * @property {string} label
 * @property {boolean} [disabled]
 */

/**
 * @typedef {object} DropdownSelectGroup
 * @property {string} label
 * @property {DropdownSelectOption[]} options
 */

/**
 * @typedef {object} DropdownSelectConfig
 * @property {string} [placeholder]
 * @property {'standard' | 'icon' | 'group'} [variant]
 * @property {string} [className]
 */

/**
 * @param {HTMLElement} root
 */
function destroyDropdownInstance(root) {
  const instance = dropdownInstances.get(root);
  if (instance) {
    instance.destroy();
    dropdownInstances.delete(root);
  }
}

/**
 * @param {HTMLSelectElement} nativeSelect
 * @returns {DropdownSelectOption[]}
 */
function readOptionsFromNativeSelect(nativeSelect) {
  /** @type {DropdownSelectOption[]} */
  const options = [];
  for (const node of nativeSelect.options) {
    options.push({
      value: node.value,
      label: node.textContent?.trim() || node.value,
      disabled: node.disabled,
    });
  }
  return options;
}

/**
 * @param {HTMLSelectElement} nativeSelect
 * @returns {DropdownSelectGroup[]}
 */
function readGroupsFromNativeSelect(nativeSelect) {
  /** @type {DropdownSelectGroup[]} */
  const groups = [];
  for (const child of nativeSelect.children) {
    if (child instanceof HTMLOptGroupElement) {
      /** @type {DropdownSelectOption[]} */
      const options = [];
      for (const node of child.options) {
        options.push({
          value: node.value,
          label: node.textContent?.trim() || node.value,
          disabled: node.disabled,
        });
      }
      groups.push({ label: child.label, options });
      continue;
    }
    if (child instanceof HTMLOptionElement) {
      const last = groups[groups.length - 1];
      const option = {
        value: child.value,
        label: child.textContent?.trim() || child.value,
        disabled: child.disabled,
      };
      if (last?.label === '') {
        last.options.push(option);
      } else {
        groups.push({ label: '', options: [option] });
      }
    }
  }
  return groups;
}

/**
 * @param {HTMLElement} root
 * @returns {'standard' | 'icon' | 'group'}
 */
function resolveVariant(root) {
  const variant = root.dataset.variant;
  if (variant === 'icon' || variant === 'group') return variant;
  return 'standard';
}

/**
 * @param {HTMLElement} root
 * @param {DropdownSelectOption} option
 * @param {boolean} selected
 * @returns {HTMLButtonElement}
 */
function renderOptionButton(root, option, selected) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'fb-select__option' +
    (selected ? ' is-selected' : '') +
    (option.disabled ? ' is-disabled' : '');
  btn.dataset.value = option.value;
  if (option.disabled) btn.disabled = true;
  btn.innerHTML =
    `<span class="fb-select__option-text">${escapeHtml(option.label)}</span>` +
    `<span class="fb-select__option-check">${CHECK_ICON}</span>`;
  if (!option.disabled) {
    btn.addEventListener('click', () => selectDropdownValue(root, option.value));
  }
  return btn;
}

/**
 * @param {HTMLElement} root
 */
function rebuildDropdownMenu(root) {
  const nativeSelect = root.querySelector('.fb-select__native');
  const menu = root.querySelector('.fb-select__menu');
  if (!(nativeSelect instanceof HTMLSelectElement) || !(menu instanceof HTMLElement)) {
    return;
  }

  const variant = resolveVariant(root);
  const selectedValue = nativeSelect.value;
  menu.replaceChildren();

  if (variant === 'group') {
    const groups = readGroupsFromNativeSelect(nativeSelect);
    for (const group of groups) {
      if (group.label) {
        const heading = document.createElement('div');
        heading.className = 'fb-select__group-label';
        heading.textContent = group.label;
        menu.appendChild(heading);
      }
      for (const option of group.options) {
        menu.appendChild(renderOptionButton(root, option, option.value === selectedValue));
      }
    }
    return;
  }

  for (const option of readOptionsFromNativeSelect(nativeSelect)) {
    if (!option.value && !option.label) continue;
    menu.appendChild(renderOptionButton(root, option, option.value === selectedValue));
  }
}

/**
 * @param {HTMLElement} root
 */
function syncDropdownLabel(root) {
  const nativeSelect = root.querySelector('.fb-select__native');
  const labelEl = root.querySelector('.fb-select__label');
  const trigger = root.querySelector('.fb-select__trigger');
  if (!(nativeSelect instanceof HTMLSelectElement) || !(labelEl instanceof HTMLElement)) {
    return;
  }

  const placeholder = root.dataset.placeholder ?? '请选择';
  const selected = nativeSelect.selectedOptions[0];
  const hasValue = Boolean(selected?.value);

  if (hasValue) {
    labelEl.textContent = selected?.textContent?.trim() || selected?.value || placeholder;
    labelEl.classList.remove('fb-select__label--placeholder');
  } else {
    labelEl.textContent = placeholder;
    labelEl.classList.add('fb-select__label--placeholder');
  }

  if (trigger instanceof HTMLButtonElement) {
    trigger.disabled = nativeSelect.disabled;
  }
  root.classList.toggle('fb-select--disabled', nativeSelect.disabled);
}

/**
 * @param {HTMLElement} menu
 * @returns {HTMLButtonElement[]}
 */
function enabledMenuOptions(menu) {
  /** @type {HTMLButtonElement[]} */
  const options = [];
  for (const node of menu.querySelectorAll('.fb-select__option:not(.is-disabled)')) {
    if (node instanceof HTMLButtonElement) {
      options.push(node);
    }
  }
  return options;
}

/**
 * @param {HTMLElement} menu
 * @param {number} index
 */
function focusMenuOptionAt(menu, index) {
  const options = enabledMenuOptions(menu);
  for (const option of options) {
    option.classList.remove('is-focused');
  }
  const target = options[index];
  if (target) {
    target.classList.add('is-focused');
    target.scrollIntoView({ block: 'nearest' });
    target.focus();
  }
}

/**
 * @param {HTMLElement} root
 * @param {boolean} open
 */
function setDropdownOpen(root, open) {
  root.classList.toggle('is-open', open);
  const menu = root.querySelector('.fb-select__menu');
  const trigger = root.querySelector('.fb-select__trigger');
  if (menu instanceof HTMLElement) {
    menu.classList.toggle('hidden', !open);
  }
  if (trigger instanceof HTMLButtonElement) {
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
}

/**
 * @param {HTMLButtonElement} trigger
 * @param {HTMLElement} menu
 */
function positionDropdownMenu(trigger, menu) {
  const rect = trigger.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.left = `${rect.left}px`;
  menu.style.minWidth = `${rect.width}px`;
}

/**
 * @param {HTMLElement} root
 * @param {string} value
 */
function selectDropdownValue(root, value) {
  const nativeSelect = root.querySelector('.fb-select__native');
  if (!(nativeSelect instanceof HTMLSelectElement)) return;

  const prev = nativeSelect.value;
  nativeSelect.value = value;
  if (nativeSelect.value !== value) return;

  syncDropdownLabel(root);
  rebuildDropdownMenu(root);

  dropdownInstances.get(root)?.close();

  if (prev !== value) {
    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * @param {HTMLElement} root
 */
function bindDropdownInstance(root) {
  const trigger = root.querySelector('.fb-select__trigger');
  const menu = root.querySelector('.fb-select__menu');
  const nativeSelect = root.querySelector('.fb-select__native');
  if (!(trigger instanceof HTMLButtonElement) || !(menu instanceof HTMLElement)) return;

  destroyDropdownInstance(root);

  /** @type {number} */
  let focusedIndex = -1;

  const close = () => {
    if (!root.classList.contains('is-open')) return;
    setDropdownOpen(root, false);
    focusedIndex = -1;
    for (const option of enabledMenuOptions(menu)) {
      option.classList.remove('is-focused');
    }
  };

  const open = () => {
    if (nativeSelect instanceof HTMLSelectElement && nativeSelect.disabled) return;
    positionDropdownMenu(trigger, menu);
    setDropdownOpen(root, true);
    focusedIndex = -1;
  };

  const toggle = () => {
    if (root.classList.contains('is-open')) {
      close();
      return;
    }
    open();
  };

  const onTriggerClick = (event) => {
    event.stopPropagation();
    toggle();
  };

  const onDocumentClick = (event) => {
    if (event.target instanceof Node && root.contains(event.target)) return;
    close();
  };

  const onDocumentKeydown = (event) => {
    if (!root.classList.contains('is-open')) return;

    const options = enabledMenuOptions(menu);
    if (options.length === 0) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      trigger.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, options.length - 1);
      focusMenuOptionAt(menu, focusedIndex);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusedIndex = focusedIndex <= 0 ? 0 : focusedIndex - 1;
      focusMenuOptionAt(menu, focusedIndex);
      return;
    }

    if (event.key === 'Enter' && focusedIndex >= 0) {
      event.preventDefault();
      const value = options[focusedIndex]?.dataset.value;
      if (value !== undefined) {
        selectDropdownValue(root, value);
      }
    }
  };

  const onReposition = () => {
    if (root.classList.contains('is-open')) {
      positionDropdownMenu(trigger, menu);
    }
  };

  trigger.addEventListener('click', onTriggerClick);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
  window.addEventListener('resize', onReposition);
  window.addEventListener('scroll', onReposition, true);

  dropdownInstances.set(root, {
    close,
    destroy: () => {
      close();
      trigger.removeEventListener('click', onTriggerClick);
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeydown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    },
  });

  if (nativeSelect instanceof HTMLSelectElement && nativeSelect.disabled) {
    trigger.disabled = true;
  }
}

/**
 * @param {HTMLSelectElement} nativeSelect
 * @param {DropdownSelectConfig} [config]
 * @returns {HTMLElement | null}
 */
export function mountDropdownSelect(nativeSelect, config = {}) {
  if (!(nativeSelect instanceof HTMLSelectElement)) return null;

  const existing = nativeSelect.closest('[data-fb-select]');
  if (existing instanceof HTMLElement && nativeSelect.dataset.fbSelectMounted === '1') {
    if (config.placeholder) existing.dataset.placeholder = config.placeholder;
    if (config.variant) existing.dataset.variant = config.variant;
    refreshDropdownSelect(nativeSelect);
    return existing;
  }

  const placeholder = config.placeholder ?? '请选择';
  const variant =
    config.variant ??
    (nativeSelect.querySelector('optgroup') ? 'group' : nativeSelect.dataset.dropdownVariant) ??
    'standard';

  const wrap = document.createElement('div');
  wrap.className = ['fb-select', config.className].filter(Boolean).join(' ');
  wrap.dataset.fbSelect = '1';
  wrap.dataset.placeholder = placeholder;
  wrap.dataset.variant = variant;

  const parent = nativeSelect.parentElement;
  const selectWrap = parent?.classList.contains('select-wrap') ? parent : null;
  if (selectWrap) {
    selectWrap.insertBefore(wrap, nativeSelect);
  } else if (parent) {
    parent.insertBefore(wrap, nativeSelect);
  }
  wrap.appendChild(nativeSelect);

  nativeSelect.classList.add('fb-select__native');
  nativeSelect.dataset.fbSelectMounted = '1';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'fb-select__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  if (nativeSelect.id) trigger.id = `${nativeSelect.id}-trigger`;

  const labelEl = document.createElement('span');
  labelEl.className = 'fb-select__label fb-select__label--placeholder';
  labelEl.textContent = placeholder;

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('class', 'fb-select__chevron');
  chevron.setAttribute('viewBox', '0 0 20 20');
  chevron.setAttribute('fill', 'currentColor');
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML =
    '<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/>';

  trigger.append(labelEl, chevron);

  const menu = document.createElement('div');
  menu.className = 'fb-select__menu hidden';
  menu.setAttribute('role', 'listbox');

  wrap.append(trigger, menu);

  if (selectWrap) {
    selectWrap.replaceWith(wrap);
  }

  rebuildDropdownMenu(wrap);
  syncDropdownLabel(wrap);
  bindDropdownInstance(wrap);
  return wrap;
}

/**
 * @param {HTMLSelectElement} nativeSelect
 */
export function refreshDropdownSelect(nativeSelect) {
  const root = nativeSelect.closest('[data-fb-select]');
  if (!(root instanceof HTMLElement)) return;
  rebuildDropdownMenu(root);
  syncDropdownLabel(root);
  bindDropdownInstance(root);
}

/**
 * @param {HTMLSelectElement} nativeSelect
 */
export function syncDropdownSelectState(nativeSelect) {
  const root = nativeSelect.closest('[data-fb-select]');
  if (!(root instanceof HTMLElement)) return;
  syncDropdownLabel(root);
  root.classList.toggle('fb-select--disabled', nativeSelect.disabled);
  const trigger = root.querySelector('.fb-select__trigger');
  if (trigger instanceof HTMLButtonElement) {
    trigger.disabled = nativeSelect.disabled;
  }
}

/**
 * @param {ParentNode | Document} scope
 * @param {string} [selector]
 */
export function mountDropdownSelectsIn(scope, selector = 'select.field-select') {
  const root = scope instanceof Document ? scope : scope;
  for (const select of root.querySelectorAll(selector)) {
    if (select instanceof HTMLSelectElement && select.dataset.fbSelectMounted !== '1') {
      mountDropdownSelect(select);
    }
  }
}
