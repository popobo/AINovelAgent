import { NextRequest, NextResponse } from "next/server";
import { getAIAdapter } from "@/lib/ai/adapter";
import { createAdminClient } from "@/lib/supabase/server";
import { PROMPTS } from "@/lib/ai/prompts";
import type { AIProviderType, AIMessage } from "@/types";

// 生成章节摘要
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, content, provider } = body as {
      chapterId?: string;
      content?: string;
      provider?: AIProviderType;
    };

    let textToSummarize = content;

    // 如果提供了chapterId，从数据库获取内容
    if (chapterId && !content) {
      const supabase = createAdminClient();
      const { data: chapter, error } = await supabase
        .from("chapters")
        .select("content")
        .eq("id", chapterId)
        .single();

      if (error || !chapter) {
        return NextResponse.json(
          { success: false, error: "Chapter not found" },
          { status: 404 }
        );
      }
      textToSummarize = chapter.content;
    }

    if (!textToSummarize) {
      return NextResponse.json(
        { success: false, error: "No content to summarize" },
        { status: 400 }
      );
    }

    const adapter = getAIAdapter();
    const messages: AIMessage[] = [
      {
        role: "system",
        content: PROMPTS.CHAPTER_SUMMARY,
      },
      {
        role: "user",
        content: textToSummarize,
      },
    ];

    const summary = await adapter.generateText(messages, {
      provider,
      maxTokens: 500,
      temperature: 0.3,
    });

    // 如果提供了chapterId，更新数据库
    if (chapterId) {
      const supabase = createAdminClient();
      await supabase
        .from("chapters")
        .update({ summary })
        .eq("id", chapterId);
    }

    return NextResponse.json({ success: true, data: { summary } });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

