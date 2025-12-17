import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// 获取小说的所有章节
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: "novelId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("chapters")
      .select("*")
      .eq("novel_id", novelId)
      .order("chapter_number", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}

// 创建新章节
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { novel_id, chapter_number, title, content, summary, word_count } =
      body;

    if (!novel_id || !content) {
      return NextResponse.json(
        { success: false, error: "novel_id and content are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 如果没有指定章节号，自动获取下一个章节号
    let finalChapterNumber = chapter_number;
    if (!finalChapterNumber) {
      const { data: lastChapter } = await supabase
        .from("chapters")
        .select("chapter_number")
        .eq("novel_id", novel_id)
        .order("chapter_number", { ascending: false })
        .limit(1)
        .single();

      finalChapterNumber = (lastChapter?.chapter_number || 0) + 1;
    }

    const { data, error } = await supabase
      .from("chapters")
      .insert({
        novel_id,
        chapter_number: finalChapterNumber,
        title,
        content,
        summary,
        word_count: word_count || content.replace(/\s/g, "").length,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 更新小说的章节数和字数
    await supabase.rpc("update_novel_stats", { novel_uuid: novel_id });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error creating chapter:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create chapter" },
      { status: 500 }
    );
  }
}

// 批量创建章节
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { novel_id, chapters } = body;

    if (!novel_id || !chapters || !Array.isArray(chapters)) {
      return NextResponse.json(
        { success: false, error: "novel_id and chapters array are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 准备批量插入的数据
    const chaptersToInsert = chapters.map((chapter, index) => ({
      novel_id,
      chapter_number: chapter.chapterNumber || index + 1,
      title: chapter.title,
      content: chapter.content,
      word_count: chapter.wordCount || chapter.content.replace(/\s/g, "").length,
    }));

    const { data, error } = await supabase
      .from("chapters")
      .insert(chaptersToInsert)
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 更新小说的统计信息
    const totalWordCount = chaptersToInsert.reduce(
      (sum, c) => sum + c.word_count,
      0
    );
    await supabase
      .from("novels")
      .update({
        chapter_count: chaptersToInsert.length,
        word_count: totalWordCount,
      })
      .eq("id", novel_id);

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Error batch creating chapters:", error);
    return NextResponse.json(
      { success: false, error: "Failed to batch create chapters" },
      { status: 500 }
    );
  }
}

