import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import * as userDb from '@/lib/db/user';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('User Registration API', () => {
  const testUserName = 'test_register_user';

  beforeAll(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        name: testUserName,
      },
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        name: testUserName,
      },
    });
  });

  it('should create a user with valid data', async () => {
    // 先加密密码
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash('password123', 10);
    
    const user = await userDb.createUser({
      name: testUserName,
      email: 'test_register@example.com',
      password: hashedPassword,
    });

    expect(user).toBeDefined();
    expect(user.name).toBe(testUserName);

    // 清理
    await prisma.user.delete({
      where: { id: user.id },
    });
  });

  it('should reject duplicate username', async () => {
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash('password123', 10);
    
    const user = await userDb.createUser({
      name: testUserName,
      email: 'test_register_1@example.com',
      password: hashedPassword,
    });

    try {
      await userDb.createUser({
        name: testUserName,
        email: 'test_register_2@example.com',
        password: hashedPassword,
      });
      expect.fail('应该抛出错误');
    } catch (error) {
      expect(error).toBeDefined();
      // 验证是 Prisma 的唯一约束错误
      expect(error).toBeInstanceOf(PrismaClientKnownRequestError);
      if (error instanceof PrismaClientKnownRequestError) {
        expect(error.code).toBe('P2002'); // 唯一约束违反错误码
      }
    }

    // 清理
    await prisma.user.delete({
      where: { id: user.id },
    });
  });

  it('should reject duplicate email', async () => {
    const email = 'test_register_duplicate@example.com';
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash('password123', 10);
    
    const user = await userDb.createUser({
      name: `${testUserName}_1`,
      email,
      password: hashedPassword,
    });

    try {
      await userDb.createUser({
        name: `${testUserName}_2`,
        email,
        password: hashedPassword,
      });
      expect.fail('应该抛出错误');
    } catch (error) {
      expect(error).toBeDefined();
      // 验证是 Prisma 的唯一约束错误
      expect(error).toBeInstanceOf(PrismaClientKnownRequestError);
      if (error instanceof PrismaClientKnownRequestError) {
        expect(error.code).toBe('P2002'); // 唯一约束违反错误码
      }
    }

    // 清理
    await prisma.user.delete({
      where: { id: user.id },
    });
  });
});

