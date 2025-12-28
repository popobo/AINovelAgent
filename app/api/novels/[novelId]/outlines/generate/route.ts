/**
 * 生成章节大纲 API
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { generateOutlines } from '@/lib/outline';
import { generateOutlinesSchema } from '@/lib/outline/validators';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/novels/[novelId]/outlines/generate
 * 生成章节大纲
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

    // 3. 获取用户的 API Key 和默认模型
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { openRouterKey: true, defaultModel: true },
    });

    const apiKey = user?.openRouterKey;
    if (!apiKey) {
      return Response.json(
        { error: 'OpenRouter API key not configured. Please add your API key in settings.' },
        { status: 400 }
      );
    }

    // 4. 解析和验证请求体
    const body = await request.json();
    const validationResult = generateOutlinesSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { chapterCount, model, startingContext } = validationResult.data;

    // 使用请求中的模型，如果没有则使用用户默认模型，如果都没有则使用默认模型
    const selectedModel = model || user?.defaultModel || 'openai/gpt-4o-mini';

    // 5. 生成大纲
    const result = await generateOutlines({
      novelId,
      chapterCount,
      apiKey,
      model: selectedModel,
      startingContext,
    });

    // 6. 返回结果
    return Response.json({
      message: `成功生成${result.outlines.length}个章节大纲`,
      outlines: result.outlines,
      summary: result.summary,
    });
  } catch (error) {
    console.error('Outline generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return Response.json(
      {
        error: 'Failed to generate outlines',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
