import { NextRequest } from 'next/server';
import { z } from 'zod';
import { updateUserSummaryMaxTokens } from '@/lib/db/user';
import { handleUserGet, handleUserPut } from '@/lib/handlers/userSettings';

const summaryMaxTokensSchema = z.object({
  summaryMaxTokens: z.number().int().min(100).max(10000).optional().nullable(),
});

/**
 * 包装函数，将 unknown 类型转换为 number | null
 */
async function updateUserSummaryMaxTokensWrapper(
  userId: string,
  value: unknown
) {
  const summaryMaxTokens = typeof value === 'number' ? value : null;
  return updateUserSummaryMaxTokens(userId, summaryMaxTokens);
}

/**
 * 获取用户的章节摘要max_tokens参数
 */
export async function GET(request: NextRequest) {
  return handleUserGet({
    request,
    responseFormatter: (user) => ({
      summaryMaxTokens: user.summaryMaxTokens ?? null,
    }),
  });
}

/**
 * 更新用户的章节摘要max_tokens参数
 */
export async function PUT(request: NextRequest) {
  return handleUserPut({
    request,
    fieldName: 'summaryMaxTokens',
    schema: summaryMaxTokensSchema,
    updateFunction: updateUserSummaryMaxTokensWrapper,
  });
}
