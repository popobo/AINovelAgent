import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getNovelById } from '@/lib/db/novel';
import { getEmbeddingStatus, deleteNovelEmbeddings } from '@/lib/db/embedding';

/**
 * 获取小说的所有章节向量状态
 */
export async function GET(
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

    const status = await getEmbeddingStatus(novelId);
    return NextResponse.json(status);
  } catch (error) {
    console.error('获取向量状态错误:', error);
    return NextResponse.json(
      { error: '获取向量状态失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除小说的所有章节向量
 */
export async function DELETE(
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

    const deletedCount = await deleteNovelEmbeddings(novelId);

    return NextResponse.json({
      message: '删除成功',
      deletedCount,
    });
  } catch (error) {
    console.error('删除向量错误:', error);
    return NextResponse.json(
      { error: '删除向量失败' },
      { status: 500 }
    );
  }
}
