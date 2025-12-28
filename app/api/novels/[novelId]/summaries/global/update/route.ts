import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById } from '@/lib/db/user';
import { getNovelById } from '@/lib/db/novel';
import { prisma } from '@/lib/prisma';
import { generateGlobalSummary } from '@/lib/summary/global-summary';

/**
 * 手动触发全局摘要重新生成
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

    // 使用用户配置的默认模型，如果没有则使用默认值
    const body = await request.json().catch(() => ({}));
    const model = body.model || user.defaultModel || 'openai/gpt-4o-mini';

    // 生成全局摘要
    const globalSummary = await generateGlobalSummary(novelId, user.openRouterKey, model);

    // 构建完整摘要文本
    const fullSummaryText = `核心剧情主线：
${globalSummary.corePlot}

人物关系：
${JSON.stringify(globalSummary.characters, null, 2)}

世界观设定：
${JSON.stringify(globalSummary.worldBuilding, null, 2)}

核心主题：
${globalSummary.keyThemes.join(', ')}

最近章节摘要：
${globalSummary.recentChapters.map(ch => `第${ch.chapterIndex}章 ${ch.title || ''}：${ch.summary}`).join('\n\n')}`;

    // 保存或更新全局摘要
    // 对于 GLOBAL 类型，targetId 为 null，不能使用 findUnique，改用 findFirst
    const existingSummary = await prisma.summary.findFirst({
      where: {
        novelId: novelId,
        type: 'GLOBAL',
        targetId: null,
      },
    });

    if (existingSummary) {
      await prisma.summary.update({
        where: { id: existingSummary.id },
        data: {
          content: fullSummaryText,
          metadata: {
            corePlot: globalSummary.corePlot,
            characters: globalSummary.characters,
            worldBuilding: globalSummary.worldBuilding,
            keyThemes: globalSummary.keyThemes,
            recentChapters: globalSummary.recentChapters,
          },
          version: existingSummary.version + 1,
        },
      });
    } else {
      await prisma.summary.create({
        data: {
          novelId: novelId,
          type: 'GLOBAL',
          targetId: null,
          content: fullSummaryText,
          metadata: {
            corePlot: globalSummary.corePlot,
            characters: globalSummary.characters,
            worldBuilding: globalSummary.worldBuilding,
            keyThemes: globalSummary.keyThemes,
            recentChapters: globalSummary.recentChapters,
          },
        },
      });
    }

    return NextResponse.json({
      message: '全局摘要生成成功',
      summary: globalSummary,
    });
  } catch (error) {
    console.error('全局摘要生成错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '全局摘要生成失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取全局摘要
 */
export async function GET(
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

    // 对于 GLOBAL 类型，targetId 为 null，不能使用 findUnique，改用 findFirst
    const summary = await prisma.summary.findFirst({
      where: {
        novelId: novelId,
        type: 'GLOBAL',
        targetId: null,
      },
    });

    if (!summary) {
      return NextResponse.json(
        { error: '全局摘要不存在，请先生成' },
        { status: 404 }
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('获取全局摘要错误:', error);
    return NextResponse.json(
      { error: '获取全局摘要失败' },
      { status: 500 }
    );
  }
}

