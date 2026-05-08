import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

class PrismaInstance {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaInstance.instance) {
      const adapter = new PrismaBetterSqlite3({
        url: process.env.DATABASE_URL!,
      });
      PrismaInstance.instance = new PrismaClient({ adapter });
    }
    return PrismaInstance.instance;
  }
}

export const prisma = PrismaInstance.getInstance();
