/**
 * 单个大纲的 CRUD 操作 API
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { updateOutlineSchema } from '@/lib/outline/validators';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/novels/[novelId]/outlines/[outlineId]
 * 获取单个大纲详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string; outlineId: string }> }
) {
  try {
    // 1. 验证用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { novelId, outlineId } = await params;

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

    // 3. 查询大纲
    const outline = await prisma.chapterOutline.findFirst({
      where: {
        id: outlineId,
        novelId,
      },
    });

    if (!outline) {
      return Response.json({ error: 'Outline not found' }, { status: 404 });
    }

    // 4. 返回结果
    return Response.json({ outline });
  } catch (error) {
    console.error('Outline fetch error:', error);

    return Response.json(
      { error: 'Failed to fetch outline', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/novels/[novelId]/outlines/[outlineId]
 * 更新单个大纲
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string; outlineId: string }> }
) {
  try {
    // 1. 验证用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { novelId, outlineId } = await params;

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
    const validationResult = updateOutlineSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // 4. 更新大纲（版本号递增）
    const outline = await prisma.chapterOutline.update({
      where: { id: outlineId },
      data: {
        ...validationResult.data,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    // 5. 返回结果
    return Response.json({
      message: '大纲更新成功',
      outline,
    });
  } catch (error) {
    console.error('Outline update error:', error);

    return Response.json(
      { error: 'Failed to update outline', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/novels/[novelId]/outlines/[outlineId]
 * 删除单个大纲
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string; outlineId: string }> }
) {
  try {
    // 1. 验证用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { novelId, outlineId } = await params;

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

    // 3. 检查大纲是否已生成章节
    const outline = await prisma.chapterOutline.findUnique({
      where: { id: outlineId },
      include: { generatedChapter: true },
    });

    if (!outline) {
      return Response.json({ error: 'Outline not found' }, { status: 404 });
    }

    if (outline.generatedChapterId) {
      // 如果已生成章节，需要先删除章节
      await prisma.chapter.delete({
        where: { id: outline.generatedChapterId },
      }).catch(() => {
        // 忽略删除失败
      });
    }

    // 4. 删除大纲
    await prisma.chapterOutline.delete({
      where: { id: outlineId },
    });

    // 5. 返回结果
    return Response.json({
      message: '大纲删除成功',
    });
  } catch (error) {
    console.error('Outline deletion error:', error);

    return Response.json(
      { error: 'Failed to delete outline', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
