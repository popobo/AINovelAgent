import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth/register';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    const user = await registerUser({
      name: validatedData.name,
      email: validatedData.email || undefined,
      password: validatedData.password,
    });

    return NextResponse.json(
      { message: '注册成功', user },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === '用户名已存在' || error.message === '邮箱已存在') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    console.error('注册错误:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}

