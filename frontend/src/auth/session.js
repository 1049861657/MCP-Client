// T4-02-03：chat / admin 共用的 better-auth 会话客户端。
// 直接调用 /api/auth/* 内置端点（Cookie 会话），不引入 better-auth client SDK 以省依赖。

// 注册端点强制 email（username 插件附加用户名登录）；email 不验证，仅占库约束。
const AUTH_BASE = '/api/auth';

// better-auth 错误码 → 中文文案（code 比 message 稳定，优先按 code 映射）
// 取自 better-auth 基础错误码 + username 插件错误码（与所装版本对齐）
const AUTH_ERROR_TEXT = {
  // username 插件
  INVALID_USERNAME_OR_PASSWORD: '用户名或密码错误',
  USERNAME_IS_ALREADY_TAKEN: '该用户名已被注册',
  USERNAME_TOO_SHORT: '用户名太短',
  USERNAME_TOO_LONG: '用户名太长',
  INVALID_USERNAME: '用户名格式不正确',
  INVALID_DISPLAY_USERNAME: '显示用户名格式不正确',
  UNEXPECTED_ERROR: '发生未知错误，请稍后再试',
  // 邮箱 / 密码
  INVALID_EMAIL_OR_PASSWORD: '邮箱或密码错误',
  INVALID_EMAIL: '邮箱格式不正确',
  INVALID_PASSWORD: '密码错误',
  PASSWORD_TOO_SHORT: '密码太短',
  PASSWORD_TOO_LONG: '密码太长',
  PASSWORD_ALREADY_SET: '密码已设置',
  USER_ALREADY_HAS_PASSWORD: '该用户已设置密码',
  EMAIL_NOT_VERIFIED: '邮箱未验证',
  // 账号 / 用户
  USER_NOT_FOUND: '用户不存在',
  USER_ALREADY_EXISTS: '该账号已存在',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: '该账号已存在',
  ACCOUNT_NOT_FOUND: '账户不存在',
  CREDENTIAL_ACCOUNT_NOT_FOUND: '未找到密码登录账户',
  FAILED_TO_CREATE_USER: '创建用户失败',
  FAILED_TO_UPDATE_USER: '更新用户失败',
  // 会话 / 令牌
  FAILED_TO_CREATE_SESSION: '创建会话失败',
  FAILED_TO_GET_SESSION: '获取会话失败',
  SESSION_EXPIRED: '会话已过期，请重新登录',
  INVALID_TOKEN: '令牌无效',
  TOKEN_EXPIRED: '令牌已过期',
  // 通用校验
  VALIDATION_ERROR: '输入校验失败',
  MISSING_FIELD: '缺少必填字段',
};

// 登录时这些"凭证类"失败统一收敛为通用提示：遵循 OWASP，不暴露用户名规则、
// 也不透露是用户名还是密码错（防账号枚举）。精确文案仅在注册时展示。
const SIGN_IN_COLLAPSE = new Set([
  'INVALID_USERNAME_OR_PASSWORD',
  'INVALID_EMAIL_OR_PASSWORD',
  'USER_NOT_FOUND',
  'INVALID_PASSWORD',
  'INVALID_EMAIL',
  'USERNAME_TOO_SHORT',
  'USERNAME_TOO_LONG',
  'INVALID_USERNAME',
  'INVALID_DISPLAY_USERNAME',
  'CREDENTIAL_ACCOUNT_NOT_FOUND',
  'ACCOUNT_NOT_FOUND',
]);

/**
 * @param {{ code?: string; message?: string } | null} data
 * @param {number} status
 * @param {boolean} signIn 是否登录请求（凭证类错误收敛为通用提示）
 * @returns {string}
 */
function localizeAuthError(data, status, signIn) {
  const code = typeof data?.code === 'string' ? data.code : '';
  if (signIn && SIGN_IN_COLLAPSE.has(code)) return '用户名或密码错误';
  if (code && AUTH_ERROR_TEXT[code]) return AUTH_ERROR_TEXT[code];
  const raw = data?.message || data?.error?.message || data?.error;
  if (typeof raw === 'string' && raw) return raw;
  return `请求失败(${status})`;
}

async function postAuth(path, body) {
  const res = await fetch(AUTH_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    throw new Error(localizeAuthError(data, res.status, path.includes('/sign-in')));
  }
  return data;
}

/**
 * 当前登录用户；未登录返回 null。
 * @returns {Promise<{id:string,email:string,username:string|null,role:string|null}|null>}
 */
export async function getSession() {
  const res = await fetch(AUTH_BASE + '/get-session', { credentials: 'include' });
  if (!res.ok) {
    return null;
  }
  const data = await res.json().catch(() => null);
  return data?.user ?? null;
}

/**
 * 用户名 + 密码登录。
 * @param {string} username
 * @param {string} password
 */
export async function signIn(username, password) {
  return postAuth('/sign-in/username', { username, password });
}

/**
 * 注册：email + 用户名 + 密码（name 取 username）。首账号自动 SUPERADMIN。
 * @param {string} email
 * @param {string} username
 * @param {string} password
 */
export async function signUp(email, username, password) {
  return postAuth('/sign-up/email', { email, username, password, name: username });
}

export async function signOut() {
  return postAuth('/sign-out', {});
}
