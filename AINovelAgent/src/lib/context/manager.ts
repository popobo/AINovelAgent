import { createAdminClient } from "@/lib/supabase/server";
import { retrieveRelevantParagraphs } from "@/lib/rag/retriever";
import type { NovelContext, AIProviderType } from "@/types";

export interface ContextBuilderOptions {
  maxContextTokens?: number;
  recentChaptersCount?: number;
  relevantParagraphsCount?: number;
  provider?: AIProviderType;
}

// 粗略估算中文token数（1个汉字约等于1.5-2个token）
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 1.5 + otherChars * 0.3);
}

/**
 * 上下文管理器：为AI续写构建最优上下文
 */
export class ContextManager {
  private novelId: string;
  private options: ContextBuilderOptions;

  constructor(novelId: string, options?: ContextBuilderOptions) {
    this.novelId = novelId;
    this.options = {
      maxContextTokens: options?.maxContextTokens || 16000,
      recentChaptersCount: options?.recentChaptersCount || 3,
      relevantParagraphsCount: options?.relevantParagraphsCount || 10,
      provider: options?.provider,
    };
  }

  /**
   * 构建续写上下文
   */
  async buildContext(
    currentChapterNumber: number,
    userPrompt?: string
  ): Promise<NovelContext> {
    const supabase = createAdminClient();

    // 1. 获取小说基本信息和摘要
    const { data: novel } = await supabase
      .from("novels")
      .select("summary, settings, style_guide")
      .eq("id", this.novelId)
      .single();

    // 2. 获取章节摘要链
    const { data: chapterSummaries } = await supabase
      .from("chapters")
      .select("chapter_number, title, summary")
      .eq("novel_id", this.novelId)
      .lte("chapter_number", currentChapterNumber)
      .order("chapter_number", { ascending: false })
      .limit(20); // 最近20章的摘要

    // 3. 获取人物信息
    const { data: characters } = await supabase
      .from("characters")
      .select("*")
      .eq("novel_id", this.novelId);

    // 4. 获取最近N章原文
    const { data: recentChapters } = await supabase
      .from("chapters")
      .select("*")
      .eq("novel_id", this.novelId)
      .lte("chapter_number", currentChapterNumber)
      .order("chapter_number", { ascending: false })
      .limit(this.options.recentChaptersCount);

    // 5. RAG检索相关段落
    let relevantParagraphs: { content: string; chapter_number: number; similarity_score: number }[] = [];
    if (userPrompt) {
      const searchResults = await retrieveRelevantParagraphs(
        this.novelId,
        userPrompt,
        {
          limit: this.options.relevantParagraphsCount,
          provider: this.options.provider,
        }
      );
      relevantParagraphs = searchResults.map((r) => ({
        content: r.content,
        chapter_number: (r.metadata?.chapter_number as number) || 0,
        similarity_score: r.similarity,
      }));
    }

    // 构建上下文对象
    const context: NovelContext = {
      novelSummary: novel?.summary || "",
      chapterSummaries: (chapterSummaries || [])
        .reverse()
        .map((c) => ({
          chapter_number: c.chapter_number,
          title: c.title || undefined,
          summary: c.summary || "",
        })),
      characters: characters || [],
      relevantParagraphs,
      recentChapters: (recentChapters || []).reverse(),
      worldSettings: novel?.settings,
      styleGuide: novel?.style_guide || undefined,
    };

    // 根据token限制调整上下文
    return this.trimContext(context);
  }

