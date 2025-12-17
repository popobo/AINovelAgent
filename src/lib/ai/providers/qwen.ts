import OpenAI from "openai";
import type { AIGenerateOptions, AIMessage, AIStreamChunk } from "@/types";

export class QwenProvider {
  private client: OpenAI;
  private model: string;
  private embeddingModel: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.QWEN_API_KEY,
      baseURL:
        process.env.QWEN_BASE_URL ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
    this.model = "qwen-plus";
    this.embeddingModel = "text-embedding-v3";
  }

  get name(): string {
    return "qwen";
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
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text,
      dimensions: 1536, // 与 OpenAI 保持一致
    });

    return response.data[0].embedding;
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: texts,
      dimensions: 1536,
    });

    return response.data.map((d) => d.embedding);
  }
}

