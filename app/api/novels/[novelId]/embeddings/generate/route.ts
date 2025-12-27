import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getNovelById } from '@/lib/db/novel';
import { getUserById } from '@/lib/db/user';
import { generateNovelEmbeddingsBatch } from '@/lib/embeddings/chapter-embeddings';

/**
 * 批量生成小说的所有章节向量
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> | { novelId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { novelId } = resolvedParams;

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

    if (novel.chapters.length === 0) {
      return NextResponse.json(
        { error: '小说没有章节' },
        { status: 400 }
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

    console.log('批量生成章节向量:', {
      novelId,
      userId: session.user.id,
      apiKeyPrefix: user.openRouterKey.substring(0, 10) + '...',
      model,
      force,
      totalChapters: novel.chapters.length,
    });

    // 批量生成向量
    const result = await generateNovelEmbeddingsBatch(novelId, user.openRouterKey, {
      model,
      force,
      batchSize: 20,
    });

    // 生成响应消息
    let message = '';
    if (result.failed === 0) {
      message = `成功生成 ${result.generated} 个章节的向量`;
      if (result.skipped > 0) {
        message += `，跳过 ${result.skipped} 个已有向量的章节`;
      }
    } else if (result.generated === 0) {
      message = `所有章节向量生成失败`;
    } else {
      message = `批量生成完成：成功 ${result.generated} 个，跳过 ${result.skipped} 个，失败 ${result.failed} 个`;
    }

    return NextResponse.json({
      message,
      stats: result,
    });
  } catch (error) {
    console.error('批量生成向量错误:', error);

    let errorMessage = '批量生成向量失败';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      if (error.message.includes('OpenRouter') || error.message.includes('API Key')) {
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
