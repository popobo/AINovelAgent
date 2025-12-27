import { NextRequest, NextResponse } from "next/server";
import {
  createNovelEmbeddings,
  getEmbeddingStats,
  deleteNovelEmbeddings,
} from "@/lib/rag/embedding";
import type { AIProviderType } from "@/types";

// 为小说创建向量嵌入
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { novelId, provider } = body as {
      novelId: string;
      provider?: AIProviderType;
    };

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: "novelId is required" },
        { status: 400 }
      );
    }

    const result = await createNovelEmbeddings(novelId, { provider });

    return NextResponse.json({
      success: true,
      data: {
        totalEmbeddings: result.total,
        chaptersProcessed: result.chapters,
      },
    });
  } catch (error) {
    console.error("Error creating embeddings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create embeddings" },
      { status: 500 }
    );
  }
}

// 获取嵌入统计信息
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

    const stats = await getEmbeddingStats(novelId);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error getting embedding stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get stats" },
      { status: 500 }
    );
  }
}

// 删除小说的向量嵌入
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: "novelId is required" },
        { status: 400 }
      );
    }

    await deleteNovelEmbeddings(novelId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting embeddings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete embeddings" },
      { status: 500 }
    );
  }
}

