import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById, updateUserSummaryMaxTokens } from '@/lib/db/user';
import { z } from 'zod';

const summaryMaxTokensSchema = z.object({
  summaryMaxTokens: z.number().int().min(100).max(10000).optional().nullable(),
});

/**
 * 获取用户的章节摘要max_tokens参数
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
      summaryMaxTokens: user.summaryMaxTokens ?? null,
    });
  } catch (error) {
    console.error('获取章节摘要max_tokens参数错误:', error);
    return NextResponse.json(
      { error: '获取章节摘要max_tokens参数失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新用户的章节摘要max_tokens参数
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
    const validatedData = summaryMaxTokensSchema.parse(body);

    const updatedUser = await updateUserSummaryMaxTokens(
      session.user.id,
      validatedData.summaryMaxTokens ?? null
    );

    return NextResponse.json({
      message: '章节摘要max_tokens参数更新成功',
      summaryMaxTokens: updatedUser.summaryMaxTokens ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('更新章节摘要max_tokens参数错误:', error);
    return NextResponse.json(
      { error: '更新章节摘要max_tokens参数失败' },
      { status: 500 }
    );
  }
}

