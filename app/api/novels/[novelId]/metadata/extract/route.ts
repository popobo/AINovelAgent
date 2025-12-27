import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById } from '@/lib/db/user';
import { getNovelById } from '@/lib/db/novel';
import { prisma } from '@/lib/prisma';
import { extractMetadataFromChapters } from '@/lib/summary/metadata-extractor';
import type { Prisma } from '@prisma/client';

/**
 * 提取小说的关键信息元数据
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> | { novelId: string } }
) {
  try {
    // Next.js 16 中 params 可能是 Promise，需要先 await
    const resolvedParams = await Promise.resolve(params);
    const novelId = resolvedParams.novelId;

    if (!novelId) {
      return NextResponse.json(
        { error: '小说ID不能为空' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const novel = await getNovelById(novelId);
    if (!novel) {
      return NextResponse.json(
        { error: '小说不存在' },
        { status: 404 }
      );
    }

    if (novel.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权限访问此小说' },
        { status: 403 }
      );
    }

    const user = await getUserById(session.user.id);
    if (!user?.openRouterKey) {
      return NextResponse.json(
        { error: '请先配置OpenRouter API Key' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const model = body.model || 'openai/gpt-4o-mini';

    // 获取所有章节
    const chapters = novel.chapters.map(ch => ({
      content: ch.content,
      chapterIndex: ch.chapterIndex,
    }));

    if (chapters.length === 0) {
      return NextResponse.json(
        { error: '小说没有章节' },
        { status: 400 }
      );
    }

    // 提取元数据
    const metadata = await extractMetadataFromChapters(chapters, user.openRouterKey, model);

    // 保存或更新元数据
    const existingMetadata = await prisma.novelMetadata.findUnique({
      where: { novelId: novelId },
    });

    if (existingMetadata) {
      await prisma.novelMetadata.update({
        where: { novelId: novelId },
        data: {
          characters: metadata.characters as Prisma.InputJsonValue,
          locations: metadata.locations as Prisma.InputJsonValue,
          timeline: existingMetadata.timeline as Prisma.InputJsonValue,
          worldRules: metadata.worldRules as Prisma.InputJsonValue,
          keyEvents: metadata.keyEvents as Prisma.InputJsonValue,
        },
      });
    } else {
      await prisma.novelMetadata.create({
        data: {
          novelId: novelId,
          characters: metadata.characters as Prisma.InputJsonValue,
          locations: metadata.locations as Prisma.InputJsonValue,
          worldRules: metadata.worldRules as Prisma.InputJsonValue,
          keyEvents: metadata.keyEvents as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      message: '元数据提取成功',
      metadata,
    });
  } catch (error) {
    console.error('元数据提取错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '元数据提取失败' },
      { status: 500 }
    );
  }
}

