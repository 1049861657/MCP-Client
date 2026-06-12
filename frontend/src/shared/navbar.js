import './navbar-shell.css';
import { initAuthShell } from '../auth/auth-shell.js';
import { fetchJson } from './fetch-json.js';
import { getSession } from '../auth/session.js';
import { mountNavAuth } from '../auth/nav-auth.js';

const SUPERADMIN_ROLE = 'SUPERADMIN';

const NAV_LINKS = [
  { href: '/', label: '首页', match: (path) => path === '/' || path === '/index.html' },
  { href: '/ai.html', label: 'AI聊天', match: (path) => path === '/ai.html' },
  { href: '/info.html', label: 'MCP服务', match: (path) => path === '/info.html' },
  { href: '/settings.html', label: '配置管理', match: (path) => path === '/settings.html' },
  {
    href: '/admin.html',
    label: '高级配置',
    match: (path) => path === '/admin.html' || path.startsWith('/admin/'),
    superAdminOnly: true,
  },
];

/**
 * 挂载顶栏导航；若已存在 `.navbar` 则跳过。
 *
 * @param {Document} [doc]
 */
export function mountNavbar(doc = document) {
  if (doc.querySelector('.navbar')) {
    return;
  }

  const currentPath = doc.defaultView?.location.pathname ?? '/';
  const nav = doc.createElement('nav');
  nav.className = 'navbar';

  const links = doc.createElement('div');
  links.className = 'navbar__links';

  for (const link of NAV_LINKS) {
    const anchor = doc.createElement('a');
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.className = link.match(currentPath) ? 'navbar__link is-active' : 'navbar__link';
    if (link.superAdminOnly) {
      anchor.dataset.superAdminOnly = 'true';
      anchor.hidden = true;
    }
    links.appendChild(anchor);
  }

  const clientInfo = doc.createElement('div');
  clientInfo.id = 'client-info';
  clientInfo.className = 'navbar__client';
  clientInfo.innerHTML = `
    <svg class="navbar__client-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
    <span id="client-name" class="navbar__client-name"></span>
    <span id="client-version" class="navbar__client-version"></span>
  `;

  const authArea = doc.createElement('div');
  authArea.id = 'navbar-auth';
  authArea.className = 'flex h-full items-center gap-2';

  const right = doc.createElement('div');
  right.className = 'flex items-center gap-2.5 pr-3';
  right.appendChild(clientInfo);
  right.appendChild(authArea);

  nav.appendChild(links);
  nav.appendChild(right);

  const body = doc.body;
  if (body.firstChild) {
    body.insertBefore(nav, body.firstChild);
  } else {
    body.appendChild(nav);
  }

  body.classList.add('has-navbar');

  void initAuthShell();
  void loadClientInfo(doc);
  void applySuperAdminNav(doc);
  void mountNavAuth(authArea);
}

/** 高级配置仅 SUPERADMIN 可见；游客与普通用户隐藏顶栏入口 */
async function applySuperAdminNav(doc) {
  try {
    const user = await getSession();
    const show = user?.role === SUPERADMIN_ROLE;
    doc.querySelectorAll('[data-super-admin-only]').forEach((el) => {
      el.hidden = !show;
    });
  } catch {
    // 未登录或会话失效：保持隐藏
  }
}

/**
 * @param {Document} doc
 */
async function loadClientInfo(doc) {
  try {
    /** @type {{ name?: string; version?: string }} */
    const data = await fetchJson('/api/client-info');
    updateClientInfo(doc, data);
  } catch (error) {
    console.error('获取客户端信息时发生错误:', error);
  }
}

/**
 * @param {Document} doc
 * @param {{ name?: string; version?: string }} clientInfo
 */
function updateClientInfo(doc, clientInfo) {
  if (!clientInfo) {
    return;
  }

  const nameEl = doc.getElementById('client-name');
  const versionEl = doc.getElementById('client-version');
  const infoEl = doc.getElementById('client-info');

  if (nameEl && clientInfo.name) {
    nameEl.textContent = clientInfo.name;
  }

  if (versionEl && clientInfo.version) {
    versionEl.textContent = `v${clientInfo.version}`;
  }

  if (infoEl) {
    infoEl.classList.add('is-visible');
  }
}
