import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById, updateUserDefaultEmbeddingModel } from '@/lib/db/user';
import { z } from 'zod';

const defaultEmbeddingModelSchema = z.object({
  defaultEmbeddingModel: z.string().min(1).optional().nullable(),
});

/**
 * 获取用户的默认Embedding模型
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      defaultEmbeddingModel: user.defaultEmbeddingModel || null,
    });
  } catch (error) {
    console.error('获取默认Embedding模型错误:', error);
    return NextResponse.json(
      { error: '获取默认Embedding模型失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新用户的默认Embedding模型
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = defaultEmbeddingModelSchema.parse(body);

    const updatedUser = await updateUserDefaultEmbeddingModel(
      session.user.id,
      validatedData.defaultEmbeddingModel || null
    );

    return NextResponse.json({
      message: '默认Embedding模型更新成功',
      defaultEmbeddingModel: updatedUser.defaultEmbeddingModel || null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('更新默认Embedding模型错误:', error);
    return NextResponse.json(
      { error: '更新默认Embedding模型失败' },
      { status: 500 }
    );
  }
}
