import { NextRequest } from 'next/server';
import { z } from 'zod';
import { updateUserSummaryTemperature } from '@/lib/db/user';
import { handleUserGet, handleUserPut } from '@/lib/handlers/userSettings';

const summaryTemperatureSchema = z.object({
  summaryTemperature: z.number().min(0).max(2).optional().nullable(),
});

/**
 * 包装函数，将 unknown 类型转换为 number | null
 */
async function updateUserSummaryTemperatureWrapper(
  userId: string,
  value: unknown
) {
  const summaryTemperature = typeof value === 'number' ? value : null;
  return updateUserSummaryTemperature(userId, summaryTemperature);
}

/**
 * 获取用户的章节摘要temperature参数
 */
export async function GET(request: NextRequest) {
  return handleUserGet({
    request,
    responseFormatter: (user) => ({
      summaryTemperature: user.summaryTemperature ?? null,
    }),
  });
}

/**
 * 更新用户的章节摘要temperature参数
 */
export async function PUT(request: NextRequest) {
  return handleUserPut({
    request,
    fieldName: 'summaryTemperature',
    schema: summaryTemperatureSchema,
    updateFunction: updateUserSummaryTemperatureWrapper,
  });
}
