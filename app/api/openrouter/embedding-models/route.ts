import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById } from '@/lib/db/user';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

/**
 * 获取OpenRouter可用的Embedding模型列表
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

    // 调用OpenRouter的embedding models专用端点
    const response = await fetch(`${OPENROUTER_API_BASE}/embeddings/models`, {
      headers: {
        'Authorization': `Bearer ${user.openRouterKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `获取Embedding模型失败: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // OpenRouter的embedding models端点返回格式可能是 { data: [...] }
    // 需要转换为统一的格式 { models: [...] }
    const models = data.data || [];

    return NextResponse.json({ models });
  } catch (error) {
    console.error('获取Embedding模型列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取Embedding模型列表失败' },
      { status: 500 }
    );
  }
}
