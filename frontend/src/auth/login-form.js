import { signIn, signUp } from './session.js';

// 共用登录/注册表单：用户名+密码登录，注册额外收集 email（库强制）。
// 样式走 Tailwind utility 内联（DOM 由本工厂生成，符合 Tailwind v4 最佳实践）。
// 调用方传 onSuccess 回调；表单自行处理 signIn/signUp 与错误展示。

const ICON_LOCK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="h-6 w-6"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

const ICON_EDIT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="h-4 w-4"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

// 邮箱默认按 用户名@qq.com 自动生成
const EMAIL_DOMAIN = '@qq.com';

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/15';

// 邮箱框：复用 INPUT_CLASS，只读态由 read-only: 变体置灰区分（覆盖底色/字色）
const EMAIL_CLASS = `${INPUT_CLASS} pr-11 read-only:cursor-default read-only:bg-slate-100 read-only:text-slate-500`;

/**
 * @param {{ onSuccess: () => void, lead?: string }} options
 * @returns {HTMLElement}
 */
export function createAuthPanel(options) {
  const { onSuccess, lead = '登录后可管理你的配置与历史' } = options;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="mb-6 flex flex-col items-center gap-2 text-center">
      <span class="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-brand to-brand-dark text-white shadow-[0_6px_16px_rgb(25_118_210/0.32)]">${ICON_LOCK}</span>
      <h2 class="mt-1 text-xl font-bold tracking-tight text-slate-900" data-auth-title>登录</h2>
      <p class="m-0 text-[13px] leading-relaxed text-slate-500">${lead}</p>
    </div>
    <form class="flex flex-col gap-3.5" autocomplete="off">
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-semibold text-slate-700">用户名</label>
        <input type="text" name="username" autocomplete="off" class="${INPUT_CLASS}" placeholder="请输入用户名">
      </div>
      <div class="auth-field-email hidden flex-col gap-1.5">
        <label class="text-[13px] font-semibold text-slate-700">邮箱</label>
        <div class="relative">
          <input type="email" name="email" autocomplete="off" readonly class="${EMAIL_CLASS}" placeholder="按用户名自动生成">
          <button type="button" class="auth-email-edit absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-transparent text-slate-400 transition hover:bg-slate-200 hover:text-slate-600" aria-label="允许修改邮箱" title="点击允许手动修改邮箱">${ICON_EDIT}</button>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-semibold text-slate-700">密码</label>
        <input type="password" name="password" autocomplete="off" class="${INPUT_CLASS}" placeholder="请输入密码">
      </div>
      <p class="auth-error m-0 hidden text-[13px] leading-snug text-red-600"></p>
      <button type="submit" class="mt-1 inline-flex h-[46px] w-full items-center justify-center rounded-xl bg-brand text-[15px] font-semibold text-white shadow-[0_6px_18px_rgb(25_118_210/0.3)] transition hover:bg-brand-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65">登录</button>
      <button type="button" class="auth-switch mx-auto mt-1 bg-transparent px-2 py-1 text-[13px] text-slate-500 transition hover:text-brand">没有账号？<b class="font-semibold text-brand">立即注册</b></button>
    </form>
  `;

  const form = wrap.querySelector('form');
  const titleEl = wrap.querySelector('[data-auth-title]');
  const emailField = wrap.querySelector('.auth-field-email');
  const emailInput = wrap.querySelector('input[name="email"]');
  const emailEditBtn = wrap.querySelector('.auth-email-edit');
  const usernameInput = wrap.querySelector('input[name="username"]');
  const passwordInput = wrap.querySelector('input[name="password"]');
  const errorEl = wrap.querySelector('.auth-error');
  const submitBtn = wrap.querySelector('button[type="submit"]');
  const switchBtn = wrap.querySelector('.auth-switch');

  let mode = 'signin';
  // false：邮箱跟随用户名自动生成且只读；true：用户已点按钮，允许手动编辑
  let emailManual = false;

  function setError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || '';
    errorEl.classList.toggle('hidden', !message);
  }

  function syncEmail() {
    if (emailManual || !emailInput) return;
    const u = usernameInput?.value.trim() ?? '';
    emailInput.value = u ? `${u}${EMAIL_DOMAIN}` : '';
  }

  function setEmailManual(manual) {
    emailManual = manual;
    if (emailInput) emailInput.readOnly = !manual;
    emailEditBtn?.classList.toggle('text-brand', manual);
    emailEditBtn?.classList.toggle('bg-brand/10', manual);
    if (emailEditBtn) {
      emailEditBtn.title = manual ? '点击恢复按用户名自动生成' : '点击允许手动修改邮箱';
    }
    if (manual) {
      emailInput?.focus();
    } else {
      syncEmail();
    }
  }

  function setMode(next) {
    mode = next;
    const register = mode === 'register';
    emailField?.classList.toggle('hidden', !register);
    emailField?.classList.toggle('flex', register);
    if (titleEl) titleEl.textContent = register ? '注册' : '登录';
    if (submitBtn) submitBtn.textContent = register ? '注册' : '登录';
    if (switchBtn) {
      switchBtn.innerHTML = register
        ? '已有账号？<b class="font-semibold text-brand">返回登录</b>'
        : '没有账号？<b class="font-semibold text-brand">立即注册</b>';
    }
    if (register) syncEmail();
    setError('');
  }

  switchBtn?.addEventListener('click', () => setMode(mode === 'signin' ? 'register' : 'signin'));
  usernameInput?.addEventListener('input', syncEmail);
  emailEditBtn?.addEventListener('click', () => setEmailManual(!emailManual));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput?.value.trim() ?? '';
    const password = passwordInput?.value ?? '';
    if (!username || !password) {
      setError('请填写用户名与密码');
      return;
    }
    if (submitBtn) submitBtn.disabled = true;
    setError('');
    try {
      if (mode === 'register') {
        const email = emailInput?.value.trim() ?? '';
        if (!email) {
          setError('请填写邮箱');
          return;
        }
        await signUp(email, username, password);
      } else {
        await signIn(username, password);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  setMode('signin');
  return wrap;
}
