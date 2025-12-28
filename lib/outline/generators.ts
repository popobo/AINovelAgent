/**
 * 大纲生成逻辑
 */

import { prisma } from '@/lib/prisma';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import { getOutlineGenerationPrompt } from './prompts';
import { InvalidOutlineResponseError, OutlineGenerationError } from './errors';
import { normalizeNovelMetadata } from './metadata-utils';
import type { ChatMessage } from '@/lib/openrouter/types';
import type { Prisma } from '@prisma/client';
import type {
  ChapterOutlineData,
  OutlineGenerationOptions,
  OutlineGenerationResult,
} from './types';

/**
 * 批量生成章节大纲
 */
export async function generateOutlines(
  options: OutlineGenerationOptions
): Promise<{ outlines: ChapterOutlineData[]; summary: OutlineGenerationResult['summary'] }> {
  const { novelId, chapterCount, apiKey, model, startingContext } = options;

  try {
    // 1. 获取当前最大章节索引，确定起始章节
    const maxChapter = await prisma.chapter.findFirst({
      where: { novelId },
      orderBy: { chapterIndex: 'desc' },
    });

    const startingChapterIndex = (maxChapter?.chapterIndex || 0) + 1;

    // 2. 检查是否已有大纲，避免重复生成
    const existingOutlines = await prisma.chapterOutline.findMany({
      where: {
        novelId,
        chapterIndex: { gte: startingChapterIndex },
      },
      orderBy: { chapterIndex: 'asc' },
    });

    if (existingOutlines.length > 0) {
      throw new OutlineGenerationError(
        `已有${existingOutlines.length}个大纲从第${existingOutlines[0].chapterIndex}章开始，请先删除或重新生成`
      );
    }

    // 3. 加载上下文信息
    const [globalSummary, metadata, recentChapters] = await Promise.all([
      // 获取全局摘要
      prisma.summary.findFirst({
        where: { novelId, type: 'GLOBAL', targetId: null },
      }),
      // 获取元数据
      prisma.novelMetadata.findUnique({
        where: { novelId },
      }),
      // 获取最近5章用于上下文
      prisma.chapter.findMany({
        where: { novelId },
        orderBy: { chapterIndex: 'desc' },
        take: 5,
      }),
    ]);

    // 4. 构建上下文对象
    const context = {
      globalSummary: globalSummary?.content || '',
      metadata: normalizeNovelMetadata(metadata),
      recentChapters: recentChapters.reverse().map((ch) => ({
        chapterIndex: ch.chapterIndex,
        title: ch.title,
        summary: ch.summary,
      })),
      startingContext,
    };

    // 5. 构建提示词
    const prompt = getOutlineGenerationPrompt(chapterCount, startingChapterIndex, context);

    // 6. 调用LLM生成大纲
    const client = createOpenRouterClient(apiKey);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是专业的小说大纲设计师，擅长构建连贯、有深度的剧情结构。你的大纲总是符合人物设定和世界观，并且每章都有明确的推进作用。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await client.chatCompletion({
      model: model || 'openai/gpt-4o-mini',
      messages,
      temperature: 0.5, // 较低的温度以获得更稳定的结构化输出
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content || '';
    if (!content) {
      throw new OutlineGenerationError('AI返回内容为空');
    }

    // 7. 解析JSON响应
    const result = parseOutlineResponse(content);

    // 8. 保存到数据库
    const savedOutlines = await prisma.$transaction(
      result.outlines.map((outline, index) =>
        prisma.chapterOutline.create({
          data: {
            novelId,
            chapterIndex: startingChapterIndex + index,
            title: outline.title,
            plotSummary: outline.plotSummary,
            characterGoals: outline.characterGoals as Prisma.InputJsonValue,
            conflicts: outline.conflicts as Prisma.InputJsonValue,
            emotionalArc: outline.emotionalArc,
            keyScenes: outline.keyScenes as Prisma.InputJsonValue,
            status: 'PENDING',
            version: 1,
          },
        })
      )
    );

    return {
      outlines: savedOutlines.map((o) => ({
        ...o,
        characterGoals:
          o.characterGoals === null
            ? undefined
            : (o.characterGoals as Array<{ character: string; goal: string }> | undefined),
        conflicts:
          o.conflicts === null
            ? undefined
            : (o.conflicts as { internal?: string[]; external?: string[] } | undefined),
        emotionalArc: o.emotionalArc === null ? undefined : o.emotionalArc,
        keyScenes:
          o.keyScenes === null
            ? undefined
            : (o.keyScenes as Array<{ description: string; position: string }> | undefined),
        notes: o.notes === null ? undefined : o.notes,
      })),
      summary: result.summary,
    };
  } catch (error) {
    if (error instanceof OutlineGenerationError) {
      throw error;
    }
    throw new OutlineGenerationError(
      `生成大纲失败: ${error instanceof Error ? error.message : '未知错误'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 解析大纲响应JSON
 */
function parseOutlineResponse(content: string): OutlineGenerationResult {
  try {
    // 尝试提取JSON（可能包含markdown代码块）
    let jsonStr = content.trim();

    // 移除可能的markdown代码块标记
    if (jsonStr.startsWith('```')) {
      const lines = jsonStr.split('\n');
      // 找到第一个{和最后一个}
      const startIdx = lines.findIndex((line) => line.trim().startsWith('{'));
      const endIdx = lines.findLastIndex((line) => line.trim().endsWith('}'));
      if (startIdx >= 0 && endIdx >= 0 && endIdx > startIdx) {
        jsonStr = lines.slice(startIdx, endIdx + 1).join('\n');
      }
    }

    const parsed = JSON.parse(jsonStr) as OutlineGenerationResult;

    // 验证结构
    if (!Array.isArray(parsed.outlines)) {
      throw new InvalidOutlineResponseError('响应缺少outlines数组');
    }

    if (parsed.outlines.length === 0) {
      throw new InvalidOutlineResponseError('outlines数组为空');
    }

    // 验证每个大纲的必需字段
    for (let i = 0; i < parsed.outlines.length; i++) {
      const outline = parsed.outlines[i];
      if (!outline.title || !outline.plotSummary) {
        throw new InvalidOutlineResponseError(`第${i + 1}个大纲缺少必需字段（title或plotSummary）`);
      }
    }

    // 验证summary字段
    if (!parsed.summary || !parsed.summary.overallArc) {
      throw new InvalidOutlineResponseError('响应缺少summary.overallArc字段');
    }

    return parsed;
  } catch (error) {
    if (error instanceof InvalidOutlineResponseError) {
      throw error;
    }
    throw new InvalidOutlineResponseError(
      `JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 重新生成大纲（从指定章节开始）
 */
export async function regenerateOutlines(options: {
  novelId: string;
  fromChapter: number;
  chapterCount: number;
  keepApproved: boolean;
  apiKey: string;
  model?: string;
  startingContext?: {
    overallDirection?: string;
    specificRequirements?: string[];
  };
}): Promise<{ outlines: ChapterOutlineData[]; summary: OutlineGenerationResult['summary'] }> {
  const { novelId, fromChapter, chapterCount, keepApproved, apiKey, model, startingContext } = options;

  try {
    // 1. 删除现有的大纲（如果keepApproved为false）
    if (!keepApproved) {
      await prisma.chapterOutline.deleteMany({
        where: {
          novelId,
          chapterIndex: { gte: fromChapter },
        },
      });
    } else {
      // 只删除PENDING状态的大纲
      await prisma.chapterOutline.deleteMany({
        where: {
          novelId,
          chapterIndex: { gte: fromChapter },
          status: 'PENDING',
        },
      });
    }

    // 2. 调用正常的生成逻辑
    return generateOutlines({
      novelId,
      chapterCount,
      apiKey,
      model,
      startingContext,
    });
  } catch (error) {
    throw new OutlineGenerationError(
      `重新生成大纲失败: ${error instanceof Error ? error.message : '未知错误'}`,
      error instanceof Error ? error : undefined
    );
  }
}
