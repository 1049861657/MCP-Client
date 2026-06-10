import { openAuthModal } from './auth-modal.js';
import { getSession, signOut } from './session.js';

// 顶栏登录入口（chat/info/settings/admin 共用）：未登录显示「登录」，已登录显示用户名 + 退出。
// 登录/登出成功后整页刷新，让各页按新会话态重新初始化（guest↔authed 配置只读/可写切换）。

const ICON_USER =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

/**
 * @param {HTMLElement} container
 */
export async function mountNavAuth(container) {
  const BTN_GHOST =
    'inline-flex h-[30px] items-center rounded-full border border-white/40 bg-transparent px-3.5 text-[13px] font-medium text-white transition hover:bg-white/15';
  const BTN_PRIMARY =
    'inline-flex h-[30px] items-center rounded-full border border-white bg-white px-3.5 text-[13px] font-semibold text-brand transition hover:bg-white/90';

  const render = (user) => {
    container.replaceChildren();
    if (user) {
      const name = document.createElement('span');
      name.className = 'inline-flex max-w-[160px] items-center gap-1.5 text-[13px] font-medium text-white';
      name.innerHTML = `<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 [&_svg]:h-3.5 [&_svg]:w-3.5">${ICON_USER}</span><span class="overflow-hidden text-ellipsis whitespace-nowrap">${user.username || user.email}</span>`;
      const logout = document.createElement('button');
      logout.type = 'button';
      logout.className = BTN_GHOST;
      logout.textContent = '退出';
      logout.addEventListener('click', async () => {
        try {
          await signOut();
        } catch {
          // 已失效会话忽略
        }
        window.location.reload();
      });
      container.append(name, logout);
    } else {
      const login = document.createElement('button');
      login.type = 'button';
      login.className = BTN_PRIMARY;
      login.textContent = '登录';
      login.addEventListener('click', () => openAuthModal());
      container.appendChild(login);
    }
  };

  try {
    render(await getSession());
  } catch {
    render(null);
  }
}