  /**
   * 根据token限制裁剪上下文
   */
  private trimContext(context: NovelContext): NovelContext {
    const maxTokens = this.options.maxContextTokens!;
    let currentTokens = 0;

    // 预留空间分配（按优先级）
    const allocation = {
      novelSummary: Math.floor(maxTokens * 0.1), // 10%
      styleGuide: Math.floor(maxTokens * 0.05), // 5%
      characters: Math.floor(maxTokens * 0.1), // 10%
      chapterSummaries: Math.floor(maxTokens * 0.15), // 15%
      relevantParagraphs: Math.floor(maxTokens * 0.25), // 25%
      recentChapters: Math.floor(maxTokens * 0.35), // 35%
    };

    const trimmedContext: NovelContext = {
      novelSummary: "",
      chapterSummaries: [],
      characters: [],
      relevantParagraphs: [],
      recentChapters: [],
      worldSettings: context.worldSettings,
      styleGuide: undefined,
    };

    // 1. 全书摘要（最高优先级）
    if (context.novelSummary) {
      const tokens = estimateTokens(context.novelSummary);
      if (tokens <= allocation.novelSummary) {
        trimmedContext.novelSummary = context.novelSummary;
        currentTokens += tokens;
      } else {
        trimmedContext.novelSummary = context.novelSummary.slice(
          0,
          allocation.novelSummary * 2
        );
        currentTokens += allocation.novelSummary;
      }
    }

    // 2. 写作风格指南
    if (context.styleGuide) {
      const tokens = estimateTokens(context.styleGuide);
      if (currentTokens + tokens <= maxTokens) {
        trimmedContext.styleGuide = context.styleGuide;
        currentTokens += tokens;
      }
    }

    // 3. 人物信息（选择最重要的几个）
    const characterText = context.characters
      .slice(0, 5)
      .map((c) => `${c.name}: ${c.personality || ""} ${c.description || ""}`)
      .join("\n");
    const charTokens = estimateTokens(characterText);
    if (charTokens <= allocation.characters) {
      trimmedContext.characters = context.characters.slice(0, 5);
      currentTokens += charTokens;
    }

    // 4. 章节摘要（从近到远）
    let summaryTokens = 0;
    for (const summary of context.chapterSummaries) {
      const tokens = estimateTokens(summary.summary);
      if (summaryTokens + tokens <= allocation.chapterSummaries) {
        trimmedContext.chapterSummaries.push(summary);
        summaryTokens += tokens;
      } else {
        break;
      }
    }
    currentTokens += summaryTokens;

    // 5. RAG检索的相关段落
    let ragTokens = 0;
    for (const para of context.relevantParagraphs) {
      const tokens = estimateTokens(para.content);
      if (ragTokens + tokens <= allocation.relevantParagraphs) {
        trimmedContext.relevantParagraphs.push(para);
        ragTokens += tokens;
      } else {
        break;
      }
    }
    currentTokens += ragTokens;

    // 6. 最近章节原文（剩余空间全部给它）
    const remainingTokens = maxTokens - currentTokens;
    let chapterTokens = 0;
    for (const chapter of context.recentChapters) {
      const tokens = estimateTokens(chapter.content);
      if (chapterTokens + tokens <= remainingTokens) {
        trimmedContext.recentChapters.push(chapter);
        chapterTokens += tokens;
      } else {
        // 如果章节太长，截取后半部分
        const availableChars = (remainingTokens - chapterTokens) * 2;
        if (availableChars > 500) {
          trimmedContext.recentChapters.push({
            ...chapter,
            content: "..." + chapter.content.slice(-availableChars),
          });
        }
        break;
      }
    }

    return trimmedContext;
  }

  /**
   * 格式化上下文为提示词
   */
  formatContextForPrompt(context: NovelContext): string {
    const parts: string[] = [];

    // 全书摘要
    if (context.novelSummary) {
      parts.push(`## 故事概要\n${context.novelSummary}`);
    }

    // 写作风格
    if (context.styleGuide) {
      parts.push(`## 写作风格\n${context.styleGuide}`);
    }

    // 人物信息
    if (context.characters.length > 0) {
      const charInfo = context.characters
        .map((c) => {
          const info = [`【${c.name}】`];
          if (c.personality) info.push(`性格：${c.personality}`);
          if (c.description) info.push(`描述：${c.description}`);
          return info.join(" ");
        })
        .join("\n");
      parts.push(`## 主要人物\n${charInfo}`);
    }

    // 章节摘要
    if (context.chapterSummaries.length > 0) {
      const summaries = context.chapterSummaries
        .map(
          (s) =>
            `第${s.chapter_number}章${s.title ? ` ${s.title}` : ""}：${s.summary}`
        )
        .join("\n");
      parts.push(`## 前情摘要\n${summaries}`);
    }

    // 相关情节
    if (context.relevantParagraphs.length > 0) {
      const relevant = context.relevantParagraphs
        .map((p) => `[第${p.chapter_number}章] ${p.content}`)
        .join("\n\n");
      parts.push(`## 相关情节\n${relevant}`);
    }

    // 最近章节原文
    if (context.recentChapters.length > 0) {
      const recent = context.recentChapters
        .map(
          (c) =>
            `### 第${c.chapter_number}章${c.title ? ` ${c.title}` : ""}\n${c.content}`
        )
        .join("\n\n");
      parts.push(`## 最近内容\n${recent}`);
    }

    return parts.join("\n\n---\n\n");
  }
}

