import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById } from '@/lib/db/user';
import { getNovelById } from '@/lib/db/novel';
import { continueNovel } from '@/lib/continuation';
import { z } from 'zod';
import type { ContinuationStrategy } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const continueSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空'),
  strategy: z.enum(['SUMMARY', 'RAG', 'HYBRID']),
  model: z.string().optional(),
  // 摘要方案参数
  recentCount: z.number().min(1).max(20).optional(),
  // RAG方案参数
  similarityThreshold: z.number().min(0).max(1).optional(),
  maxRAGChapters: z.number().min(1).max(20).optional(),
});

/**
 * 执行续写
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

    const user = await getUserById(session.user.id);
    if (!user?.openRouterKey) {
      return NextResponse.json(
        { error: '请先配置OpenRouter API Key' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = continueSchema.parse(body);

    // 使用用户选择的模型，如果没有则使用用户配置的默认模型，最后使用系统默认值
    const model = validatedData.model || user.defaultModel || 'openai/gpt-4o';

    // 执行续写
    const continuationResult = await continueNovel({
      novelId: novelId,
      userPrompt: validatedData.prompt,
      apiKey: user.openRouterKey,
      model: model,
      strategy: validatedData.strategy as ContinuationStrategy,
      recentCount: validatedData.recentCount,
      similarityThreshold: validatedData.similarityThreshold,
      maxRAGChapters: validatedData.maxRAGChapters,
    });

    // 保存续写记录（但不保存到章节，由用户选择）
    const { prisma } = await import('@/lib/prisma');
    const continuation = await prisma.continuation.create({
      data: {
        novelId: novelId,
        strategy: validatedData.strategy as ContinuationStrategy,
        prompt: validatedData.prompt,
        result: continuationResult,
        context: validatedData as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      message: '续写成功',
      continuation: {
        id: continuation.id,
        result: continuationResult,
        strategy: continuation.strategy,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('续写错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '续写失败' },
      { status: 500 }
    );
  }
}

