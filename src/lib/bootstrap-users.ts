import { SUPERADMIN_ROLE, USER_ROLE, auth } from './auth.js';
import { ensureSeedFollowDefault } from '../services/seed-follow.service.js';
import { prisma } from './prisma.js';
import { Logger } from '../utils/logger.js';

const DEFAULT_PASSWORD = '12345678';

interface BootstrapUserSpec {
  username: string;
  role: string;
}

const BOOTSTRAP_USERS: BootstrapUserSpec[] = [
  { username: 'admin', role: SUPERADMIN_ROLE },
  { username: 'seed', role: USER_ROLE },
];

async function ensureBootstrapUser(spec: BootstrapUserSpec): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { username: spec.username } });
  if (existing) {
    return;
  }

  // 复用 better-auth 注册链路（ID 生成、Account 关联、密码哈希与页面注册一致）
  await auth.api.signUpEmail({
    body: {
      email: `${spec.username}@local.dev`,
      password: DEFAULT_PASSWORD,
      name: spec.username,
      username: spec.username,
    },
  });

  // bootstrap 账号角色由任务书固定，不依赖「首个注册 → SUPERADMIN」钩子
  await prisma.user.update({
    where: { username: spec.username },
    data: { role: spec.role },
  });

  Logger.info('BOOTSTRAP', `创建初始账号 ${spec.username}（${spec.role}），初密 ${DEFAULT_PASSWORD}`);
}

/** 启动幂等创建 admin / seed 账号；已存在则不改密码与角色 */
export async function bootstrapUsers(): Promise<void> {
  for (const spec of BOOTSTRAP_USERS) {
    await ensureBootstrapUser(spec);
  }
  await ensureSeedFollowDefault();
}
