import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getNovelById } from '@/lib/db/novel';
import { getUserById } from '@/lib/db/user';
import { searchSimilarChapters } from '@/lib/embeddings/search';

/**
 * 测试向量搜索功能
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> | { novelId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { novelId } = resolvedParams;

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

    const body = await request.json();
    const { query, limit = 5 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: '请提供查询文本' },
        { status: 400 }
      );
    }

    // 使用用户的默认 embedding 模型
    const embeddingModel = user.defaultEmbeddingModel || 'openai/text-embedding-3-small';

    console.log('测试向量搜索:', {
      novelId,
      userId: session.user.id,
      query: query.substring(0, 50),
      embeddingModel,
      limit,
    });

    // 执行向量搜索
    const results = await searchSimilarChapters(
      query,
      novelId,
      user.openRouterKey,
      embeddingModel,
      limit,
      0.0 // 相似度阈值设为0，返回所有结果以便查看
    );

    return NextResponse.json({
      query,
      embeddingModel,
      resultsCount: results.length,
      results: results.map((r) => ({
        chapterIndex: r.chapterIndex,
        chapterTitle: r.chapterTitle,
        similarity: r.similarity,
        contentPreview: r.content.substring(0, 100) + '...',
      })),
    });
  } catch (error) {
    console.error('测试向量搜索错误:', error);
    return NextResponse.json(
      {
        error: '测试向量搜索失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
