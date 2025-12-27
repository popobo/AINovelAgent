import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getNovelById } from '@/lib/db/novel';
import { saveContinuation } from '@/lib/continuation/save';
import { z } from 'zod';
import type { ContinuationSaveType } from '@prisma/client';

const saveSchema = z.object({
  continuationId: z.string(),
  saveType: z.enum(['APPEND', 'NEW_VERSION']),
  chapterId: z.string().optional(), // APPEND模式需要
});

/**
 * 保存续写结果
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> | { novelId: string } }
) {
  try {
    // Next.js 16 中 params 可能是 Promise，需要先 await
    const resolvedParams = await Promise.resolve(params);
    const novelId = resolvedParams.novelId;

    if (!novelId) {
      return NextResponse.json(
        { error: '小说ID不能为空' },
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

    const body = await request.json();
    const validatedData = saveSchema.parse(body);

    if (validatedData.saveType === 'APPEND' && !validatedData.chapterId) {
      return NextResponse.json(
        { error: '追加模式需要指定章节ID' },
        { status: 400 }
      );
    }

    const result = await saveContinuation(
      validatedData.continuationId,
      validatedData.saveType as ContinuationSaveType,
      validatedData.chapterId
    );

    return NextResponse.json({
      message: '保存成功',
      chapterId: result.chapterId,
      chapterIndex: result.chapterIndex,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('保存续写结果错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}

