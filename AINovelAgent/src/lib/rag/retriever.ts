import { getAIAdapter } from "@/lib/ai/adapter";
import { createAdminClient } from "@/lib/supabase/server";
import type { AIProviderType, SearchResult } from "@/types";

export interface RetrieveOptions {
  provider?: AIProviderType;
  threshold?: number;
  limit?: number;
}

/**
 * 基于语义相似度检索相关段落
 */
export async function retrieveRelevantParagraphs(
  novelId: string,
  query: string,
  options?: RetrieveOptions
): Promise<SearchResult[]> {
  const adapter = getAIAdapter();
  const supabase = createAdminClient();

  const threshold = options?.threshold || 0.7;
  const limit = options?.limit || 10;

  // 获取查询文本的embedding
  const queryEmbedding = await adapter.getEmbedding(query, options?.provider);

  // 使用Supabase的向量搜索函数
  const { data, error } = await supabase.rpc("match_novel_embeddings", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_novel_id: novelId,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    console.error("Error searching embeddings:", error);
    throw error;
  }

  return (data || []).map((item: { content: string; similarity: number; metadata: Record<string, unknown> }) => ({
    content: item.content,
    similarity: item.similarity,
    metadata: item.metadata,
  }));
}

/**
 * 基于多个查询检索相关段落（去重）
 */
export async function retrieveByMultipleQueries(
  novelId: string,
  queries: string[],
  options?: RetrieveOptions
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const seenContent = new Set<string>();

  for (const query of queries) {
    const results = await retrieveRelevantParagraphs(novelId, query, options);

    for (const result of results) {
      // 简单去重：基于内容前100个字符
      const key = result.content.slice(0, 100);
      if (!seenContent.has(key)) {
        seenContent.add(key);
        allResults.push(result);
      }
    }
  }

  // 按相似度排序并限制数量
  return allResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, options?.limit || 15);
}

/**
 * 检索与特定人物相关的段落
 */
export async function retrieveCharacterParagraphs(
  novelId: string,
  characterName: string,
  options?: RetrieveOptions
): Promise<SearchResult[]> {
  const queries = [
    `${characterName}的性格特点`,
    `${characterName}的外貌描写`,
    `${characterName}说话`,
    `${characterName}行动`,
  ];

  return retrieveByMultipleQueries(novelId, queries, {
    ...options,
    limit: options?.limit || 5,
  });
}

/**
 * 检索与特定场景/情节相关的段落
 */
export async function retrieveSceneParagraphs(
  novelId: string,
  sceneDescription: string,
  options?: RetrieveOptions
): Promise<SearchResult[]> {
  return retrieveRelevantParagraphs(novelId, sceneDescription, options);
}

