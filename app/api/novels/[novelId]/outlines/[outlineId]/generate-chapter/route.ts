/**
 * 从大纲生成章节 API
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { generateChapterFromOutline } from '@/lib/outline';
import { generateChapterFromOutlineSchema } from '@/lib/outline/validators';
import { OutlineNotFoundError, OutlineStatusError } from '@/lib/outline/errors';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/novels/[novelId]/outlines/[outlineId]/generate-chapter
 * 基于批准的大纲生成章节内容
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

    // 4. 解析和验证请求体（允许空请求体）
    let body = {};
    try {
      body = await request.json();
    } catch {
      // 空请求体，使用默认值
      body = {};
    }

    const validationResult = generateChapterFromOutlineSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { model, additionalPrompt } = validationResult.data;

    // 使用请求中的模型，如果没有则使用用户默认模型，如果都没有则使用默认模型
    const selectedModel = model || user?.defaultModel || 'openai/gpt-4o';

    console.log('生成章节请求:', {
      outlineId,
      selectedModel,
      additionalPrompt,
      userDefaultModel: user?.defaultModel,
    });

    // 5. 生成章节
    const result = await generateChapterFromOutline({
      outlineId,
      apiKey,
      model: selectedModel,
      additionalPrompt,
    });

    // 6. 返回结果
    return Response.json({
      message: `章节生成成功 (${result.wordCount}字)`,
      chapter: {
        id: result.chapterId,
        chapterIndex: result.chapterIndex,
        title: result.title,
        wordCount: result.wordCount,
      },
      outlineId,
    });
  } catch (error) {
    console.error('Chapter generation error:', error);

    // 处理特定错误
    if (error instanceof OutlineNotFoundError) {
      return Response.json({ error: 'Outline not found' }, { status: 404 });
    }

    if (error instanceof OutlineStatusError) {
      return Response.json(
        { error: `Invalid outline status: ${error.message}` },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return Response.json(
      {
        error: 'Failed to generate chapter',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
