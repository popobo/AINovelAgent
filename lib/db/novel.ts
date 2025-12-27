import { prisma } from '@/lib/prisma';
import type { Novel, Chapter } from '@prisma/client';

/**
 * 获取用户的所有小说
 */
export async function getNovelsByUserId(userId: string): Promise<Novel[]> {
  return prisma.novel.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * 根据ID获取小说（包含章节）
 */
export async function getNovelById(id: string): Promise<(Novel & { chapters: Chapter[] }) | null> {
  return prisma.novel.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { chapterIndex: 'asc' },
      },
    },
  });
}

/**
 * 创建小说
 */
export async function createNovel(data: {
  title: string;
  description?: string;
  userId: string;
}): Promise<Novel> {
  return prisma.novel.create({
    data,
  });
}

/**
 * 更新小说
 */
export async function updateNovel(
  id: string,
  data: {
    title?: string;
    description?: string;
  }
): Promise<Novel> {
  return prisma.novel.update({
    where: { id },
    data,
  });
}

/**
 * 删除小说
 */
export async function deleteNovel(id: string): Promise<Novel> {
  return prisma.novel.delete({
    where: { id },
  });
}

/**
 * 更新小说的上下文长度配置
 */
export async function updateNovelMaxContextLength(
  id: string,
  maxContextLength: number | null
): Promise<Novel> {
  return prisma.novel.update({
    where: { id },
    data: { maxContextLength },
  });
}

/**
 * 合并章节
 * 将每N个章节合并为一个大章
 * @param novelId 小说ID
 * @param chaptersPerGroup 每N个章节为一组
 * @returns 合并结果统计信息
 */
export async function mergeChapters(
  novelId: string,
  chaptersPerGroup: number
): Promise<{
  originalChapterCount: number;
  mergedChapterCount: number;
  groups: Array<{
    newChapterIndex: number;
    originalChapterIndices: number[];
    newTitle: string;
  }>;
}> {
  // 获取所有章节，按索引排序
  const chapters = await prisma.chapter.findMany({
    where: { novelId },
    orderBy: { chapterIndex: 'asc' },
  });

  if (chapters.length === 0) {
    throw new Error('没有章节可合并');
  }

  if (chapters.length < chaptersPerGroup) {
    throw new Error(`章节数量（${chapters.length}）少于合并数量（${chaptersPerGroup}）`);
  }

  // 将章节分组
  const groups: Chapter[][] = [];
  for (let i = 0; i < chapters.length; i += chaptersPerGroup) {
    groups.push(chapters.slice(i, i + chaptersPerGroup));
  }

  const result = {
    originalChapterCount: chapters.length,
    mergedChapterCount: groups.length,
    groups: [] as Array<{
      newChapterIndex: number;
      originalChapterIndices: number[];
      newTitle: string;
    }>,
  };

  // 使用事务处理合并
  await prisma.$transaction(async (tx) => {
    // 获取要删除的章节ID
    const chapterIdsToDelete = chapters.map((ch) => ch.id);

    // 删除关联的Summary记录
    await tx.summary.deleteMany({
      where: {
        novelId,
        type: 'CHAPTER',
        targetId: {
          in: chapterIdsToDelete,
        },
      },
    });

    // 删除关联的Embedding记录
    await tx.embedding.deleteMany({
      where: {
        chapterId: {
          in: chapterIdsToDelete,
        },
      },
    });

    // 删除原章节
    await tx.chapter.deleteMany({
      where: {
        id: {
          in: chapterIdsToDelete,
        },
      },
    });

    // 创建合并后的新章节
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const newChapterIndex = i + 1;

      // 生成合并后的标题
      const firstChapterIndex = group[0].chapterIndex;
      const lastChapterIndex = group[group.length - 1].chapterIndex;
      const newTitle =
        firstChapterIndex === lastChapterIndex
          ? `第${firstChapterIndex}章`
          : `第${firstChapterIndex}-${lastChapterIndex}章`;

      // 合并内容
      const mergedContent = group
        .map((chapter) => {
          const chapterTitle = chapter.title
            ? `第${chapter.chapterIndex}部分 ${chapter.title}`
            : `第${chapter.chapterIndex}部分`;
          return `${chapterTitle}\n\n${chapter.content}`;
        })
        .join('\n\n---\n\n');

      // 计算总字数
      const totalWordCount = group.reduce(
        (sum, ch) => sum + (ch.wordCount || ch.content.length),
        0
      );

      // 创建新章节
      await tx.chapter.create({
        data: {
          novelId,
          chapterIndex: newChapterIndex,
          title: newTitle,
          content: mergedContent,
          wordCount: totalWordCount,
        },
      });

      result.groups.push({
        newChapterIndex,
        originalChapterIndices: group.map((ch) => ch.chapterIndex),
        newTitle,
      });
    }
  });

  return result;
}

