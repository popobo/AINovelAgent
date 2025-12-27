import { createOpenRouterClient } from '@/lib/openrouter/client';
import type { OpenRouterEmbeddingResponse } from '@/lib/openrouter/types';

const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-small';

/**
 * 为文本生成embedding向量
 */
export async function generateEmbedding(
  text: string,
  apiKey: string,
  model: string = DEFAULT_EMBEDDING_MODEL
): Promise<number[]> {
  const client = createOpenRouterClient(apiKey);

  try {
    const response: OpenRouterEmbeddingResponse = await client.createEmbedding({
      model,
      input: text,
    });

    if (response.data && response.data.length > 0) {
      return response.data[0].embedding;
    }

    throw new Error('Embedding响应中没有数据');
  } catch (error) {
    console.error('生成embedding错误:', error);
    throw new Error(`生成embedding失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 批量生成embedding（OpenRouter支持批量）
 */
export async function generateEmbeddings(
  texts: string[],
  apiKey: string,
  model: string = DEFAULT_EMBEDDING_MODEL
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const client = createOpenRouterClient(apiKey);

  try {
    const response: OpenRouterEmbeddingResponse = await client.createEmbedding({
      model,
      input: texts,
    });

    if (response.data) {
      return response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
    }

    throw new Error('Embedding响应中没有数据');
  } catch (error) {
    console.error('批量生成embedding错误:', error);
    throw new Error(`批量生成embedding失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 获取embedding模型的维度
 */
export function getEmbeddingDimension(model: string): number {
  // 根据模型返回维度
  if (model.includes('text-embedding-3-small')) {
    return 1536;
  }
  if (model.includes('text-embedding-3-large')) {
    return 3072;
  }
  if (model.includes('text-embedding-ada-002')) {
    return 1536;
  }
  // 默认维度
  return 1536;
}

