import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserById } from '@/lib/db/user';
import { getNovelById } from '@/lib/db/novel';
import { identifyChapters } from '@/lib/novel/chapter-parser';
import { prisma } from '@/lib/prisma';

/**
 * 识别小说章节
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

    // 获取小说的第一个临时章节内容
    const firstChapter = novel.chapters.find(ch => ch.chapterIndex === 1);
    if (!firstChapter) {
      return NextResponse.json(
        { error: '未找到小说内容' },
        { status: 404 }
      );
    }

    // 如果章节标题是"待解析"，说明这是上传时的临时章节，使用其内容
    const content = firstChapter.title === '待解析' 
      ? firstChapter.content 
      : novel.chapters.map(ch => `${ch.title || `第${ch.chapterIndex}章`}\n\n${ch.content}`).join('\n\n');

    const body = await request.json().catch(() => ({}));
    const model = body.model || 'openai/gpt-4o-mini';

    // 识别章节
    const chapters = await identifyChapters(content, user.openRouterKey, model);

    // 删除旧的临时章节（如果是待解析状态）
    if (firstChapter.title === '待解析') {
      await prisma.chapter.deleteMany({
        where: { novelId: novel.id },
      });
    }

    // 创建新章节
    const createdChapters = await Promise.all(
      chapters.map((chapter) =>
        prisma.chapter.create({
          data: {
            novelId: novel.id,
            chapterIndex: chapter.index,
            title: chapter.title,
            content: chapter.content,
            wordCount: chapter.content.length,
          },
        })
      )
    );

    return NextResponse.json({
      message: '章节识别成功',
      chapters: createdChapters.map((ch) => ({
        id: ch.id,
        chapterIndex: ch.chapterIndex,
        title: ch.title,
        wordCount: ch.wordCount,
      })),
    });
  } catch (error) {
    console.error('章节识别错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '章节识别失败' },
      { status: 500 }
    );
  }
}

