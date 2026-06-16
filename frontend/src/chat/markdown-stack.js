/** @type {import('./markdown-stack.bundle.js') | null} */
let stack = null;

/** @type {Promise<void> | null} */
let warmPromise = null;

/**
 * 预热 marked + highlight.js（独立 markdown chunk）。须在 chat init 完成前 await。
 */
export async function warmMarkdownStack() {
  if (stack) {
    return;
  }
  if (!warmPromise) {
    warmPromise = import('./markdown-stack.bundle.js').then((loaded) => {
      stack = loaded;
    });
  }
  await warmPromise;
}

function assertWarm() {
  if (!stack) {
    throw new Error('[markdown-stack] warmMarkdownStack() 未完成');
  }
  return stack;
}

/**
 * @param {string} text
 */
export function parseMarkdown(text) {
  const { marked } = assertWarm();
  return marked.parse(text ?? '');
}

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
 * @param {ParentNode} root
 */
export function enhanceCodeBlocks(root) {
  const { hljs } = assertWarm();
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
