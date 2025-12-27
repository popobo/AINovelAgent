import { continueWithSummaryStrategy } from './summary-strategy';
import { continueWithRAGStrategy } from './rag-strategy';
import { continueWithHybridStrategy } from './hybrid-strategy';
import type { ContinuationStrategy } from '@prisma/client';

export interface ContinuationOptions {
  novelId: string;
  userPrompt: string;
  apiKey: string;
  model?: string;
  strategy: ContinuationStrategy;
  // 摘要方案参数
  recentCount?: number;
  // RAG方案参数
  similarityThreshold?: number;
  maxRAGChapters?: number;
}

/**
 * 统一的续写入口
 */
export async function continueNovel(options: ContinuationOptions): Promise<string> {
  const { strategy, novelId, userPrompt, apiKey, model } = options;

  switch (strategy) {
    case 'SUMMARY':
      return continueWithSummaryStrategy(
        novelId,
        userPrompt,
        apiKey,
        model,
        options.recentCount
      );

    case 'RAG':
      return continueWithRAGStrategy(
        novelId,
        userPrompt,
        apiKey,
        model,
        options.similarityThreshold,
        options.maxRAGChapters
      );

    case 'HYBRID':
      return continueWithHybridStrategy(
        novelId,
        userPrompt,
        apiKey,
        model,
        options.similarityThreshold,
        options.maxRAGChapters,
        options.recentCount
      );

    default:
      throw new Error(`不支持的续写策略: ${strategy}`);
  }
}

export { continueWithSummaryStrategy, continueWithRAGStrategy, continueWithHybridStrategy };

