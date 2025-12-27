import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById } from '@/lib/db/user';
import { createOpenRouterClient } from '@/lib/openrouter/client';

/**
 * 获取OpenRouter可用模型列表
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

    // 获取用户的API key
    const user = await getUserById(session.user.id);
    if (!user?.openRouterKey) {
      return NextResponse.json(
        { error: '请先配置OpenRouter API Key' },
        { status: 400 }
      );
    }

    const client = createOpenRouterClient(user.openRouterKey);
    const models = await client.getModels();

    return NextResponse.json({ models });
  } catch (error) {
    console.error('获取模型列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取模型列表失败' },
      { status: 500 }
    );
  }
}

