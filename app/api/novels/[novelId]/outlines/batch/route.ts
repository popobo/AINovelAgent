/**
 * 批量操作 API
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { batchOperationSchema } from '@/lib/outline/validators';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/novels/[novelId]/outlines/batch/approve
 * 批量批准大纲
 */
export async function POST(
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

    // 3. 解析和验证请求体
    const body = await request.json();
    const validationResult = batchOperationSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { outlineIds } = validationResult.data;

    // 4. 获取操作类型（从查询参数）
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    if (!operation || !['approve', 'skip', 'delete'].includes(operation)) {
      return Response.json(
        { error: 'Invalid operation. Must be one of: approve, skip, delete' },
        { status: 400 }
      );
    }

    // 5. 执行批量操作
    let result;
    const now = new Date();

    switch (operation) {
      case 'approve':
        // 批量批准（只能批准 PENDING 状态的）
        result = await prisma.chapterOutline.updateMany({
          where: {
            id: { in: outlineIds },
            novelId,
            status: 'PENDING',
          },
          data: {
            status: 'APPROVED',
            updatedAt: now,
          },
        });
        break;

      case 'skip':
        // 批量跳过
        result = await prisma.chapterOutline.updateMany({
          where: {
            id: { in: outlineIds },
            novelId,
          },
          data: {
            status: 'SKIPPED',
            updatedAt: now,
          },
        });
        break;

      case 'delete':
        // 批量删除（先删除关联的章节）
        const outlinesToDelete = await prisma.chapterOutline.findMany({
          where: { id: { in: outlineIds }, novelId },
          select: { generatedChapterId: true },
        });

        const chapterIdsToDelete = outlinesToDelete
          .map((o) => o.generatedChapterId)
          .filter((id): id is string => id !== null);

        if (chapterIdsToDelete.length > 0) {
          await prisma.chapter.deleteMany({
            where: { id: { in: chapterIdsToDelete } },
          });
        }

        result = await prisma.chapterOutline.deleteMany({
          where: {
            id: { in: outlineIds },
            novelId,
          },
        });
        break;

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }

    // 6. 返回结果
    return Response.json({
      message: `批量${operation === 'approve' ? '批准' : operation === 'skip' ? '跳过' : '删除'}成功`,
      operation,
      count: result.count,
    });
  } catch (error) {
    console.error('Batch operation error:', error);

    return Response.json(
      { error: 'Failed to perform batch operation', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
