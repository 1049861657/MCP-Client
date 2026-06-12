import { createAuthPanel } from './login-form.js';

// 全站共用登录弹窗：导航栏登录按钮与 admin 登录入口都复用此函数。
// 默认 onSuccess 整页刷新，让各页按新会话态重新初始化。样式走 Tailwind utility 内联。

/**
 * @param {{ onSuccess?: () => void, lead?: string, initialUsername?: string }} [options]
 */
export function openAuthModal(options = {}) {
  const onSuccess = options.onSuccess ?? (() => window.location.reload());

  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[3px]';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className =
    'relative w-[min(100%,380px)] rounded-[18px] bg-white p-7 pb-6 shadow-[0_24px_60px_rgb(15_23_42/0.22)]';

  const close = document.createElement('button');
  close.type = 'button';
  close.className =
    'absolute right-3.5 top-3.5 inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-transparent text-[20px] leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-600';
  close.setAttribute('aria-label', '关闭');
  close.innerHTML = '&times;';

  const dispose = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  function onKey(e) {
    if (e.key === 'Escape') dispose();
  }

  close.addEventListener('click', dispose);
  card.appendChild(close);
  card.appendChild(
    createAuthPanel({
      onSuccess: () => {
        dispose();
        onSuccess();
      },
      lead: options.lead,
      initialUsername: options.initialUsername,
    }),
  );

  overlay.appendChild(card);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dispose();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}
