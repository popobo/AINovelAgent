import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getNovelById } from '@/lib/db/novel';
import { mergeChapters } from '@/lib/db/novel';
import { z } from 'zod';

/**
 * 合并章节
 * 将每N个章节合并为一个大章
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

    // 验证小说存在且属于当前用户
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

    // 解析请求体
    const body = await request.json();
    const schema = z.object({
      chaptersPerGroup: z.number().int().positive().min(2),
    });

    const validatedData = schema.parse(body);
    const { chaptersPerGroup } = validatedData;

    // 执行合并
    const result = await mergeChapters(novelId, chaptersPerGroup);

    return NextResponse.json({
      message: '章节合并成功',
      result,
    });
  } catch (error) {
    console.error('章节合并错误:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // 处理已知错误
      if (
        error.message.includes('没有章节') ||
        error.message.includes('少于合并数量')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '章节合并失败' },
      { status: 500 }
    );
  }
}

