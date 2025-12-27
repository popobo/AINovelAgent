import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Novel } from "@/types";

// 获取所有小说列表
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("novels")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching novels:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch novels" },
      { status: 500 }
    );
  }
}

// 创建新小说
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, author, genre, summary, settings, style_guide } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("novels")
      .insert({
        title,
        author,
        genre,
        summary,
        settings,
        style_guide,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data as Novel });
  } catch (error) {
    console.error("Error creating novel:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create novel" },
      { status: 500 }
    );
  }
}

