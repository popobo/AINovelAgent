import Anthropic from "@anthropic-ai/sdk";
import type { AIGenerateOptions, AIMessage, AIStreamChunk } from "@/types";
import { OpenAIProvider } from "./openai";

export class ClaudeProvider {
  private client: Anthropic;
  private model: string;
  private openaiForEmbedding: OpenAIProvider;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = "claude-sonnet-4-20250514";
    // Claude 没有自己的 embedding 模型，使用 OpenAI 的
    this.openaiForEmbedding = new OpenAIProvider();
  }

  get name(): string {
    return "claude";
  }

  async generateText(
    messages: AIMessage[],
    options?: AIGenerateOptions
  ): Promise<string> {
    const systemMessage = messages.find((m) => m.role === "system");
    const otherMessages = messages.filter((m) => m.role !== "system");

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens || 4096,
      system: systemMessage?.content || options?.systemPrompt,
      messages: otherMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      stop_sequences: options?.stopSequences,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.type === "text" ? textBlock.text : "";
  }

  async *generateStream(
    messages: AIMessage[],
    options?: AIGenerateOptions
  ): AsyncGenerator<AIStreamChunk> {
    const systemMessage = messages.find((m) => m.role === "system");
    const otherMessages = messages.filter((m) => m.role !== "system");

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens || 4096,
      system: systemMessage?.content || options?.systemPrompt,
      messages: otherMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      stop_sequences: options?.stopSequences,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { text: event.delta.text, done: false };
      } else if (event.type === "message_stop") {
        yield { text: "", done: true };
      }
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    // 使用 OpenAI 的 embedding 服务
    return this.openaiForEmbedding.getEmbedding(text);
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    return this.openaiForEmbedding.getEmbeddings(texts);
  }
}

