import { prisma } from '@/lib/prisma';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import type { ChatMessage } from '@/lib/openrouter/types';

/**
 * 基于摘要方案的续写
 */
export async function continueWithSummaryStrategy(
  novelId: string,
  userPrompt: string,
  apiKey: string,
  model: string = 'openai/gpt-4o',
  recentCount: number = 5
): Promise<string> {
  const client = createOpenRouterClient(apiKey);

  // 1. 获取全局摘要
  // 对于 GLOBAL 类型，targetId 为 null，不能使用 findUnique，改用 findFirst
  const globalSummary = await prisma.summary.findFirst({
    where: {
      novelId,
      type: 'GLOBAL',
      targetId: null,
    },
  });

  // 2. 获取最近N章的摘要
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

  // 3. 获取关键信息（元数据）
  const metadata = await prisma.novelMetadata.findUnique({
    where: { novelId },
  });

  // 4. 组装上下文
  const contextParts: string[] = [];

  if (globalSummary) {
    contextParts.push(`全局摘要：\n${globalSummary.content}\n`);
  }

  if (recentSummaries.length > 0) {
    const recentText = recentSummaries
      .map(ch => `第${ch.chapterIndex}章 ${ch.title || ''}：\n${ch.summary}`)
      .join('\n\n');
    contextParts.push(`最近章节摘要：\n${recentText}\n`);
  }

  if (metadata) {
    if (metadata.characters) {
      contextParts.push(`人物信息：\n${JSON.stringify(metadata.characters, null, 2)}\n`);
    }
    if (metadata.worldRules) {
      contextParts.push(`世界观设定：\n${JSON.stringify(metadata.worldRules, null, 2)}\n`);
    }
  }

  const context = contextParts.join('\n---\n\n');

  // 5. 构建续写提示词
  const prompt = `你是一位专业的小说续写助手。请根据以下上下文信息，继续创作小说的后续内容。

${context}

用户要求：
${userPrompt}

要求：
1. 保持与原文风格一致
2. 遵循已有的人物设定和世界观
3. 剧情发展要合理，符合前文逻辑
4. 续写内容应该自然流畅，与前面的章节衔接良好
5. 续写长度建议在1000-3000字左右

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
    console.error('续写错误:', error);
    throw new Error(`续写失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

