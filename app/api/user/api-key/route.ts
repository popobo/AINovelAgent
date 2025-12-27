import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById, updateUserOpenRouterKey } from '@/lib/db/user';
import { z } from 'zod';

const apiKeySchema = z.object({
  openRouterKey: z.string().min(1).optional().nullable(),
});

/**
 * 获取用户的API Key（仅返回是否存在，不返回实际值）
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
      hasApiKey: !!user.openRouterKey,
    });
  } catch (error) {
    console.error('获取API Key状态错误:', error);
    return NextResponse.json(
      { error: '获取API Key状态失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新用户的API Key
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
    const validatedData = apiKeySchema.parse(body);

    const updatedUser = await updateUserOpenRouterKey(
      session.user.id,
      validatedData.openRouterKey || null
    );

    // 不返回密码和API Key
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, openRouterKey, ...userWithoutSensitiveData } = updatedUser;

    return NextResponse.json({
      message: 'API Key更新成功',
      user: userWithoutSensitiveData,
      hasApiKey: !!updatedUser.openRouterKey,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('更新API Key错误:', error);
    return NextResponse.json(
      { error: '更新API Key失败' },
      { status: 500 }
    );
  }
}

