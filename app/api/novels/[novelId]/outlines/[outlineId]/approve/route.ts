/**
 * 批准大纲 API
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/novels/[novelId]/outlines/[outlineId]/approve
 * 批准大纲（状态从 PENDING 变为 APPROVED）
 */
export async function POST(
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

    // 3. 检查大纲是否存在
    const outline = await prisma.chapterOutline.findFirst({
      where: {
        id: outlineId,
        novelId,
      },
    });

    if (!outline) {
      return Response.json({ error: 'Outline not found' }, { status: 404 });
    }

    // 4. 检查当前状态
    if (outline.status !== 'PENDING') {
      return Response.json(
        { error: `Cannot approve outline with status: ${outline.status}` },
        { status: 400 }
      );
    }

    // 5. 更新大纲状态
    const updatedOutline = await prisma.chapterOutline.update({
      where: { id: outlineId },
      data: {
        status: 'APPROVED',
        updatedAt: new Date(),
      },
    });

    // 6. 返回结果
    return Response.json({
      message: '大纲已批准',
      outline: updatedOutline,
    });
  } catch (error) {
    console.error('Outline approval error:', error);

    return Response.json(
      { error: 'Failed to approve outline', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
