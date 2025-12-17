import { getAIAdapter } from "@/lib/ai/adapter";
import { createAdminClient } from "@/lib/supabase/server";
import { splitIntoChunks } from "@/lib/utils";
import type { AIProviderType } from "@/types";

export interface EmbeddingOptions {
  provider?: AIProviderType;
  chunkSize?: number;
  chunkOverlap?: number;
  batchSize?: number;
}

/**
 * 为章节内容创建向量嵌入
 */
export async function createChapterEmbeddings(
  novelId: string,
  chapterId: string,
  content: string,
  chapterNumber: number,
  options?: EmbeddingOptions
): Promise<number> {
  const adapter = getAIAdapter();
  const supabase = createAdminClient();

  const chunkSize = options?.chunkSize || 500;
  const chunkOverlap = options?.chunkOverlap || 50;
  const batchSize = options?.batchSize || 10;

  // 分割内容为chunks
  const chunks = splitIntoChunks(content, chunkSize, chunkOverlap);

  // 批量创建embeddings
  let created = 0;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    // 获取embeddings
    const embeddings = await adapter.getEmbeddings(batch, options?.provider);

    // 准备插入数据
    const records = batch.map((chunk, index) => ({
      novel_id: novelId,
      chapter_id: chapterId,
      content: chunk,
      embedding: JSON.stringify(embeddings[index]),
      metadata: {
        chapter_number: chapterNumber,
        paragraph_index: i + index,
      },
    }));

    // 插入数据库
    const { error } = await supabase.from("novel_embeddings").insert(records);

    if (error) {
      console.error("Error inserting embeddings:", error);
      throw error;
    }

    created += batch.length;
  }

  return created;
}

/**
 * 为整本小说创建向量嵌入
 */
export async function createNovelEmbeddings(
  novelId: string,
  options?: EmbeddingOptions & {
    onProgress?: (progress: { current: number; total: number }) => void;
  }
): Promise<{ total: number; chapters: number }> {
  const supabase = createAdminClient();

  // 获取所有章节
  const { data: chapters, error } = await supabase
    .from("chapters")
    .select("id, content, chapter_number")
    .eq("novel_id", novelId)
    .order("chapter_number");

  if (error || !chapters) {
    throw new Error("Failed to fetch chapters");
  }

  let totalEmbeddings = 0;

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];

    // 先删除该章节已有的embeddings
    await supabase
      .from("novel_embeddings")
      .delete()
      .eq("chapter_id", chapter.id);

    // 创建新的embeddings
    const count = await createChapterEmbeddings(
      novelId,
      chapter.id,
      chapter.content,
      chapter.chapter_number,
      options
    );

    totalEmbeddings += count;

    if (options?.onProgress) {
      options.onProgress({ current: i + 1, total: chapters.length });
    }
  }

  return { total: totalEmbeddings, chapters: chapters.length };
}

/**
 * 删除小说的所有向量嵌入
 */
export async function deleteNovelEmbeddings(novelId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("novel_embeddings")
    .delete()
    .eq("novel_id", novelId);

  if (error) {
    throw error;
  }
}

/**
 * 获取小说的embedding统计信息
 */
export async function getEmbeddingStats(novelId: string): Promise<{
  totalChunks: number;
  embeddedChapters: number;
}> {
  const supabase = createAdminClient();

  const { count: totalChunks } = await supabase
    .from("novel_embeddings")
    .select("*", { count: "exact", head: true })
    .eq("novel_id", novelId);

  const { data: chapters } = await supabase
    .from("novel_embeddings")
    .select("chapter_id")
    .eq("novel_id", novelId);

  const uniqueChapters = new Set(chapters?.map((c) => c.chapter_id) || []);

  return {
    totalChunks: totalChunks || 0,
    embeddedChapters: uniqueChapters.size,
  };
}

