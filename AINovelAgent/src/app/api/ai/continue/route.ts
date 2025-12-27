import { NextRequest } from "next/server";
import { getAIAdapter } from "@/lib/ai/adapter";
import { ContextManager } from "@/lib/context/manager";
import { PROMPTS } from "@/lib/ai/prompts";
import type { AIProviderType, AIMessage } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      novelId,
      chapterNumber,
      userPrompt,
      wordCount = 1000,
      provider,
    } = body as {
      novelId: string;
      chapterNumber: number;
      userPrompt?: string;
      wordCount?: number;
      provider?: AIProviderType;
    };

    if (!novelId || !chapterNumber) {
      return new Response(
        JSON.stringify({ error: "novelId and chapterNumber are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 构建上下文
    const contextManager = new ContextManager(novelId, { provider });
    const context = await contextManager.buildContext(chapterNumber, userPrompt);
    const formattedContext = contextManager.formatContextForPrompt(context);

    // 构建消息
    const messages: AIMessage[] = [
      {
        role: "system",
        content: PROMPTS.NOVEL_CONTINUE_SYSTEM,
      },
      {
        role: "user",
        content: `${formattedContext}\n\n---\n\n${
          userPrompt
            ? `用户要求：${userPrompt}\n\n`
            : ""
        }请根据以上信息，自然地续写下去。续写内容约${wordCount}字，保持原作风格，情节自然衔接。`,
      },
    ];

    // 创建流式响应
    const adapter = getAIAdapter();
    const stream = adapter.generateStream(messages, {
      provider,
      maxTokens: Math.ceil(wordCount * 2),
      temperature: 0.8,
    });

    // 使用TransformStream创建响应流
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const data = JSON.stringify({ text: chunk.text, done: chunk.done });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            if (chunk.done) {
              break;
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in continue API:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

