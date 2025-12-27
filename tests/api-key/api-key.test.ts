import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import * as userDb from '@/lib/db/user';
import bcrypt from 'bcryptjs';

describe('API Key Management', () => {
  let testUserId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const user = await userDb.createUser({
      name: 'test_api_key_user',
      email: 'test_api_key@example.com',
      password: hashedPassword,
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      }).catch(() => {});
    }
  });

  it('should update user API key', async () => {
    const testApiKey = 'test-api-key-123';
    const updatedUser = await userDb.updateUserOpenRouterKey(testUserId, testApiKey);
    expect(updatedUser.openRouterKey).toBe(testApiKey);
  });

  it('should clear user API key when set to null', async () => {
    const updatedUser = await userDb.updateUserOpenRouterKey(testUserId, null);
    expect(updatedUser.openRouterKey).toBeNull();
  });

  it('should update API key multiple times', async () => {
    const apiKey1 = 'api-key-1';
    const updatedUser1 = await userDb.updateUserOpenRouterKey(testUserId, apiKey1);
    expect(updatedUser1.openRouterKey).toBe(apiKey1);

    const apiKey2 = 'api-key-2';
    const updatedUser2 = await userDb.updateUserOpenRouterKey(testUserId, apiKey2);
    expect(updatedUser2.openRouterKey).toBe(apiKey2);
  });
});

