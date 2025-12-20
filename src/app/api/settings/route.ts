import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

interface SettingsPayload {
  device_id: string;
  default_provider?: string;
  openrouter_model?: string;
  default_word_count?: number;
  temperature?: number;
  font_size?: number;
  line_height?: number;
  // API Keys
  openai_api_key?: string;
  anthropic_api_key?: string;
  deepseek_api_key?: string;
  qwen_api_key?: string;
  openrouter_api_key?: string;
}

// GET /api/settings?device_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("device_id");

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "device_id 是必需的" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("device_id", deviceId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found, 其他错误才报错
      console.error("获取设置失败:", error);
      return NextResponse.json(
        { success: false, error: "获取设置失败" },
        { status: 500 }
      );
    }

    // 如果没有找到设置，返回默认值
    const settings = data || {
      default_provider: "openai",
      openrouter_model: "anthropic/claude-3.5-sonnet",
      default_word_count: 1000,
      temperature: 0.7,
      font_size: 16,
      line_height: 2,
    };

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("获取设置出错:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}

// POST /api/settings
export async function POST(request: NextRequest) {
  try {
    const body: SettingsPayload = await request.json();

    if (!body.device_id) {
      return NextResponse.json(
        { success: false, error: "device_id 是必需的" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 构建更新数据，只包含非空字段
    const updateData: Record<string, unknown> = {
      device_id: body.device_id,
    };

    // 基础设置
    if (body.default_provider !== undefined) {
      updateData.default_provider = body.default_provider;
    }
    if (body.openrouter_model !== undefined) {
      updateData.openrouter_model = body.openrouter_model;
    }
    if (body.default_word_count !== undefined) {
      updateData.default_word_count = body.default_word_count;
    }
    if (body.temperature !== undefined) {
      updateData.temperature = body.temperature;
    }
    if (body.font_size !== undefined) {
      updateData.font_size = body.font_size;
    }
    if (body.line_height !== undefined) {
      updateData.line_height = body.line_height;
    }

    // API Keys（只有当用户明确提供时才更新）
    if (body.openai_api_key !== undefined) {
      updateData.openai_api_key = body.openai_api_key || null;
    }
    if (body.anthropic_api_key !== undefined) {
      updateData.anthropic_api_key = body.anthropic_api_key || null;
    }
    if (body.deepseek_api_key !== undefined) {
      updateData.deepseek_api_key = body.deepseek_api_key || null;
    }
    if (body.qwen_api_key !== undefined) {
      updateData.qwen_api_key = body.qwen_api_key || null;
    }
    if (body.openrouter_api_key !== undefined) {
      updateData.openrouter_api_key = body.openrouter_api_key || null;
    }

    // 使用 upsert 来创建或更新设置
    const { data, error } = await supabase
      .from("user_settings")
      .upsert(updateData, {
        onConflict: "device_id",
      })
      .select()
      .single();

    if (error) {
      console.error("保存设置失败:", error);
      return NextResponse.json(
        { success: false, error: "保存设置失败: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: "设置已保存",
    });
  } catch (error) {
    console.error("保存设置出错:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}

