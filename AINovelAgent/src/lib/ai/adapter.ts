import type { AIGenerateOptions, AIMessage, AIProviderType, AIStreamChunk } from "@/types";
import { OpenAIProvider } from "./providers/openai";
import { ClaudeProvider } from "./providers/claude";
import { DeepSeekProvider } from "./providers/deepseek";
import { QwenProvider } from "./providers/qwen";
import { OpenRouterProvider } from "./providers/openrouter";

export interface AIProvider {
  name: string;
  generateText(messages: AIMessage[], options?: AIGenerateOptions): Promise<string>;
  generateStream(messages: AIMessage[], options?: AIGenerateOptions): AsyncGenerator<AIStreamChunk>;
  getEmbedding(text: string): Promise<number[]>;
  getEmbeddings(texts: string[]): Promise<number[][]>;
}

class AIAdapter {
  private providers: Map<AIProviderType, AIProvider>;
  private currentProvider: AIProviderType;

  constructor() {
    this.providers = new Map();
    this.currentProvider =
      (process.env.DEFAULT_AI_PROVIDER as AIProviderType) || "openai";
  }

  private getProvider(type: AIProviderType): AIProvider {
    if (!this.providers.has(type)) {
      switch (type) {
        case "openai":
          this.providers.set(type, new OpenAIProvider());
          break;
        case "claude":
          this.providers.set(type, new ClaudeProvider());
          break;
        case "deepseek":
          this.providers.set(type, new DeepSeekProvider());
          break;
        case "qwen":
          this.providers.set(type, new QwenProvider());
          break;
        case "openrouter":
          this.providers.set(type, new OpenRouterProvider());
          break;
        default:
          throw new Error(`Unknown AI provider: ${type}`);
      }
    }
    return this.providers.get(type)!;
  }

  setProvider(type: AIProviderType): void {
    this.currentProvider = type;
  }

  getCurrentProvider(): AIProviderType {
    return this.currentProvider;
  }

  async generateText(
    messages: AIMessage[],
    options?: AIGenerateOptions & { provider?: AIProviderType }
  ): Promise<string> {
    const provider = this.getProvider(options?.provider || this.currentProvider);
    return provider.generateText(messages, options);
  }

  async *generateStream(
    messages: AIMessage[],
    options?: AIGenerateOptions & { provider?: AIProviderType }
  ): AsyncGenerator<AIStreamChunk> {
    const provider = this.getProvider(options?.provider || this.currentProvider);
    yield* provider.generateStream(messages, options);
  }

  async getEmbedding(
    text: string,
    provider?: AIProviderType
  ): Promise<number[]> {
    const p = this.getProvider(provider || this.currentProvider);
    return p.getEmbedding(text);
  }

  async getEmbeddings(
    texts: string[],
    provider?: AIProviderType
  ): Promise<number[][]> {
    const p = this.getProvider(provider || this.currentProvider);
    return p.getEmbeddings(texts);
  }
}

// 单例模式
let instance: AIAdapter | null = null;

export function getAIAdapter(): AIAdapter {
  if (!instance) {
    instance = new AIAdapter();
  }
  return instance;
}

export type { AIAdapter };

