import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseNovelText, validateParsedNovel } from "@/lib/novel/parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const customTitle = formData.get("title") as string | null;
    const customAuthor = formData.get("author") as string | null;
    const customPattern = formData.get("chapterPattern") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const content = await file.text();

    if (!content || content.length < 100) {
      return NextResponse.json(
        { success: false, error: "File is empty or too short" },
        { status: 400 }
      );
    }

    // 解析小说
    const parsedNovel = parseNovelText(content, {
      customPattern: customPattern || undefined,
    });

    // 验证解析结果
    const validation = validateParsedNovel(parsedNovel);

    // 使用自定义标题和作者（如果提供）
    const finalTitle = customTitle || parsedNovel.title;
    const finalAuthor = customAuthor || parsedNovel.author;

    const supabase = createAdminClient();

    // 创建小说记录
    const { data: novel, error: novelError } = await supabase
      .from("novels")
      .insert({
        title: finalTitle,
        author: finalAuthor,
        word_count: parsedNovel.totalWordCount,
        chapter_count: parsedNovel.chapters.length,
      })
      .select()
      .single();

    if (novelError) {
      return NextResponse.json(
        { success: false, error: novelError.message },
        { status: 500 }
      );
    }

    // 批量插入章节
    const chaptersToInsert = parsedNovel.chapters.map((chapter) => ({
      novel_id: novel.id,
      chapter_number: chapter.chapterNumber,
      title: chapter.title,
      content: chapter.content,
      word_count: chapter.wordCount,
    }));

    const { error: chaptersError } = await supabase
      .from("chapters")
      .insert(chaptersToInsert);

    if (chaptersError) {
      // 回滚：删除创建的小说
      await supabase.from("novels").delete().eq("id", novel.id);
      return NextResponse.json(
        { success: false, error: chaptersError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        novel,
        chaptersCount: parsedNovel.chapters.length,
        totalWordCount: parsedNovel.totalWordCount,
        validation,
      },
    });
  } catch (error) {
    console.error("Error importing novel:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import novel" },
      { status: 500 }
    );
  }
}

