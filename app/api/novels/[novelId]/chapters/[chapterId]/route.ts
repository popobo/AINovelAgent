import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getNovelById } from '@/lib/db/novel';
import { prisma } from '@/lib/prisma';

/**
 * 获取章节详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string; chapterId: string }> | { novelId: string; chapterId: string } }
) {
  try {
    // Next.js 16 中 params 可能是 Promise，需要先 await
    const resolvedParams = await Promise.resolve(params);
    const { novelId, chapterId } = resolvedParams;

    if (!novelId || !chapterId) {
      return NextResponse.json(
        { error: '小说ID或章节ID不能为空' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const novel = await getNovelById(novelId);
    if (!novel) {
      return NextResponse.json(
        { error: '小说不存在' },
        { status: 404 }
      );
    }

    if (novel.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权限访问此小说' },
        { status: 403 }
      );
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: '章节不存在' },
        { status: 404 }
      );
    }

    if (chapter.novelId !== novelId) {
      return NextResponse.json(
        { error: '章节不属于该小说' },
        { status: 400 }
      );
    }

    return NextResponse.json({ chapter });
  } catch (error) {
    console.error('获取章节详情错误:', error);
    return NextResponse.json(
      { error: '获取章节详情失败' },
      { status: 500 }
    );
  }
}

