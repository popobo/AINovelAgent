import { NextRequest } from 'next/server';
import { z } from 'zod';
import { updateUserDefaultEmbeddingModel } from '@/lib/db/user';
import { handleUserGet, handleUserPut } from '@/lib/handlers/userSettings';

const defaultEmbeddingModelSchema = z.object({
  defaultEmbeddingModel: z.string().min(1).optional().nullable(),
});

/**
 * 包装函数，将 unknown 类型转换为 string | null
 */
async function updateUserDefaultEmbeddingModelWrapper(
  userId: string,
  value: unknown
) {
  const defaultEmbeddingModel = typeof value === 'string' ? value : null;
  return updateUserDefaultEmbeddingModel(userId, defaultEmbeddingModel);
}

/**
 * 获取用户的默认Embedding模型
 */
export async function GET(request: NextRequest) {
  return handleUserGet({
    request,
    responseFormatter: (user) => ({
      defaultEmbeddingModel: user.defaultEmbeddingModel || null,
    }),
  });
}

/**
 * 更新用户的默认Embedding模型
 */
export async function PUT(request: NextRequest) {
  return handleUserPut({
    request,
    fieldName: 'defaultEmbeddingModel',
    schema: defaultEmbeddingModelSchema,
    updateFunction: updateUserDefaultEmbeddingModelWrapper,
  });
}
