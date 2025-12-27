import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenRouterClient, createOpenRouterClient } from '@/lib/openrouter/client';
import type { OpenRouterChatCompletionRequest, OpenRouterEmbeddingRequest } from '@/lib/openrouter/types';

// Mock fetch
global.fetch = vi.fn();

describe('OpenRouterClient', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create client with API key', () => {
    const client = createOpenRouterClient(mockApiKey);
    expect(client).toBeInstanceOf(OpenRouterClient);
  });

  it('should throw error if API key is missing', () => {
    expect(() => {
      new OpenRouterClient('');
    }).toThrow('OpenRouter API key is required');
  });

  describe('getModels', () => {
    it('should fetch models successfully', async () => {
      const mockModels = {
        data: [
          {
            id: 'openai/gpt-4',
            name: 'GPT-4',
            context_length: 8192,
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels,
      });

      const client = createOpenRouterClient(mockApiKey);
      const models = await client.getModels();

      expect(models).toEqual(mockModels.data);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiKey}`,
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
      });

      const client = createOpenRouterClient(mockApiKey);
      await expect(client.getModels()).rejects.toThrow();
    });
  });

  describe('chatCompletion', () => {
    it('should make chat completion request', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'openai/gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'Hello!',
            },
            finish_reason: 'stop',
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = createOpenRouterClient(mockApiKey);
      const request: OpenRouterChatCompletionRequest = {
        model: 'openai/gpt-4',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
      };

      const result = await client.chatCompletion(request);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiKey}`,
          }),
          body: JSON.stringify({
            ...request,
            stream: false,
          }),
        })
      );
    });
  });

  describe('createEmbedding', () => {
    it('should create embedding', async () => {
      const mockResponse = {
        data: [
          {
            embedding: [0.1, 0.2, 0.3],
            index: 0,
          },
        ],
        model: 'text-embedding-ada-002',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = createOpenRouterClient(mockApiKey);
      const request: OpenRouterEmbeddingRequest = {
        model: 'text-embedding-ada-002',
        input: 'Hello world',
      };

      const result = await client.createEmbedding(request);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiKey}`,
          }),
          body: JSON.stringify(request),
        })
      );
    });
  });
});

