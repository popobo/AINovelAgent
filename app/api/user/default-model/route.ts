import { NextRequest } from 'next/server';
import { z } from 'zod';
import { updateUserDefaultModel } from '@/lib/db/user';
import { handleUserGet, handleUserPut } from '@/lib/handlers/userSettings';

const defaultModelSchema = z.object({
  defaultModel: z.string().min(1).optional().nullable(),
});

/**
 * 包装函数，将 unknown 类型转换为 string | null
 */
async function updateUserDefaultModelWrapper(
  userId: string,
  value: unknown
) {
  const defaultModel = typeof value === 'string' ? value : null;
  return updateUserDefaultModel(userId, defaultModel);
}

/**
 * 获取用户的默认模型
 */
export async function GET(request: NextRequest) {
  return handleUserGet({
    request,
    responseFormatter: (user) => ({
      defaultModel: user.defaultModel || null,
    }),
  });
}

/**
 * 更新用户的默认模型
 */
export async function PUT(request: NextRequest) {
  return handleUserPut({
    request,
    fieldName: 'defaultModel',
    schema: defaultModelSchema,
    updateFunction: updateUserDefaultModelWrapper,
  });
}
