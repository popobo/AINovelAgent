/**
 * 基于大纲生成章节内容
 */

import { prisma } from '@/lib/prisma';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import { getChapterFromOutlinePrompt } from './prompts';
import {
  OutlineNotFoundError,
  OutlineStatusError,
  ChapterGenerationError,
} from './errors';
import type { ChatMessage } from '@/lib/openrouter/types';
import type { ChapterGenerationFromOutlineOptions } from './types';

/**
 * 基于批准的大纲生成章节内容
 */
export async function generateChapterFromOutline(
  options: ChapterGenerationFromOutlineOptions
): Promise<{ chapterId: string; chapterIndex: number; title: string; content: string; wordCount: number }> {
  const { outlineId, apiKey, model, additionalPrompt } = options;

  try {
    // 1. 获取大纲数据
    const outline = await prisma.chapterOutline.findUnique({
      where: { id: outlineId },
    });

    if (!outline) {
      throw new OutlineNotFoundError(outlineId);
    }

    // 2. 验证大纲状态
    if (outline.status !== 'APPROVED') {
      throw new OutlineStatusError(outline.status, 'APPROVED');
    }

    // 3. 加载必要的上下文（不使用metadata）
    const [globalSummary, previousChapter] = await Promise.all([
      // 全局摘要
      prisma.summary.findFirst({
        where: { novelId: outline.novelId, type: 'GLOBAL', targetId: null },
      }),
      // 上一章摘要
      prisma.chapter.findFirst({
        where: {
          novelId: outline.novelId,
          chapterIndex: outline.chapterIndex - 1,
        },
      }),
    ]);

    // 4. 构建提示词
    const prompt = getChapterFromOutlinePrompt({
      outline: {
        title: outline.title,
        plotSummary: outline.plotSummary,
        characterGoals: (outline.characterGoals as Array<{ character: string; goal: string }>) || undefined,
        conflicts: (outline.conflicts as { internal?: string[]; external?: string[] }) || undefined,
        emotionalArc: outline.emotionalArc || undefined,
        keyScenes: (outline.keyScenes as Array<{ description: string; position: string }>) || undefined,
      },
      globalSummary: globalSummary?.content || '',
      previousChapterSummary: previousChapter?.summary || '',
      additionalPrompt,
    });

    // 5. 生成章节内容
    const client = createOpenRouterClient(apiKey);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是专业的小说创作助手，擅长严格按照大纲进行创作，保持风格和逻辑的一致性。你的作品总是充分体现大纲的情感弧线和关键场景。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await client.chatCompletion({
      model: model || 'openai/gpt-4o',
      messages,
      temperature: 0.8, // 较高的温度以获得更有创意的内容
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || '';
    if (!content) {
      throw new ChapterGenerationError('AI返回内容为空');
    }

    // 6. 创建章节记录
    const chapter = await prisma.chapter.create({
      data: {
        novelId: outline.novelId,
        chapterIndex: outline.chapterIndex,
        title: outline.title,
        content,
        wordCount: content.length,
      },
    });

    // 7. 更新大纲状态
    await prisma.chapterOutline.update({
      where: { id: outlineId },
      data: {
        status: 'COMPLETED',
        generatedChapterId: chapter.id,
      },
    });

    return {
      chapterId: chapter.id,
      chapterIndex: chapter.chapterIndex,
      title: chapter.title || '',
      content,
      wordCount: content.length,
    };
  } catch (error) {
    if (
      error instanceof OutlineNotFoundError ||
      error instanceof OutlineStatusError ||
      error instanceof ChapterGenerationError
    ) {
      throw error;
    }
    throw new ChapterGenerationError(
      `生成章节失败: ${error instanceof Error ? error.message : '未知错误'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 重新生成章节内容（删除旧章节并重新生成）
 */
export async function regenerateChapterFromOutline(
  options: ChapterGenerationFromOutlineOptions & { deleteOldChapter: boolean }
): Promise<{ chapterId: string; chapterIndex: number; title: string; content: string; wordCount: number }> {
  const { outlineId, deleteOldChapter } = options;

  // 1. 获取大纲
  const outline = await prisma.chapterOutline.findUnique({
    where: { id: outlineId },
  });

  if (!outline) {
    throw new OutlineNotFoundError(outlineId);
  }

  // 2. 如果有已生成的章节且需要删除
  if (deleteOldChapter && outline.generatedChapterId) {
    await prisma.chapter.delete({
      where: { id: outline.generatedChapterId },
    }).catch(() => {
      // 忽略删除失败（章节可能已被手动删除）
    });
  }

  // 3. 重新生成
  return generateChapterFromOutline(options);
}
