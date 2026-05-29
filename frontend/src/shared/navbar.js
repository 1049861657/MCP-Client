import { fetchJson } from './fetch-json.js';

const NAV_LINKS = [
  { href: '/', label: '首页', match: (path) => path === '/' || path === '/index.html' },
  { href: '/ai.html', label: 'AI聊天', match: (path) => path === '/ai.html' },
  { href: '/info.html', label: '服务信息', match: (path) => path === '/info.html' },
  { href: '/settings.html', label: '配置管理', match: (path) => path === '/settings.html' },
  { href: '/admin.html', label: '渠道管理', match: (path) => path === '/admin.html' || path.startsWith('/admin/') },
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
  nav.className =
    'navbar fixed top-0 left-0 right-0 z-20 flex h-[var(--spacing-navbar)] items-stretch justify-between bg-brand text-white shadow-md';

  const links = doc.createElement('div');
  links.className = 'flex h-full';

  for (const link of NAV_LINKS) {
    const anchor = doc.createElement('a');
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.className = [
      'flex h-full items-center px-5 transition-colors hover:bg-white/10',
      link.match(currentPath) ? 'bg-white/20 font-semibold' : '',
    ]
      .filter(Boolean)
      .join(' ');
    links.appendChild(anchor);
  }

  const clientInfo = doc.createElement('div');
  clientInfo.id = 'client-info';
  clientInfo.className = 'hidden items-center gap-2 px-4 text-sm';
  clientInfo.innerHTML = `
    <svg class="h-[18px] w-[18px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
    <span id="client-name" class="font-semibold"></span>
    <span id="client-version" class="opacity-80"></span>
  `;

  nav.appendChild(links);
  nav.appendChild(clientInfo);

  const body = doc.body;
  if (body.firstChild) {
    body.insertBefore(nav, body.firstChild);
  } else {
    body.appendChild(nav);
  }

  body.classList.add('pt-[var(--spacing-navbar)]');

  void loadClientInfo(doc);
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
    infoEl.classList.remove('hidden');
    infoEl.classList.add('flex');
  }
}
