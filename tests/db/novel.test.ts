import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import * as novelDb from '@/lib/db/novel';
import * as userDb from '@/lib/db/user';
import bcrypt from 'bcryptjs';

describe('Novel Database Operations', () => {
  let testUserId: string;
  let testNovelId: string;

  beforeAll(async () => {
    // 创建测试用户
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const user = await userDb.createUser({
      name: 'test_novel_user',
      email: 'test_novel@example.com',
      password: hashedPassword,
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // 清理测试数据
    if (testNovelId) {
      await prisma.novel.delete({
        where: { id: testNovelId },
      }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      }).catch(() => {});
    }
  });

  it('should create a novel', async () => {
    const novel = await novelDb.createNovel({
      title: 'Test Novel',
      description: 'This is a test novel',
      userId: testUserId,
    });

    expect(novel).toBeDefined();
    expect(novel.title).toBe('Test Novel');
    expect(novel.userId).toBe(testUserId);
    testNovelId = novel.id;
  });

  it('should get novel by id', async () => {
    if (!testNovelId) {
      throw new Error('testNovelId is not set');
    }
    const novel = await novelDb.getNovelById(testNovelId);
    expect(novel).toBeDefined();
    expect(novel?.id).toBe(testNovelId);
    expect(novel?.chapters).toBeDefined();
    expect(Array.isArray(novel?.chapters)).toBe(true);
  });

  it('should get novels by user id', async () => {
    const novels = await novelDb.getNovelsByUserId(testUserId);
    expect(novels).toBeDefined();
    expect(Array.isArray(novels)).toBe(true);
    expect(novels.length).toBeGreaterThan(0);
    expect(novels[0]?.userId).toBe(testUserId);
  });

  it('should update novel', async () => {
    if (!testNovelId) {
      throw new Error('testNovelId is not set');
    }
    const updatedNovel = await novelDb.updateNovel(testNovelId, {
      title: 'Updated Test Novel',
      description: 'Updated description',
    });
    expect(updatedNovel.title).toBe('Updated Test Novel');
    expect(updatedNovel.description).toBe('Updated description');
  });

  it('should delete novel', async () => {
    if (!testNovelId) {
      throw new Error('testNovelId is not set');
    }
    const deletedNovel = await novelDb.deleteNovel(testNovelId);
    expect(deletedNovel.id).toBe(testNovelId);
    testNovelId = ''; // 清除ID，避免afterAll重复删除
  });
});

