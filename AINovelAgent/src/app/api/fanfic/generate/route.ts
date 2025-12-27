import { NextRequest } from "next/server";
import { getAIAdapter } from "@/lib/ai/adapter";
import { createAdminClient } from "@/lib/supabase/server";
import { PROMPTS, fillPromptTemplate } from "@/lib/ai/prompts";
import type { AIProviderType, AIMessage, FanficCharacter } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceId,
      customSource,
      selectedCharacters,
      userRequest,
      wordCount = 1000,
      provider,
    } = body as {
      sourceId?: string;
      customSource?: {
        name: string;
        type: string;
        world_setting: string;
        characters: FanficCharacter[];
      };
      selectedCharacters?: string[];
      userRequest: string;
      wordCount?: number;
      provider?: AIProviderType;
    };

    if (!userRequest) {
      return new Response(
        JSON.stringify({ error: "userRequest is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let sourceName = "";
    let sourceType = "";
    let worldSetting = "";
    let characters: FanficCharacter[] = [];

    // 从数据库获取原作设定
    if (sourceId) {
      const supabase = createAdminClient();
      const { data: source, error } = await supabase
        .from("fanfic_sources")
        .select("*")
        .eq("id", sourceId)
        .single();

      if (error || !source) {
        return new Response(
          JSON.stringify({ error: "Source not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      sourceName = source.name;
      sourceType = source.type;
      worldSetting = source.world_setting || "";
      characters = source.characters || [];
    } else if (customSource) {
      sourceName = customSource.name;
      sourceType = customSource.type;
      worldSetting = customSource.world_setting;
      characters = customSource.characters;
    }

    // 如果指定了特定角色，只使用这些角色
    if (selectedCharacters && selectedCharacters.length > 0) {
      characters = characters.filter((c) =>
        selectedCharacters.includes(c.name)
      );
    }

    // 格式化角色信息
    const charactersText = characters
      .map((c) => {
        const parts = [`【${c.name}】`];
        if (c.description) parts.push(`简介：${c.description}`);
        if (c.personality) parts.push(`性格：${c.personality}`);
        if (c.catchphrases && c.catchphrases.length > 0) {
          parts.push(`口头禅：${c.catchphrases.join("、")}`);
        }
        return parts.join("\n");
      })
      .join("\n\n");

    // 构建提示词
    const prompt = fillPromptTemplate(PROMPTS.FANFIC_PROMPT, {
      sourceName,
      sourceType,
      worldSetting,
      characters: charactersText,
      userRequest: `${userRequest}\n\n要求：续写约${wordCount}字`,
    });

    const messages: AIMessage[] = [
      {
        role: "system",
        content: PROMPTS.FANFIC_SYSTEM,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    // 创建流式响应
    const adapter = getAIAdapter();
    const stream = adapter.generateStream(messages, {
      provider,
      maxTokens: Math.ceil(wordCount * 2),
      temperature: 0.85,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const data = JSON.stringify({ text: chunk.text, done: chunk.done });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            if (chunk.done) break;
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
    console.error("Error in fanfic generate API:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

