import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getNovelById } from '@/lib/db/novel';
import { getUserById } from '@/lib/db/user';
import { generateChapterEmbedding } from '@/lib/embeddings/chapter-embeddings';
import { deleteChapterEmbedding } from '@/lib/db/embedding';

/**
 * 为单个章节生成向量
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string; chapterId: string }> | { novelId: string; chapterId: string } }
) {
  try {
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

    const chapter = novel.chapters.find((ch) => ch.id === chapterId);
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

    const body = await request.json().catch(() => ({}));
    // Embedding 生成必须使用专门的 embedding 模型
    // 优先级：请求参数 > 用户默认设置 > 系统默认
    const model = body.embeddingModel || user.defaultEmbeddingModel || 'openai/text-embedding-3-small';
    const force = body.force || false;

    console.log('生成章节向量:', {
      novelId,
      chapterId,
      chapterIndex: chapter.chapterIndex,
      userId: session.user.id,
      model,
      force,
    });

    const embedding = await generateChapterEmbedding(chapterId, user.openRouterKey, model, force);

    return NextResponse.json({
      message: force ? '向量重新生成成功' : '向量生成成功',
      embedding,
    });
  } catch (error) {
    console.error('生成章节向量错误:', error);

    let errorMessage = '生成章节向量失败';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      if (errorMessage === '章节已有向量，如需重新生成请设置 force=true') {
        statusCode = 400;
      } else if (error.message.includes('OpenRouter') || error.message.includes('API Key')) {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message.includes('网络') || error.message.includes('network')) {
        statusCode = 503;
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
 * 删除单个章节的向量
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string; chapterId: string }> | { novelId: string; chapterId: string } }
) {
  try {
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

    const chapter = novel.chapters.find((ch) => ch.id === chapterId);
    if (!chapter) {
      return NextResponse.json(
        { error: '章节不存在' },
        { status: 404 }
      );
    }

    const deleted = await deleteChapterEmbedding(chapterId);

    return NextResponse.json({
      message: '删除成功',
      deleted,
    });
  } catch (error) {
    console.error('删除章节向量错误:', error);
    return NextResponse.json(
      { error: '删除章节向量失败' },
      { status: 500 }
    );
  }
}
