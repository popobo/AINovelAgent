import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById, updateUserDefaultModel } from '@/lib/db/user';
import { z } from 'zod';

const defaultModelSchema = z.object({
  defaultModel: z.string().min(1).optional().nullable(),
});

/**
 * 获取用户的默认模型
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
      defaultModel: user.defaultModel || null,
    });
  } catch (error) {
    console.error('获取默认模型错误:', error);
    return NextResponse.json(
      { error: '获取默认模型失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新用户的默认模型
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
    const validatedData = defaultModelSchema.parse(body);

    const updatedUser = await updateUserDefaultModel(
      session.user.id,
      validatedData.defaultModel || null
    );

    return NextResponse.json({
      message: '默认模型更新成功',
      defaultModel: updatedUser.defaultModel || null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('更新默认模型错误:', error);
    return NextResponse.json(
      { error: '更新默认模型失败' },
      { status: 500 }
    );
  }
}



