import { prisma } from '@/lib/prisma';
import { generateEmbedding } from './generator';

export interface SearchResult {
  chapterId: string;
  content: string;
  similarity: number;
  chapterIndex: number;
  chapterTitle: string | null;
}

/**
 * 基于向量相似度检索相关章节
 */
export async function searchSimilarChapters(
  query: string,
  novelId: string,
  apiKey: string,
  embeddingModel: string = 'openai/text-embedding-3-small',
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<SearchResult[]> {
  // 生成查询文本的embedding
  const queryEmbedding = await generateEmbedding(query, apiKey, embeddingModel);
  const vectorString = `[${queryEmbedding.join(',')}]`;

  // 使用pgvector的cosine相似度进行检索
  // cosine距离越小，相似度越高，所以ORDER BY distance ASC
  const results = await prisma.$queryRaw<Array<{
    chapterId: string;
    content: string;
    similarity: number;
    chapterIndex: number;
    chapterTitle: string | null;
  }>>`
    SELECT 
      e."chapterId",
      e.content,
      1 - (e.embedding <=> ${vectorString}::vector) as similarity,
      c."chapterIndex",
      c.title as "chapterTitle"
    FROM embeddings e
    JOIN chapters c ON c.id = e."chapterId"
    WHERE e."novelId" = ${novelId}
      AND 1 - (e.embedding <=> ${vectorString}::vector) >= ${similarityThreshold}
    ORDER BY e.embedding <=> ${vectorString}::vector ASC
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    chapterId: r.chapterId,
    content: r.content,
    similarity: Number(r.similarity),
    chapterIndex: Number(r.chapterIndex),
    chapterTitle: r.chapterTitle,
  }));
}

/**
 * 根据相关性阈值动态检索章节（返回所有超过阈值的章节）
 */
export async function searchSimilarChaptersByThreshold(
  query: string,
  novelId: string,
  apiKey: string,
  embeddingModel: string = 'openai/text-embedding-3-small',
  similarityThreshold: number = 0.7,
  maxResults: number = 20
): Promise<SearchResult[]> {
  // 生成查询文本的embedding
  const queryEmbedding = await generateEmbedding(query, apiKey, embeddingModel);
  const vectorString = `[${queryEmbedding.join(',')}]`;

  // 检索所有超过阈值的章节
  const results = await prisma.$queryRaw<Array<{
    chapterId: string;
    content: string;
    similarity: number;
    chapterIndex: number;
    chapterTitle: string | null;
  }>>`
    SELECT 
      e."chapterId",
      e.content,
      1 - (e.embedding <=> ${vectorString}::vector) as similarity,
      c."chapterIndex",
      c.title as "chapterTitle"
    FROM embeddings e
    JOIN chapters c ON c.id = e."chapterId"
    WHERE e."novelId" = ${novelId}
      AND 1 - (e.embedding <=> ${vectorString}::vector) >= ${similarityThreshold}
    ORDER BY e.embedding <=> ${vectorString}::vector ASC
    LIMIT ${maxResults}
  `;

  return results.map((r) => ({
    chapterId: r.chapterId,
    content: r.content,
    similarity: Number(r.similarity),
    chapterIndex: Number(r.chapterIndex),
    chapterTitle: r.chapterTitle,
  }));
}

