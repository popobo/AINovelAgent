import type {
  OpenRouterModelsResponse,
  OpenRouterModel,
  OpenRouterChatCompletionRequest,
  OpenRouterChatCompletionResponse,
  OpenRouterEmbeddingRequest,
  OpenRouterEmbeddingResponse,
} from './types';
import { OpenRouterError } from './types';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

export class OpenRouterClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * 获取所有可用的模型列表
   */
  async getModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new OpenRouterError(
          `Failed to fetch models: ${response.status} ${response.statusText}`,
          response.status,
          errorData
        );
      }

      const data: OpenRouterModelsResponse = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(`Error fetching models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 调用大模型进行文本生成（Chat Completion）
   */
  async chatCompletion(
    request: OpenRouterChatCompletionRequest
  ): Promise<OpenRouterChatCompletionResponse> {
    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'AI Novel Continuation System',
        },
        body: JSON.stringify({
          ...request,
          stream: false, // 强制关闭流式传输，简化处理
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new OpenRouterError(
          `Chat completion failed: ${response.status} ${response.statusText}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(`Error in chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 调用embedding模型生成向量
   */
  async createEmbedding(
    request: OpenRouterEmbeddingRequest
  ): Promise<OpenRouterEmbeddingResponse> {
    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new OpenRouterError(
          `Embedding creation failed: ${response.status} ${response.statusText}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(`Error creating embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * 创建OpenRouter客户端实例
 */
export function createOpenRouterClient(apiKey: string): OpenRouterClient {
  return new OpenRouterClient(apiKey);
}

