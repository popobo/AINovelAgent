import OpenAI from "openai";
import type { AIGenerateOptions, AIMessage, AIStreamChunk } from "@/types";

export class OpenRouterProvider {
  private client: OpenAI;
  private model: string;
  private embeddingModel: string;
  // OpenRouter 使用单独的 embedding 客户端（如 OpenAI）因为 OpenRouter 主要用于聊天模型
  private embeddingClient: OpenAI | null;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "墨韵 AI",
      },
    });
    // 默认使用 Claude 3.5 Sonnet，可通过环境变量覆盖
    this.model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
    this.embeddingModel = "text-embedding-3-small";
    
    // 如果配置了 OpenAI API Key，使用 OpenAI 进行 embedding
    // 否则 embedding 功能将不可用
    if (process.env.OPENAI_API_KEY) {
      this.embeddingClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      });
    } else {
      this.embeddingClient = null;
    }
  }

  get name(): string {
    return "openrouter";
  }

  async generateText(
    messages: AIMessage[],
    options?: AIGenerateOptions
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.7,
      stop: options?.stopSequences,
    });

    return response.choices[0]?.message?.content || "";
  }

  async *generateStream(
    messages: AIMessage[],
    options?: AIGenerateOptions
  ): AsyncGenerator<AIStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.7,
      stop: options?.stopSequences,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      const done = chunk.choices[0]?.finish_reason !== null;
      yield { text, done };
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingClient) {
      throw new Error(
        "Embedding 功能需要配置 OPENAI_API_KEY。OpenRouter 主要用于聊天模型，embedding 需要使用 OpenAI。"
      );
    }
    
    const response = await this.embeddingClient.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });

    return response.data[0].embedding;
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.embeddingClient) {
      throw new Error(
        "Embedding 功能需要配置 OPENAI_API_KEY。OpenRouter 主要用于聊天模型，embedding 需要使用 OpenAI。"
      );
    }
    
    const response = await this.embeddingClient.embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });

    return response.data.map((d) => d.embedding);
  }
}

