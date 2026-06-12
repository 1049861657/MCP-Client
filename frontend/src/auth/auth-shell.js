import { openAuthModal } from './auth-modal.js';
import { getSession } from './session.js';
import { showToast } from '../shared/ui/toast.js';

let guardsInstalled = false;

/**
 * 配置类页面鉴权态 SSOT：挂到 <html data-auth>，供 info/settings 等标了
 * data-requires-auth 的写控件隐藏与拦截。AI 聊天 guest 模式不在此范围。
 * @param {{ id: string } | null | undefined} user
 * @returns {void}
 */
export function applyAuthDocumentState(user) {
  document.documentElement.dataset.auth = user ? 'authenticated' : 'guest';
}

/**
 * @returns {boolean}
 */
export function isGuestAuth() {
  return document.documentElement.dataset.auth === 'guest';
}

/**
 * 顶栏挂载时调用一次：解析会话 + 安装写操作委托拦截。
 * @returns {Promise<void>}
 */
export async function initAuthShell() {
  try {
    applyAuthDocumentState(await getSession());
  } catch {
    applyAuthDocumentState(null);
  }

  if (guardsInstalled) {
    return;
  }
  guardsInstalled = true;

  document.addEventListener(
    'click',
    (event) => {
      if (!isGuestAuth()) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const authControl = target.closest('[data-requires-auth]');
      if (!authControl) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      showToast('请先登录后再操作', 'info');
      openAuthModal();
    },
    true,
  );

  document.addEventListener(
    'submit',
    (event) => {
      if (!isGuestAuth()) {
        return;
      }
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-requires-auth')) {
        return;
      }
      event.preventDefault();
      showToast('请先登录后再操作', 'info');
      openAuthModal();
    },
    true,
  );
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isUnauthorizedError(error) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message;
  return message.includes('未登录') || message.includes('HTTP 401');
}
