import { NextResponse } from "next/server";

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    request?: string;
    image?: string;
  };
  architecture?: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer?: string;
    instruct_type?: string;
  };
  top_provider?: {
    is_moderated: boolean;
    context_length: number;
    max_completion_tokens?: number;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

// 缓存模型列表，避免频繁请求
let cachedModels: OpenRouterModel[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export async function GET() {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    // 检查缓存是否有效
    if (cachedModels && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cachedModels,
        cached: true,
      });
    }

    // 如果没有 API Key，返回默认的热门模型列表
    if (!apiKey) {
      const defaultModels = getDefaultModels();
      return NextResponse.json({
        success: true,
        data: defaultModels,
        cached: false,
        message: "使用默认模型列表（未配置 OPENROUTER_API_KEY）",
      });
    }

    // 从 OpenRouter API 获取模型列表
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const result: OpenRouterModelsResponse = await response.json();
    
    // 过滤出支持文本生成的模型，并按名称排序
    const textModels = result.data
      .filter((model) => {
        const outputModalities = model.architecture?.output_modalities || [];
        return outputModalities.includes("text");
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // 更新缓存
    cachedModels = textModels;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      success: true,
      data: textModels,
      cached: false,
      total: textModels.length,
    });
  } catch (error) {
    console.error("Failed to fetch OpenRouter models:", error);
    
    // 出错时返回默认模型列表
    const defaultModels = getDefaultModels();
    return NextResponse.json({
      success: true,
      data: defaultModels,
      cached: false,
      fallback: true,
      error: error instanceof Error ? error.message : "未知错误",
    });
  }
}

// 默认的热门模型列表（当 API 不可用时使用）
function getDefaultModels(): OpenRouterModel[] {
  return [
    // Anthropic
    {
      id: "anthropic/claude-sonnet-4",
      name: "Claude Sonnet 4",
      description: "Anthropic 最新的 Claude 4 Sonnet 模型",
      context_length: 200000,
      pricing: { prompt: "0.000003", completion: "0.000015" },
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      description: "Anthropic 的高性能模型，平衡速度与能力",
      context_length: 200000,
      pricing: { prompt: "0.000003", completion: "0.000015" },
    },
    {
      id: "anthropic/claude-3-opus",
      name: "Claude 3 Opus",
      description: "Anthropic 最强大的模型",
      context_length: 200000,
      pricing: { prompt: "0.000015", completion: "0.000075" },
    },
    {
      id: "anthropic/claude-3-haiku",
      name: "Claude 3 Haiku",
      description: "Anthropic 的快速轻量模型",
      context_length: 200000,
      pricing: { prompt: "0.00000025", completion: "0.00000125" },
    },
    // OpenAI
    {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      description: "OpenAI 最新的多模态模型",
      context_length: 128000,
      pricing: { prompt: "0.0000025", completion: "0.00001" },
    },
    {
      id: "openai/gpt-4-turbo",
      name: "GPT-4 Turbo",
      description: "OpenAI GPT-4 的高速版本",
      context_length: 128000,
      pricing: { prompt: "0.00001", completion: "0.00003" },
    },
    {
      id: "openai/gpt-4o-mini",
      name: "GPT-4o Mini",
      description: "OpenAI 的轻量高效模型",
      context_length: 128000,
      pricing: { prompt: "0.00000015", completion: "0.0000006" },
    },
    // Google
    {
      id: "google/gemini-pro-1.5",
      name: "Gemini Pro 1.5",
      description: "Google 的高性能模型，支持超长上下文",
      context_length: 1000000,
      pricing: { prompt: "0.00000125", completion: "0.000005" },
    },
    {
      id: "google/gemini-flash-1.5",
      name: "Gemini Flash 1.5",
      description: "Google 的快速模型",
      context_length: 1000000,
      pricing: { prompt: "0.000000075", completion: "0.0000003" },
    },
    // Meta Llama
    {
      id: "meta-llama/llama-3.1-405b-instruct",
      name: "Llama 3.1 405B",
      description: "Meta 最强大的开源模型",
      context_length: 131072,
      pricing: { prompt: "0.0000027", completion: "0.0000027" },
    },
    {
      id: "meta-llama/llama-3.1-70b-instruct",
      name: "Llama 3.1 70B",
      description: "Meta 的高性能开源模型",
      context_length: 131072,
      pricing: { prompt: "0.00000052", completion: "0.00000075" },
    },
    // DeepSeek
    {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek Chat",
      description: "DeepSeek 的对话模型",
      context_length: 65536,
      pricing: { prompt: "0.00000014", completion: "0.00000028" },
    },
    {
      id: "deepseek/deepseek-r1",
      name: "DeepSeek R1",
      description: "DeepSeek 的推理增强模型",
      context_length: 65536,
      pricing: { prompt: "0.00000055", completion: "0.00000219" },
    },
    // Mistral
    {
      id: "mistralai/mistral-large",
      name: "Mistral Large",
      description: "Mistral 的旗舰模型",
      context_length: 128000,
      pricing: { prompt: "0.000002", completion: "0.000006" },
    },
    {
      id: "mistralai/mixtral-8x22b-instruct",
      name: "Mixtral 8x22B",
      description: "Mistral 的 MoE 架构模型",
      context_length: 65536,
      pricing: { prompt: "0.00000065", completion: "0.00000065" },
    },
    // Qwen
    {
      id: "qwen/qwen-2.5-72b-instruct",
      name: "Qwen 2.5 72B",
      description: "阿里通义千问 2.5 版本",
      context_length: 131072,
      pricing: { prompt: "0.00000035", completion: "0.0000004" },
    },
  ];
}

