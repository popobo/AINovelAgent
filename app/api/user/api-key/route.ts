import { NextRequest } from 'next/server';
import { z } from 'zod';
import { updateUserOpenRouterKey } from '@/lib/db/user';
import { handleUserGet, handleUserPut } from '@/lib/handlers/userSettings';

const apiKeySchema = z.object({
  openRouterKey: z.string().min(1).optional().nullable(),
});

/**
 * 包装函数，将 unknown 类型转换为 string | null
 */
async function updateUserOpenRouterKeyWrapper(
  userId: string,
  value: unknown
) {
  const openRouterKey = typeof value === 'string' ? value : null;
  return updateUserOpenRouterKey(userId, openRouterKey);
}

/**
 * 获取用户的API Key（仅返回是否存在，不返回实际值）
 */
export async function GET(request: NextRequest) {
  return handleUserGet({
    request,
    responseFormatter: (user) => ({
      hasApiKey: !!user.openRouterKey,
    }),
  });
}

/**
 * 更新用户的API Key
 */
export async function PUT(request: NextRequest) {
  return handleUserPut({
    request,
    fieldName: 'openRouterKey',
    schema: apiKeySchema,
    updateFunction: updateUserOpenRouterKeyWrapper,
    responseFormatter: (updatedUser) => {
      // 不返回密码和API Key
      const { password: _password, openRouterKey: _openRouterKey, ...userWithoutSensitiveData } = updatedUser;
      return {
        user: userWithoutSensitiveData,
        hasApiKey: !!updatedUser.openRouterKey,
      };
    },
  });
}
