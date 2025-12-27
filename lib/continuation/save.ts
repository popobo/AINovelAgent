import { prisma } from '@/lib/prisma';
import type { ContinuationSaveType } from '@prisma/client';

/**
 * 保存续写结果
 */
export async function saveContinuation(
  continuationId: string,
  saveType: ContinuationSaveType,
  chapterId?: string
): Promise<{ chapterId: string; chapterIndex: number }> {
  const continuation = await prisma.continuation.findUnique({
    where: { id: continuationId },
    include: { novel: true },
  });

  if (!continuation) {
    throw new Error('续写记录不存在');
  }

  if (saveType === 'APPEND') {
    // 追加到现有章节
    if (!chapterId) {
      throw new Error('追加模式需要指定章节ID');
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter || chapter.novelId !== continuation.novelId) {
      throw new Error('章节不存在或不属于该小说');
    }

    // 追加内容到章节
    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        content: `${chapter.content}\n\n${continuation.result}`,
        wordCount: chapter.content.length + continuation.result.length,
      },
    });

    // 更新续写记录
    await prisma.continuation.update({
      where: { id: continuationId },
      data: {
        saveType: 'APPEND',
        chapterId,
      },
    });

    return { chapterId, chapterIndex: chapter.chapterIndex };
  } else {
    // 创建新章节
    // 获取当前最大章节索引
    const maxChapter = await prisma.chapter.findFirst({
      where: { novelId: continuation.novelId },
      orderBy: { chapterIndex: 'desc' },
    });

    const newChapterIndex = (maxChapter?.chapterIndex || 0) + 1;

    // 创建新章节
    const newChapter = await prisma.chapter.create({
      data: {
        novelId: continuation.novelId,
        chapterIndex: newChapterIndex,
        title: `续写章节 ${newChapterIndex}`,
        content: continuation.result,
        wordCount: continuation.result.length,
      },
    });

    // 更新续写记录
    await prisma.continuation.update({
      where: { id: continuationId },
      data: {
        saveType: 'NEW_VERSION',
        chapterId: newChapter.id,
      },
    });

    return { chapterId: newChapter.id, chapterIndex: newChapterIndex };
  }
}

