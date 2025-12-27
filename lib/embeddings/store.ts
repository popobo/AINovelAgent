import { prisma } from '@/lib/prisma';
import { generateEmbedding } from './generator';

/**
 * 为章节生成并存储embedding
 */
export async function storeChapterEmbedding(
  chapterId: string,
  content: string,
  apiKey: string,
  embeddingModel: string = 'openai/text-embedding-3-small'
): Promise<void> {
  // 生成embedding
  const embedding = await generateEmbedding(content, apiKey, embeddingModel);

  // 获取章节信息
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { novel: true },
  });

  if (!chapter) {
    throw new Error('章节不存在');
  }

  // 转换为PostgreSQL vector格式的字符串
  const vectorString = `[${embedding.join(',')}]`;

  // 使用原始SQL插入（因为Prisma不支持vector类型）
  await prisma.$executeRaw`
    INSERT INTO embeddings (id, "novelId", "chapterId", content, embedding, "createdAt")
    VALUES (gen_random_uuid()::text, ${chapter.novelId}, ${chapterId}, ${content}, ${vectorString}::vector, NOW())
    ON CONFLICT DO NOTHING
  `;
}

/**
 * 批量为章节生成并存储embedding
 */
export async function storeChapterEmbeddings(
  chapters: Array<{ id: string; content: string }>,
  apiKey: string,
  embeddingModel: string = 'openai/text-embedding-3-small'
): Promise<void> {
  if (chapters.length === 0) {
    return;
  }

  // 批量生成embedding
  const { generateEmbeddings } = await import('./generator');
  const texts = chapters.map((ch) => ch.content);
  const embeddings = await generateEmbeddings(texts, apiKey, embeddingModel);

  // 获取第一个章节以获取novelId
  const firstChapter = await prisma.chapter.findUnique({
    where: { id: chapters[0].id },
  });

  if (!firstChapter) {
    throw new Error('章节不存在');
  }

  // 批量插入embedding
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const embedding = embeddings[i];
    const vectorString = `[${embedding.join(',')}]`;

    await prisma.$executeRaw`
      INSERT INTO embeddings (id, "novelId", "chapterId", content, embedding, "createdAt")
      VALUES (gen_random_uuid()::text, ${firstChapter.novelId}, ${chapter.id}, ${chapter.content}, ${vectorString}::vector, NOW())
      ON CONFLICT DO NOTHING
    `;
  }
}

