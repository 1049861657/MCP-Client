import { hljs } from './renderers.js';

/** @type {Record<string, string>} */
const LANG_LABELS = {
  js: 'JavaScript',
  ts: 'TypeScript',
  py: 'Python',
  sh: 'Shell',
  bash: 'Shell',
  json: 'JSON',
  sql: 'SQL',
  html: 'HTML',
  xml: 'XML',
};

/**
 * @param {string} lang
 */
function formatLangLabel(lang) {
  if (!lang || lang === 'text' || lang === 'plaintext') {
    return '';
  }
  if (LANG_LABELS[lang]) {
    return LANG_LABELS[lang];
  }
  return lang.toUpperCase();
}

/**
 * @param {HTMLElement} codeEl
 */
function detectLanguage(codeEl) {
  const languageClass = Array.from(codeEl.classList).find((cls) => cls.startsWith('language-'));
  if (languageClass) {
    return languageClass.replace('language-', '');
  }
  const highlighted = codeEl.dataset.highlighted;
  if (highlighted && highlighted !== 'yes') {
    return highlighted;
  }
  return 'text';
}

/**
 * 将 markdown 中的 pre/code 增强为带语言栏的浅色代码块（GitHub Light 风格）
 * @param {ParentNode} root
 */
export function enhanceCodeBlocks(root) {
  root.querySelectorAll('pre').forEach((pre) => {
    if (!(pre instanceof HTMLPreElement)) {
      return;
    }
    if (pre.closest('.code-block')) {
      return;
    }

    const code = pre.querySelector('code');
    if (!(code instanceof HTMLElement)) {
      return;
    }

    pre.querySelector('.code-language-label')?.remove();

    const lang = detectLanguage(code);
    const label = formatLangLabel(lang);

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';

    if (label) {
      const bar = document.createElement('div');
      bar.className = 'code-block-bar';
      const badge = document.createElement('span');
      badge.className = 'code-block-lang';
      badge.textContent = label;
      bar.appendChild(badge);
      wrapper.appendChild(bar);
    }

    const parent = pre.parentNode;
    if (!parent) {
      return;
    }

    parent.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    pre.classList.add('code-block-pre');

    try {
      hljs.highlightElement(code);
    } catch {
      /* ignore unsupported snippets */
    }
  });
}
