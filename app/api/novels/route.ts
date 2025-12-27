import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getNovelsByUserId } from '@/lib/db/novel';

/**
 * 获取用户的小说列表
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

    const novels = await getNovelsByUserId(session.user.id);

    return NextResponse.json({ novels });
  } catch (error) {
    console.error('获取小说列表错误:', error);
    return NextResponse.json(
      { error: '获取小说列表失败' },
      { status: 500 }
    );
  }
}

