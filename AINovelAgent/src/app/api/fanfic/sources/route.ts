import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// 获取所有原作设定
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("fanfic_sources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching fanfic sources:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

// 创建新原作设定
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, world_setting, characters, plot_summary } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("fanfic_sources")
      .insert({
        name,
        type: type || "other",
        world_setting,
        characters: characters || [],
        plot_summary,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error creating fanfic source:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create source" },
      { status: 500 }
    );
  }
}

