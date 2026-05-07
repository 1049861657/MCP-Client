import 'dotenv/config';
import path from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

/** SQLite file: URL 相对路径按 prisma 目录解析，与 .env.example 说明一致 */
function resolveSqliteDatabaseUrl(raw: string): string {
  if (!raw.startsWith('file:')) {
    return raw;
  }
  const withoutScheme = raw.slice('file:'.length);
  if (path.isAbsolute(withoutScheme)) {
    return raw;
  }
  const prismaDir = path.join(process.cwd(), 'prisma');
  const absolutePath = path.resolve(prismaDir, withoutScheme.replace(/^\.\//, ''));
  return `file:${absolutePath}`;
}

class PrismaInstance {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaInstance.instance) {
      const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
      const adapter = new PrismaBetterSqlite3({
        url: resolveSqliteDatabaseUrl(databaseUrl),
      });
      PrismaInstance.instance = new PrismaClient({ adapter });
    }
    return PrismaInstance.instance;
  }
}

export const prisma = PrismaInstance.getInstance();
