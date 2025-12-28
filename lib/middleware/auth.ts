import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import type { NextRequest } from 'next/server';

/**
 * 认证成功的结果
 */
export interface AuthResult {
  success: true;
  userId: string;
}

/**
 * 认证失败的结果
 */
export interface AuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * 认证中间件
 * 验证用户session并返回用户ID或错误
 * @param _request Next.js请求对象 (未使用但保留以保持接口一致性)
 * @returns 认证结果,包含用户ID或错误信息
 */
export async function withAuth(_request: NextRequest): Promise<AuthResult | AuthError> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      error: '未授权',
      status: 401,
    };
  }

  return {
    success: true,
    userId: session.user.id,
  };
}
