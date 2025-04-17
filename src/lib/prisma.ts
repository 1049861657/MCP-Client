/**
 * Prisma 客户端单例
 * 确保应用中只有一个 Prisma 连接实例
 */
import { PrismaClient } from '../../prisma/generated/index.js';

class PrismaInstance {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaInstance.instance) {
      PrismaInstance.instance = new PrismaClient();
    }
    return PrismaInstance.instance;
  }
}

// 导出 Prisma 客户端单例
export const prisma = PrismaInstance.getInstance(); 