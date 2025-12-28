/**
 * 获取和删除章节大纲 API
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { OutlineStatus } from '@prisma/client';

/**
 * GET /api/novels/[novelId]/outlines
 * 获取章节大纲列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    // 1. 验证用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { novelId } = await params;

    // 2. 验证小说所有权
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
    });

    if (!novel) {
      return Response.json({ error: 'Novel not found' }, { status: 404 });
    }

    if (novel.userId !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. 获取查询参数
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const fromChapter = searchParams.get('fromChapter');
    const limit = searchParams.get('limit');
    const sortBy = searchParams.get('sortBy') || 'chapterIndex';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // 4. 构建查询条件
    const where: { novelId: string; status?: OutlineStatus; chapterIndex?: { gte: number } } = { novelId };

    if (status) {
      const validStatuses: readonly OutlineStatus[] = ['PENDING', 'APPROVED', 'COMPLETED', 'SKIPPED'];
      const upperStatus = status.toUpperCase() as OutlineStatus;
      if (validStatuses.includes(upperStatus)) {
        where.status = upperStatus;
      }
    }

    if (fromChapter) {
      where.chapterIndex = { gte: parseInt(fromChapter, 10) };
    }

    // 5. 查询大纲
    const outlines = await prisma.chapterOutline.findMany({
      where,
      orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
      take: limit ? parseInt(limit, 10) : undefined,
    });

    // 6. 获取统计信息
    const [total, pendingCount, approvedCount, completedCount] = await Promise.all([
      prisma.chapterOutline.count({ where: { novelId } }),
      prisma.chapterOutline.count({ where: { novelId, status: 'PENDING' } }),
      prisma.chapterOutline.count({ where: { novelId, status: 'APPROVED' } }),
      prisma.chapterOutline.count({ where: { novelId, status: 'COMPLETED' } }),
    ]);

    // 7. 返回结果
    return Response.json({
      outlines,
      total,
      pendingCount,
      approvedCount,
      completedCount,
    });
  } catch (error) {
    console.error('Outline list error:', error);

    return Response.json(
      { error: 'Failed to fetch outlines', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/novels/[novelId]/outlines
 * 删除所有大纲或批量删除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    // 1. 验证用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { novelId } = await params;

    // 2. 验证小说所有权
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
    });

    if (!novel) {
      return Response.json({ error: 'Novel not found' }, { status: 404 });
    }

    if (novel.userId !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. 获取查询参数
    const { searchParams } = new URL(request.url);
    const outlineIds = searchParams.get('outlineIds');
    const fromChapter = searchParams.get('fromChapter');

    let deleteCount = 0;

    if (outlineIds) {
      // 批量删除指定的大纲
      const ids = outlineIds.split(',');
      deleteCount = await prisma.chapterOutline.deleteMany({
        where: {
          id: { in: ids },
          novelId,
        },
      }).then((result) => result.count);
    } else if (fromChapter) {
      // 删除从指定章节开始的所有大纲
      deleteCount = await prisma.chapterOutline.deleteMany({
        where: {
          novelId,
          chapterIndex: { gte: parseInt(fromChapter, 10) },
        },
      }).then((result) => result.count);
    } else {
      // 删除所有大纲
      deleteCount = await prisma.chapterOutline.deleteMany({
        where: { novelId },
      }).then((result) => result.count);
    }

    // 4. 返回结果
    return Response.json({
      message: `成功删除${deleteCount}个大纲`,
      deleteCount,
    });
  } catch (error) {
    console.error('Outline deletion error:', error);

    return Response.json(
      { error: 'Failed to delete outlines', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
