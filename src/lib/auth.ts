import { prismaAdapter } from '@better-auth/prisma-adapter';
import { betterAuth } from 'better-auth';
import { admin, username } from 'better-auth/plugins';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';

import { hashPassword, verifyPassword } from './password-hasher.js';
import { prisma } from './prisma.js';

export const SUPERADMIN_ROLE = 'SUPERADMIN';
export const USER_ROLE = 'USER';

// 命名区分：better-auth 的 Session = 登录会话（opaque DB 会话，支持吊销/滚动续期），
// ≠ ChatSession（聊天会话，prisma/schema.prisma 自建表）≠ Bus sessionKey（消息总线分区键）。
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'sqlite' }),
  // 注册收集 email+username+password；email 不验证（仅满足库约束与唯一性），登录走 signIn.username
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    // 自定义 hasher：Node 原生 argon2id（OWASP 基线），替代默认 scrypt
    password: { hash: hashPassword, verify: verifyPassword },
    // 改密成功后吊销该用户其他会话
    revokeSessionsOnPasswordReset: true,
  },
  databaseHooks: {
    user: {
      create: {
        // 首个账号自动 SUPERADMIN，后续一律 USER（角色仅门控用户管理，不限制配置修改）
        before: async (user) => {
          const existing = await prisma.user.count();
          return { data: { ...user, role: existing === 0 ? SUPERADMIN_ROLE : USER_ROLE } };
        },
      },
    },
  },
  plugins: [
    username(),
    // 两级角色（T4 拍板）：SUPERADMIN 拥有用户管理权限，USER 无；自定义角色名须经 roles 注册
    admin({
      roles: { SUPERADMIN: adminAc, USER: userAc },
      defaultRole: USER_ROLE,
      adminRoles: [SUPERADMIN_ROLE],
    }),
  ],
});
