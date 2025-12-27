import { createOpenRouterClient } from '@/lib/openrouter/client';
import { searchSimilarChaptersByThreshold } from '@/lib/embeddings/search';
import type { ChatMessage } from '@/lib/openrouter/types';

/**
 * 基于RAG方案的续写
 */
export async function continueWithRAGStrategy(
  novelId: string,
  userPrompt: string,
  apiKey: string,
  model: string = 'openai/gpt-4o',
  similarityThreshold: number = 0.7,
  maxChapters: number = 10
): Promise<string> {
  const client = createOpenRouterClient(apiKey);

  // 1. 使用用户提示词检索相关章节
  const relevantChapters = await searchSimilarChaptersByThreshold(
    userPrompt,
    novelId,
    apiKey,
    'openai/text-embedding-3-small',
    similarityThreshold,
    maxChapters
  );

  // 2. 构建相关章节的上下文
  const relevantContext = relevantChapters
    .map((ch, index) => {
      // 只使用章节内容的前2000字符，避免上下文过长
      const content = ch.content.slice(0, 2000);
      return `相关章节 ${index + 1}（第${ch.chapterIndex}章 ${ch.chapterTitle || ''}，相似度：${(ch.similarity * 100).toFixed(1)}%）：\n${content}`;
    })
    .join('\n\n---\n\n');

  // 3. 获取最近章节（用于了解当前剧情位置）
  const { prisma } = await import('@/lib/prisma');
  const recentChapters = await prisma.chapter.findMany({
    where: { novelId },
    orderBy: { chapterIndex: 'desc' },
    take: 3,
  });

  const recentContext = recentChapters
    .reverse()
    .map(ch => `第${ch.chapterIndex}章 ${ch.title || ''}：\n${ch.content.slice(0, 1000)}`)
    .join('\n\n---\n\n');

  // 4. 构建续写提示词
  const prompt = `你是一位专业的小说续写助手。请根据以下相关章节内容，继续创作小说的后续内容。

相关章节内容（基于你的要求检索到的）：
${relevantContext}

最近章节内容（了解当前剧情位置）：
${recentContext}

用户要求：
${userPrompt}

要求：
1. 保持与原文风格一致
2. 参考相关章节的内容和风格
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
    console.error('RAG续写错误:', error);
    throw new Error(`续写失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

