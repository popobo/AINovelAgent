import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getNovelById, deleteNovel, updateNovelMaxContextLength } from '@/lib/db/novel';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * 获取小说详情
 */
export async function GET(
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

    // 获取所有章节对应的摘要数据
    const chapterSummaries = await prisma.summary.findMany({
      where: {
        novelId,
        type: 'CHAPTER',
        targetId: {
          in: novel.chapters.map(ch => ch.id),
        },
      },
    });

    // 创建章节ID到摘要的映射
    const summaryMap = new Map(
      chapterSummaries.map(summary => [summary.targetId, summary])
    );

    // 将摘要数据附加到章节上
    const chaptersWithSummaries = novel.chapters.map(chapter => {
      const summary = summaryMap.get(chapter.id);
      return {
        ...chapter,
        summaryData: summary ? {
          content: summary.content,
          metadata: summary.metadata as {
            coreEvents?: string[];
            characterActivities?: string;
            keyInformation?: string;
            emotionalClues?: string;
            newAnalysis?: {
              core_events?: Array<{event: string, details: string}>;
              characters?: Array<{name: string, personality: string, description: string}>;
              sex_scenes?: Array<{type: string, details: string}>;
              text_features?: {style: string, intensity: string};
            };
          } | null,
        } : null,
      };
    });

    return NextResponse.json({
      novel: {
        ...novel,
        chapters: chaptersWithSummaries,
      },
    });
  } catch (error) {
    console.error('获取小说详情错误:', error);
    return NextResponse.json(
      { error: '获取小说详情失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新小说的上下文长度配置
 */
export async function PUT(
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
        { error: '无权限修改此小说' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const schema = z.object({
      maxContextLength: z.number().int().positive().nullable().optional(),
    });
    
    const validatedData = schema.parse(body);

    // 更新上下文长度配置
    const updatedNovel = await updateNovelMaxContextLength(
      novelId,
      validatedData.maxContextLength ?? null
    );

    return NextResponse.json({
      message: '上下文长度配置更新成功',
      novel: {
        id: updatedNovel.id,
        maxContextLength: updatedNovel.maxContextLength,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('更新上下文长度配置错误:', error);
    return NextResponse.json(
      { error: '更新上下文长度配置失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除小说
 */
export async function DELETE(
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
        { error: '无权限删除此小说' },
        { status: 403 }
      );
    }

    // 删除小说（Prisma 的 cascade delete 会自动删除关联的章节、摘要等）
    await deleteNovel(novelId);

    return NextResponse.json({ 
      message: '小说删除成功' 
    });
  } catch (error) {
    console.error('删除小说错误:', error);
    return NextResponse.json(
      { error: '删除小说失败' },
      { status: 500 }
    );
  }
}

