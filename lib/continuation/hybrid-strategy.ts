import { prisma } from '@/lib/prisma';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import { searchSimilarChaptersByThreshold } from '@/lib/embeddings/search';
import type { ChatMessage } from '@/lib/openrouter/types';
import type { Prisma } from '@prisma/client';

/**
 * 基于混合方案的续写（RAG + 摘要 + 关键信息）
 */
export async function continueWithHybridStrategy(
  novelId: string,
  userPrompt: string,
  apiKey: string,
  model: string = 'openai/gpt-4o',
  similarityThreshold: number = 0.7,
  maxRAGChapters: number = 5,
  recentCount: number = 3
): Promise<string> {
  const client = createOpenRouterClient(apiKey);

  // 1. 获取全局摘要（压缩版）
  // 对于 GLOBAL 类型，targetId 为 null，不能使用 findUnique，改用 findFirst
  const globalSummary = await prisma.summary.findFirst({
    where: {
      novelId,
      type: 'GLOBAL',
      targetId: null,
    },
  });

  // 2. RAG检索相关章节
  const relevantChapters = await searchSimilarChaptersByThreshold(
    userPrompt,
    novelId,
    apiKey,
    'openai/text-embedding-3-small',
    similarityThreshold,
    maxRAGChapters
  );

  // 3. 获取最近N章的摘要
  const recentChapters = await prisma.chapter.findMany({
    where: { novelId },
    orderBy: { chapterIndex: 'desc' },
    take: recentCount,
    include: {
      novel: true,
    },
  });

  const recentSummaries = await Promise.all(
    recentChapters.reverse().map(async (ch) => {
      const summary = await prisma.summary.findUnique({
        where: {
          novelId_type_targetId: {
            novelId,
            type: 'CHAPTER',
            targetId: ch.id,
          },
        },
      });
      return {
        chapterIndex: ch.chapterIndex,
        title: ch.title,
        summary: summary?.content || ch.summary || '',
      };
    })
  );

  // 4. 获取关键信息
  const metadata = await prisma.novelMetadata.findUnique({
    where: { novelId },
  });

  // 5. 组装上下文（控制各部分长度）
  const contextParts: string[] = [];

  // 全局摘要（压缩，只取核心部分）
  if (globalSummary && globalSummary.metadata) {
    const meta = globalSummary.metadata as Prisma.JsonObject;
    const corePlot = (typeof meta.corePlot === 'string' ? meta.corePlot : null) || globalSummary.content.slice(0, 500);
    contextParts.push(`全局摘要（核心剧情）：\n${corePlot}\n`);
  }

  // RAG检索的相关章节（限制长度）
  if (relevantChapters.length > 0) {
    const ragContext = relevantChapters
      .slice(0, maxRAGChapters)
      .map((ch, index) => {
        const content = ch.content.slice(0, 1500); // 限制每个章节内容长度
        return `相关章节 ${index + 1}（第${ch.chapterIndex}章 ${ch.chapterTitle || ''}）：\n${content}`;
      })
      .join('\n\n---\n\n');
    contextParts.push(`相关章节内容：\n${ragContext}\n`);
  }

  // 最近章节摘要
  if (recentSummaries.length > 0) {
    const recentText = recentSummaries
      .map(ch => `第${ch.chapterIndex}章 ${ch.title || ''}：\n${ch.summary.slice(0, 300)}`) // 限制摘要长度
      .join('\n\n');
    contextParts.push(`最近章节摘要：\n${recentText}\n`);
  }

  // 关键信息（只取最重要的）
  if (metadata) {
    if (metadata.characters) {
      const characters = metadata.characters as Prisma.JsonObject;
      const mainCharacters = Object.entries(characters)
        .slice(0, 5) // 只取前5个主要人物
        .map(([name, info]) => {
          const infoObj = info as Prisma.JsonObject;
          const description = typeof infoObj.description === 'string' ? infoObj.description : '';
          const role = typeof infoObj.role === 'string' ? infoObj.role : '';
          return `${name}：${description || role || ''}`;
        })
        .join('\n');
      contextParts.push(`主要人物：\n${mainCharacters}\n`);
    }
    if (metadata.worldRules) {
      const worldRules = metadata.worldRules as Prisma.JsonObject;
      const setting = typeof worldRules.setting === 'string' ? worldRules.setting : null;
      contextParts.push(`世界观设定：\n${setting || JSON.stringify(worldRules, null, 2)}\n`);
    }
  }

  const context = contextParts.join('\n---\n\n');

  // 6. 构建续写提示词
  const prompt = `你是一位专业的小说续写助手。请根据以下综合上下文信息，继续创作小说的后续内容。

${context}

用户要求：
${userPrompt}

要求：
1. 保持与原文风格一致
2. 综合考虑全局剧情、相关章节内容和最近剧情发展
3. 遵循已有的人物设定和世界观
4. 剧情发展要合理，符合前文逻辑
5. 续写内容应该自然流畅，与前面的章节衔接良好
6. 续写长度建议在1000-3000字左右

请开始续写：`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一位专业的小说创作助手，擅长根据已有内容进行续写，保持风格和逻辑的一致性。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const response = await client.chatCompletion({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('混合续写错误:', error);
    throw new Error(`续写失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

