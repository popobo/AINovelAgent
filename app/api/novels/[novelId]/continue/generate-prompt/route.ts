import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById } from '@/lib/db/user';
import { getNovelById } from '@/lib/db/novel';
import { prisma } from '@/lib/prisma';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import type { ChatMessage } from '@/lib/openrouter/types';

/**
 * 生成续写提示词
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> | { novelId: string } }
) {
  try {
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

    // 获取全局摘要
    // 对于 GLOBAL 类型，targetId 为 null，不能使用 findUnique，改用 findFirst
    const globalSummary = await prisma.summary.findFirst({
      where: {
        novelId,
        type: 'GLOBAL',
        targetId: null,
      },
    });

    // 获取最近3章的摘要
    const recentChapters = await prisma.chapter.findMany({
      where: { novelId },
      orderBy: { chapterIndex: 'desc' },
      take: 3,
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

    // 获取元数据
    const metadata = await prisma.novelMetadata.findUnique({
      where: { novelId },
    });

    // 构建上下文信息
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
        const characters = metadata.characters as Record<string, unknown>;
        const mainCharacters = Object.entries(characters)
          .slice(0, 5)
          .map(([name, info]: [string, unknown]) => {
            const infoObj = info as Record<string, unknown>;
            return `${name}：${(infoObj.description as string) || (infoObj.role as string) || ''}`;
          })
          .join('\n');
        contextParts.push(`主要人物：\n${mainCharacters}\n`);
      }
      if (metadata.worldRules) {
        const worldRules = metadata.worldRules as Record<string, unknown>;
        const setting = worldRules.setting as string | undefined;
        contextParts.push(`世界观设定：\n${setting || JSON.stringify(worldRules, null, 2)}\n`);
      }
    }

    const context = contextParts.join('\n---\n\n');

    // 使用AI生成续写提示词
    const client = createOpenRouterClient(user.openRouterKey);

    const prompt = `你是一位专业的小说创作助手。请根据以下小说的上下文信息，生成3-5个续写提示词建议。

${context}

请生成3-5个不同方向的续写提示词，每个提示词应该：
1. 具有明确的续写方向
2. 符合小说当前的剧情发展
3. 能够推动故事向前发展
4. 字数在50-100字之间

请以JSON数组格式返回，不要包含其他文字说明。

JSON格式：
[
  "提示词1",
  "提示词2",
  "提示词3"
]

请返回JSON数组：`;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一位专业的小说创作助手，擅长根据已有内容生成续写提示词。请只返回有效的JSON数组格式，不要包含其他文字说明。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await client.chatCompletion({
      model: user.defaultModel || 'openai/gpt-4o',
      messages,
      temperature: 0.8,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || '[]';
    let jsonStr = content.trim();
    
    // 清理可能的markdown代码块
    if (jsonStr.startsWith('```')) {
      const lines = jsonStr.split('\n');
      jsonStr = lines.slice(1, -1).join('\n');
    }
    if (jsonStr.startsWith('```json')) {
      const lines = jsonStr.split('\n');
      jsonStr = lines.slice(1, -1).join('\n');
    }

    const prompts = JSON.parse(jsonStr);

    return NextResponse.json({
      prompts: Array.isArray(prompts) ? prompts : [],
    });
  } catch (error) {
    console.error('生成提示词错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成提示词失败' },
      { status: 500 }
    );
  }
}
