import { prisma } from '@/lib/prisma';

/**
 * 章节向量信息
 */
export interface ChapterEmbeddingInfo {
  id: string;
  chapterIndex: number;
  title: string | null;
  hasEmbedding: boolean;
  embeddingId: string | null;
  createdAt: Date | null;
}

/**
 * 向量状态信息
 */
export interface EmbeddingStatusInfo {
  novelId: string;
  totalChapters: number;
  chaptersWithEmbeddings: number;
  chaptersWithoutEmbeddings: number;
  chapters: ChapterEmbeddingInfo[];
}

/**
 * 获取小说的所有章节的向量状态
 */
export async function getEmbeddingStatus(novelId: string): Promise<EmbeddingStatusInfo> {
  const chapters = await prisma.chapter.findMany({
    where: { novelId },
    orderBy: { chapterIndex: 'asc' },
    include: {
      embeddings: {
        select: { id: true, createdAt: true },
      },
    },
  });

  const chaptersWithInfo: ChapterEmbeddingInfo[] = chapters.map((ch) => ({
    id: ch.id,
    chapterIndex: ch.chapterIndex,
    title: ch.title,
    hasEmbedding: ch.embeddings.length > 0,
    embeddingId: ch.embeddings[0]?.id || null,
    createdAt: ch.embeddings[0]?.createdAt || null,
  }));

  const chaptersWithEmbeddings = chaptersWithInfo.filter((ch) => ch.hasEmbedding).length;

  return {
    novelId,
    totalChapters: chapters.length,
    chaptersWithEmbeddings,
    chaptersWithoutEmbeddings: chapters.length - chaptersWithEmbeddings,
    chapters: chaptersWithInfo,
  };
}

/**
 * 删除小说的所有章节向量
 */
export async function deleteNovelEmbeddings(novelId: string): Promise<number> {
  const result = await prisma.embedding.deleteMany({
    where: {
      novelId,
      chapterId: { not: null }, // 只删除章节向量
    },
  });
  return result.count;
}

/**
 * 删除单个章节的向量
 */
export async function deleteChapterEmbedding(chapterId: string): Promise<boolean> {
  const result = await prisma.embedding.deleteMany({
    where: { chapterId },
  });
  return result.count > 0;
}

/**
 * 检查章节是否已有向量
 */
export async function checkChapterHasEmbedding(chapterId: string): Promise<boolean> {
  const count = await prisma.embedding.count({
    where: { chapterId },
  });
  return count > 0;
}
