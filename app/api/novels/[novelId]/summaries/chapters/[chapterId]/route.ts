import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById } from '@/lib/db/user';
import { getNovelById } from '@/lib/db/novel';
import { prisma } from '@/lib/prisma';
import { generateChapterSummary } from '@/lib/summary/chapter-summary';

/**
 * 为章节生成摘要
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string; chapterId: string }> | { novelId: string; chapterId: string } }
) {
  try {
    // Next.js 16 中 params 可能是 Promise，需要先 await
    const resolvedParams = await Promise.resolve(params);
    const { novelId, chapterId } = resolvedParams;

    if (!novelId || !chapterId) {
      return NextResponse.json(
        { error: '小说ID或章节ID不能为空' },
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

    const chapter = novel.chapters.find(ch => ch.id === chapterId);
    if (!chapter) {
      return NextResponse.json(
        { error: '章节不存在' },
        { status: 404 }
      );
    }

    const user = await getUserById(session.user.id);
    if (!user?.openRouterKey) {
      return NextResponse.json(
        { error: '请先配置OpenRouter API Key' },
        { status: 400 }
      );
    }

    // 使用用户配置的默认模型，如果没有则使用默认值
    const body = await request.json().catch(() => ({}));
    const model = body.model || user.defaultModel || 'openai/gpt-4o-mini';
    
    // 调试日志：确认使用的 API key 和模型（不暴露完整 key）
    console.log('生成章节摘要:', {
      novelId,
      chapterId,
      userId: session.user.id,
      apiKeyPrefix: user.openRouterKey.substring(0, 10) + '...',
      apiKeyLength: user.openRouterKey.length,
      model,
      defaultModel: user.defaultModel,
    });

    // 获取小说的上下文长度配置，如果没有则使用默认值 32000
    const maxContextLength = novel.maxContextLength ?? 32000;

    // 获取之前章节的摘要（如果不是第一章）
    const previousChapterSummaries: Array<{
      chapterIndex: number;
      title: string | null;
      summary: string;
    }> = [];

    if (chapter.chapterIndex > 1) {
      // 获取当前章节之前的所有章节（按 chapterIndex 升序）
      const previousChapters = novel.chapters
        .filter(ch => ch.chapterIndex < chapter.chapterIndex)
        .sort((a, b) => a.chapterIndex - b.chapterIndex);

      // 为每个之前的章节获取摘要
      for (const prevChapter of previousChapters) {
        // 优先从 Summary 表获取，如果没有则从 Chapter.summary 字段获取
        const summary = await prisma.summary.findUnique({
          where: {
            novelId_type_targetId: {
              novelId: novelId,
              type: 'CHAPTER',
              targetId: prevChapter.id,
            },
          },
        });

        const summaryContent = summary?.content || prevChapter.summary;
        if (summaryContent && summaryContent.trim().length > 0) {
          previousChapterSummaries.push({
            chapterIndex: prevChapter.chapterIndex,
            title: prevChapter.title,
            summary: summaryContent,
          });
        }
      }
    }

    // 实现上下文长度控制：如果之前章节摘要总长度超过限制，只保留最近N章
    // 估算：假设每个字符约0.5个token，预留60%给当前章节内容和prompt，40%给之前章节摘要
    const availableContextForPrevious = Math.floor(maxContextLength * 0.4);
    let totalPreviousLength = 0;
    const filteredPreviousSummaries: typeof previousChapterSummaries = [];

    // 从最近的章节开始，倒序添加，直到达到长度限制
    for (let i = previousChapterSummaries.length - 1; i >= 0; i--) {
      const summary = previousChapterSummaries[i];
      const summaryLength = summary.summary.length;
      
      // 粗略估算token数（字符数 * 0.5）
      const estimatedTokens = summaryLength * 0.5;
      
      if (totalPreviousLength + estimatedTokens <= availableContextForPrevious) {
        filteredPreviousSummaries.unshift(summary); // 保持顺序
        totalPreviousLength += estimatedTokens;
      } else {
        // 如果加上这一章会超限，就停止
        break;
      }
    }

    // 生成章节摘要
    let summaryData;
    try {
      summaryData = await generateChapterSummary(
        chapter.content,
        chapter.title || null,
        user.openRouterKey,
        model,
        maxContextLength,
        filteredPreviousSummaries.length > 0 ? filteredPreviousSummaries : undefined
      );
      
      // 验证生成的摘要是否有效
      if (!summaryData.fullSummary || summaryData.fullSummary.trim().length === 0) {
        throw new Error('生成的摘要为空，请重试');
      }
    } catch (summaryError) {
      console.error('摘要生成过程错误:', summaryError);
      throw new Error(
        summaryError instanceof Error 
          ? summaryError.message 
          : '摘要生成失败，请检查API配置或稍后重试'
      );
    }

    // 更新章节的summary字段
    await prisma.chapter.update({
      where: { id: chapter.id },
      data: { summary: summaryData.fullSummary },
    });

    // 保存到Summary表（用于统一管理）
    const existingSummary = await prisma.summary.findUnique({
      where: {
        novelId_type_targetId: {
          novelId: novelId,
          type: 'CHAPTER',
          targetId: chapter.id,
        },
      },
    });

    // 构建metadata，同时保存旧格式和新格式数据
    const metadata: Record<string, unknown> = {
      coreEvents: summaryData.coreEvents,
      characterActivities: summaryData.characterActivities,
      keyInformation: summaryData.keyInformation,
      emotionalClues: summaryData.emotionalClues,
    };
    
    // 如果有新格式的原始数据，也保存到metadata中
    if (summaryData.rawAnalysis) {
      metadata.newAnalysis = summaryData.rawAnalysis;
    }

    if (existingSummary) {
      await prisma.summary.update({
        where: { id: existingSummary.id },
        data: {
          content: summaryData.fullSummary,
          metadata,
          version: existingSummary.version + 1,
        },
      });
    } else {
      await prisma.summary.create({
        data: {
          novelId: novelId,
          type: 'CHAPTER',
          targetId: chapter.id,
          content: summaryData.fullSummary,
          metadata,
        },
      });
    }

    return NextResponse.json({
      message: '章节摘要生成成功',
      summary: summaryData,
    });
  } catch (error) {
    console.error('章节摘要生成错误:', error);
    
    // 提供更详细的错误信息
    let errorMessage = '章节摘要生成失败';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 根据错误类型设置不同的状态码和提示
      if (error.message.includes('OpenRouter') || error.message.includes('API Key')) {
        statusCode = 400; // 客户端错误（API配置问题）
        errorMessage = error.message; // 使用详细的错误信息
      } else if (error.message.includes('网络') || error.message.includes('network')) {
        statusCode = 503; // 服务不可用（网络问题）
        errorMessage = error.message;
      } else if (error.message.includes('未授权') || error.message.includes('401')) {
        statusCode = 401;
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

/**
 * 获取章节摘要
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string; chapterId: string }> | { novelId: string; chapterId: string } }
) {
  try {
    // Next.js 16 中 params 可能是 Promise，需要先 await
    const resolvedParams = await Promise.resolve(params);
    const { novelId, chapterId } = resolvedParams;

    if (!novelId || !chapterId) {
      return NextResponse.json(
        { error: '小说ID或章节ID不能为空' },
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

    const summary = await prisma.summary.findUnique({
      where: {
        novelId_type_targetId: {
          novelId: novelId,
          type: 'CHAPTER',
          targetId: chapterId,
        },
      },
    });

    if (!summary) {
      return NextResponse.json(
        { error: '摘要不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('获取章节摘要错误:', error);
    return NextResponse.json(
      { error: '获取章节摘要失败' },
      { status: 500 }
    );
  }
}

