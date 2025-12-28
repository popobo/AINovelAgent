import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserById } from '@/lib/db/user';
import { withAuth } from '@/lib/middleware/auth';
import type { User } from '@prisma/client';

/**
 * 用户设置GET请求的选项
 */
export interface HandleUserGetOptions {
  request?: NextRequest;
  responseFormatter: (user: User) => Record<string, unknown>;
}

/**
 * 用户设置PUT请求的选项
 */
export interface HandleUserPutOptions {
  request: NextRequest;
  fieldName: string;
  schema: z.ZodSchema;
  updateFunction: (userId: string, value: unknown) => Promise<User>;
  responseFormatter?: (user: User) => Record<string, unknown>;
}

/**
 * 处理用户设置的GET请求
 * 统一处理认证、用户查询和响应格式化
 */
export async function handleUserGet(options: HandleUserGetOptions) {
  try {
    // 认证
    const auth = await withAuth(options.request!);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 获取用户
    const user = await getUserById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 返回格式化的响应
    return NextResponse.json(options.responseFormatter(user));
  } catch (error) {
    console.error('获取用户设置失败:', error);
    return NextResponse.json({ error: '获取用户设置失败' }, { status: 500 });
  }
}

/**
 * 处理用户设置的PUT请求
 * 统一处理认证、请求体验证、数据更新和响应格式化
 */
export async function handleUserPut(options: HandleUserPutOptions) {
  try {
    // 认证
    const auth = await withAuth(options.request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 解析请求体
    const body = await options.request.json();

    // 验证并更新
    const validatedData = options.schema.parse(body);
    const value = validatedData[options.fieldName] || null;

    const updatedUser = await options.updateFunction(auth.userId, value);

    // 构建响应
    const responseData: Record<string, unknown> = {
      message: '更新成功',
      [options.fieldName]: updatedUser[options.fieldName as keyof User] || null,
    };

    // 如果有额外的响应格式化器,添加其结果
    if (options.responseFormatter) {
      Object.assign(responseData, options.responseFormatter(updatedUser));
    }

    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error(`更新${options.fieldName}失败:`, error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
