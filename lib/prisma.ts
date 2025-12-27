import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 配置日志级别：只记录错误和警告，不记录查询
const logConfig: Prisma.LogLevel[] = process.env.NODE_ENV === 'test'
  ? []
  : ['error', 'warn'];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

