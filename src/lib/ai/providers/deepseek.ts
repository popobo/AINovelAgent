import OpenAI from "openai";
import type { AIGenerateOptions, AIMessage, AIStreamChunk } from "@/types";
import { OpenAIProvider } from "./openai";

export class DeepSeekProvider {
  private client: OpenAI;
  private model: string;
  private openaiForEmbedding: OpenAIProvider;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    });
    this.model = "deepseek-chat";
    // DeepSeek 没有自己的 embedding 模型，使用 OpenAI 的
    this.openaiForEmbedding = new OpenAIProvider();
  }

  get name(): string {
    return "deepseek";
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
    return this.openaiForEmbedding.getEmbedding(text);
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    return this.openaiForEmbedding.getEmbeddings(texts);
  }
}

