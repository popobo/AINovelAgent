import { prisma } from '@/lib/prisma';
import { checkChapterHasEmbedding } from '@/lib/db/embedding';
import { storeChapterEmbedding, storeChapterEmbeddings } from './store';

/**
 * 单个章节向量生成结果
 */
export interface SingleEmbeddingResult {
  id: string;
  chapterId: string;
  createdAt: Date;
}

/**
 * 批量生成进度
 */
export interface BatchProgress {
  current: number;
  total: number;
  currentChapterTitle: string;
  generated: number;
  skipped: number;
  failed: number;
}

/**
 * 批量生成结果
 */
export interface BatchEmbeddingResult {
  total: number;
  generated: number;
  skipped: number;
  failed: number;
  errors: Array<{ chapterId: string; chapterTitle: string; error: string }>;
}

/**
 * 为单个章节生成向量
 */
export async function generateChapterEmbedding(
  chapterId: string,
  apiKey: string,
  model?: string,
  force: boolean = false
): Promise<SingleEmbeddingResult> {
  // 获取章节信息
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { novel: true },
  });

  if (!chapter) {
    throw new Error('章节不存在');
  }

  // 检查是否已有向量
  const hasEmbedding = await checkChapterHasEmbedding(chapterId);
  if (hasEmbedding && !force) {
    throw new Error('章节已有向量，如需重新生成请设置 force=true');
  }

  // 如果强制重新生成，先删除现有向量
  if (hasEmbedding && force) {
    await prisma.embedding.deleteMany({
      where: { chapterId },
    });
  }

  // 生成并存储向量
  await storeChapterEmbedding(chapterId, chapter.content, apiKey, model);

  // 获取创建的向量记录
  const embedding = await prisma.embedding.findFirst({
    where: { chapterId },
    orderBy: { createdAt: 'desc' },
  });

  if (!embedding) {
    throw new Error('向量创建失败');
  }

  return {
    id: embedding.id,
    chapterId: chapter.id,
    createdAt: embedding.createdAt,
  };
}

/**
 * 批量为小说生成章节向量
 */
export async function generateNovelEmbeddings(
  novelId: string,
  apiKey: string,
  options?: {
    model?: string;
    force?: boolean;
    onProgress?: (progress: BatchProgress) => void;
  }
): Promise<BatchEmbeddingResult> {
  const model = options?.model || 'openai/text-embedding-3-small';
  const force = options?.force || false;

  // 获取所有章节
  const chapters = await prisma.chapter.findMany({
    where: { novelId },
    orderBy: { chapterIndex: 'asc' },
  });

  if (chapters.length === 0) {
    return {
      total: 0,
      generated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
  }

  const result: BatchEmbeddingResult = {
    total: chapters.length,
    generated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // 处理每个章节
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const chapterTitle = `第${chapter.chapterIndex}章 ${chapter.title || '未命名'}`;

    // 更新进度
    if (options?.onProgress) {
      options.onProgress({
        current: i + 1,
        total: chapters.length,
        currentChapterTitle: chapterTitle,
        generated: result.generated,
        skipped: result.skipped,
        failed: result.failed,
      });
    }

    try {
      // 检查是否已有向量
      const hasEmbedding = await checkChapterHasEmbedding(chapter.id);

      if (hasEmbedding && !force) {
        result.skipped++;
        continue;
      }

      // 如果强制重新生成，先删除现有向量
      if (hasEmbedding && force) {
        await prisma.embedding.deleteMany({
          where: { chapterId: chapter.id },
        });
      }

      // 生成并存储向量
      await storeChapterEmbedding(chapter.id, chapter.content, apiKey, model);
      result.generated++;

      // 添加延迟以避免速率限制
      if (i < chapters.length - 1) {
        await sleep(500);
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        chapterId: chapter.id,
        chapterTitle,
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  return result;
}

/**
 * 批量为小说生成章节向量（批量API版本）
 * 一次请求处理多个章节，提高效率
 */
export async function generateNovelEmbeddingsBatch(
  novelId: string,
  apiKey: string,
  options?: {
    model?: string;
    force?: boolean;
    batchSize?: number;
    onProgress?: (progress: BatchProgress) => void;
  }
): Promise<BatchEmbeddingResult> {
  const model = options?.model || 'openai/text-embedding-3-small';
  const force = options?.force || false;
  const batchSize = options?.batchSize || 20; // 每批处理20个章节

  // 获取所有章节
  const chapters = await prisma.chapter.findMany({
    where: { novelId },
    orderBy: { chapterIndex: 'asc' },
  });

  if (chapters.length === 0) {
    return {
      total: 0,
      generated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
  }

  const result: BatchEmbeddingResult = {
    total: chapters.length,
    generated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // 按批次处理章节
  for (let batchIndex = 0; batchIndex < chapters.length; batchIndex += batchSize) {
    const batch = chapters.slice(batchIndex, batchIndex + batchSize);
    const chaptersToProcess: typeof chapters = [];
    const chaptersToSkip: typeof chapters = [];

    // 分离需要生成和跳过的章节
    for (const chapter of batch) {
      const hasEmbedding = await checkChapterHasEmbedding(chapter.id);

      if (hasEmbedding && !force) {
        chaptersToSkip.push(chapter);
      } else {
        chaptersToProcess.push(chapter);
      }
    }

    // 跳过的章节计数
    result.skipped += chaptersToSkip.length;

    // 更新进度（显示当前批次的第一章）
    if (options?.onProgress && chaptersToProcess.length > 0) {
      const firstChapter = chaptersToProcess[0];
      const chapterTitle = `第${firstChapter.chapterIndex}章 ${firstChapter.title || '未命名'}`;
      options.onProgress({
        current: batchIndex + 1,
        total: chapters.length,
        currentChapterTitle: chapterTitle,
        generated: result.generated,
        skipped: result.skipped,
        failed: result.failed,
      });
    }

    // 批量生成向量
    if (chaptersToProcess.length > 0) {
      try {
        // 批量删除需要强制重新生成的章节的现有向量
        if (force) {
          const chapterIdsToDelete = chaptersToProcess.map((ch) => ch.id);
          await prisma.embedding.deleteMany({
            where: {
              chapterId: { in: chapterIdsToDelete },
            },
          });
        }

        // 批量生成并存储
        await storeChapterEmbeddings(
          chaptersToProcess.map((ch) => ({ id: ch.id, content: ch.content })),
          apiKey,
          model
        );

        result.generated += chaptersToProcess.length;
      } catch {
        // 批量失败时，尝试单个生成
        for (const chapter of chaptersToProcess) {
          try {
            await storeChapterEmbedding(chapter.id, chapter.content, apiKey, model);
            result.generated++;
          } catch (singleError) {
            result.failed++;
            result.errors.push({
              chapterId: chapter.id,
              chapterTitle: `第${chapter.chapterIndex}章 ${chapter.title || '未命名'}`,
              error: singleError instanceof Error ? singleError.message : '未知错误',
            });
          }
        }
      }

      // 批次间添加延迟
      if (batchIndex + batchSize < chapters.length) {
        await sleep(500);
      }
    }
  }

  return result;
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
