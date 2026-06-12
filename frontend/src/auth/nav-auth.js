import { applyAuthDocumentState } from './auth-shell.js';
import { openAuthModal } from './auth-modal.js';
import { getSession, listDeviceSessions, setActiveSession, signOut } from './session.js';

// 顶栏登录入口（chat/info/settings/admin 共用）：未登录显示「登录」，已登录显示用户名 + 设置菜单。
// 多账号切换依赖 better-auth multiSession 插件（Cookie 内并存最多 3 个会话，点击即切换）。
// 登录/登出/切换成功后整页刷新，让各页按新会话态重新初始化。

const SUPERADMIN_ROLE = 'SUPERADMIN';
const MAX_DEVICE_SESSIONS = 3;

const ICON_USER =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

const ICON_SETTINGS =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

const BTN_GHOST =
  'inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border border-white/40 bg-transparent text-white transition hover:bg-white/15 [&_svg]:h-4 [&_svg]:w-4';

/**
 * @param {{ id: string, username?: string | null, email?: string, name?: string }} user
 * @returns {string}
 */
function displayName(user) {
  return user.username?.trim() || user.name?.trim() || user.email?.split('@')[0] || '用户';
}

/**
 * @param {import('./session.js').DeviceSession[]} sessions
 * @param {string} currentUserId
 * @returns {import('./session.js').DeviceSession[]}
 */
function pickRecentSessions(sessions, currentUserId) {
  const unique = [];
  const seen = new Set();
  for (const entry of sessions) {
    const userId = entry.user?.id;
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    unique.push(entry);
  }
  unique.sort((a, b) => {
    if (a.user.id === currentUserId) return -1;
    if (b.user.id === currentUserId) return 1;
    return 0;
  });
  return unique.slice(0, MAX_DEVICE_SESSIONS);
}

/**
 * @param {HTMLElement} container
 */
export async function mountNavAuth(container) {
  /** @type {(() => void) | null} */
  let closeMenu = null;

  /**
   * @param {{ id: string, username?: string | null, email?: string, role?: string | null } | null} user
   * @param {import('./session.js').DeviceSession[]} deviceSessions
   */
  const render = (user, deviceSessions) => {
    applyAuthDocumentState(user);
    closeMenu?.();
    closeMenu = null;
    container.replaceChildren();

    if (user) {
      const isSuperAdmin = user.role === SUPERADMIN_ROLE;
      const name = document.createElement('span');
      name.className = 'inline-flex max-w-[180px] items-center gap-1.5 text-[13px] font-medium text-white';
      name.title = isSuperAdmin ? '超级管理员' : '普通用户';
      const avatarClass = isSuperAdmin
        ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/90 text-brand [&_svg]:h-3.5 [&_svg]:w-3.5'
        : 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 [&_svg]:h-3.5 [&_svg]:w-3.5';
      name.innerHTML = `<span class="${avatarClass}">${ICON_USER}</span><span class="overflow-hidden text-ellipsis whitespace-nowrap">${displayName(user)}</span>`;

      const menuWrap = document.createElement('div');
      menuWrap.className = 'nav-auth-menu relative';

      const settingsBtn = document.createElement('button');
      settingsBtn.type = 'button';
      settingsBtn.className = BTN_GHOST;
      settingsBtn.setAttribute('aria-label', '账号设置');
      settingsBtn.setAttribute('aria-haspopup', 'menu');
      settingsBtn.setAttribute('aria-expanded', 'false');
      settingsBtn.innerHTML = ICON_SETTINGS;

      const dropdown = document.createElement('div');
      dropdown.className = 'nav-auth-menu__dropdown hidden';
      dropdown.setAttribute('role', 'menu');

      const recentSessions = pickRecentSessions(deviceSessions, user.id);
      if (recentSessions.length > 0) {
        const sectionLabel = document.createElement('p');
        sectionLabel.className = 'nav-auth-menu__label';
        sectionLabel.textContent = '切换账号';
        dropdown.appendChild(sectionLabel);

        for (const entry of recentSessions) {
          const accountUser = entry.user;
          const isCurrent = accountUser.id === user.id;
          const label = displayName(accountUser);
          const initial = label.charAt(0).toUpperCase();

          const accountBtn = document.createElement('button');
          accountBtn.type = 'button';
          accountBtn.className = `nav-auth-menu__account${isCurrent ? ' is-current' : ''}`;
          accountBtn.setAttribute('role', 'menuitem');
          accountBtn.disabled = isCurrent;
          accountBtn.innerHTML =
            `<span class="nav-auth-menu__account-avatar">${initial}</span>` +
            `<span class="nav-auth-menu__account-text">` +
            `<span class="nav-auth-menu__account-name">${label}</span>` +
            `<span class="nav-auth-menu__account-email">${accountUser.email ?? ''}</span>` +
            `</span>` +
            (isCurrent ? '<span class="nav-auth-menu__account-badge">当前</span>' : '');

          if (!isCurrent) {
            accountBtn.addEventListener('click', async () => {
              setOpen(false);
              try {
                await setActiveSession(entry.session.token);
                window.location.reload();
              } catch {
                openAuthModal({ lead: '会话已失效，请重新登录该账号' });
              }
            });
          }
          dropdown.appendChild(accountBtn);
        }

        const dividerTop = document.createElement('div');
        dividerTop.className = 'nav-auth-menu__divider';
        dropdown.appendChild(dividerTop);
      }

      const addAccountItem = document.createElement('button');
      addAccountItem.type = 'button';
      addAccountItem.className = 'nav-auth-menu__item';
      addAccountItem.setAttribute('role', 'menuitem');
      addAccountItem.textContent = '添加账号';
      addAccountItem.addEventListener('click', () => {
        setOpen(false);
        openAuthModal({ lead: '登录后将加入可切换账号列表' });
      });

      const logoutItem = document.createElement('button');
      logoutItem.type = 'button';
      logoutItem.className = 'nav-auth-menu__item nav-auth-menu__item--danger';
      logoutItem.setAttribute('role', 'menuitem');
      logoutItem.textContent = '退出';

      dropdown.append(addAccountItem, logoutItem);
      menuWrap.append(settingsBtn, dropdown);

      const setOpen = (open) => {
        dropdown.classList.toggle('hidden', !open);
        settingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      };

      closeMenu = () => setOpen(false);

      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(dropdown.classList.contains('hidden'));
      });

      logoutItem.addEventListener('click', async () => {
        setOpen(false);
        try {
          await signOut();
        } catch {
          // 已失效会话忽略
        }
        window.location.reload();
      });

      const onDocClick = (e) => {
        if (!menuWrap.contains(/** @type {Node} */ (e.target))) {
          setOpen(false);
        }
      };
      document.addEventListener('click', onDocClick);

      const prevClose = closeMenu;
      closeMenu = () => {
        prevClose?.();
        document.removeEventListener('click', onDocClick);
      };

      container.append(name, menuWrap);
    } else {
      const login = document.createElement('button');
      login.type = 'button';
      login.className =
        'inline-flex h-[30px] items-center rounded-full border border-white bg-white px-3.5 text-[13px] font-semibold text-brand transition hover:bg-white/90';
      login.textContent = '登录';
      login.addEventListener('click', () => openAuthModal());
      container.appendChild(login);
    }
  };

  try {
    const [user, deviceSessions] = await Promise.all([getSession(), listDeviceSessions()]);
    render(user, deviceSessions);
  } catch {
    render(null, []);
  }
}
