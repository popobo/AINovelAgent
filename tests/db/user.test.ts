import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import * as userDb from '@/lib/db/user';
import bcrypt from 'bcryptjs';

describe('User Database Operations', () => {
  let testUserId: string;

  beforeAll(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        name: {
          startsWith: 'test_',
        },
      },
    });
  });

  afterAll(async () => {
    // 清理测试数据
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      }).catch(() => {
        // 忽略错误
      });
    }
  });

  it('should create a user', async () => {
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const user = await userDb.createUser({
      name: 'test_user_1',
      email: 'test1@example.com',
      password: hashedPassword,
    });

    expect(user).toBeDefined();
    expect(user.name).toBe('test_user_1');
    expect(user.email).toBe('test1@example.com');
    testUserId = user.id;
  });

  it('should get user by name', async () => {
    const user = await userDb.getUserByName('test_user_1');
    expect(user).toBeDefined();
    expect(user?.name).toBe('test_user_1');
  });

  it('should get user by email', async () => {
    const user = await userDb.getUserByEmail('test1@example.com');
    expect(user).toBeDefined();
    expect(user?.email).toBe('test1@example.com');
  });

  it('should get user by id', async () => {
    if (!testUserId) {
      throw new Error('testUserId is not set');
    }
    const user = await userDb.getUserById(testUserId);
    expect(user).toBeDefined();
    expect(user?.id).toBe(testUserId);
  });

  it('should update user openRouterKey', async () => {
    if (!testUserId) {
      throw new Error('testUserId is not set');
    }
    const updatedUser = await userDb.updateUserOpenRouterKey(testUserId, 'test-api-key');
    expect(updatedUser.openRouterKey).toBe('test-api-key');

    const clearedUser = await userDb.updateUserOpenRouterKey(testUserId, null);
    expect(clearedUser.openRouterKey).toBeNull();
  });
});

