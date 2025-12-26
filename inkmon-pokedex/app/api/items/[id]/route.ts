import { NextRequest, NextResponse } from "next/server";
import { getItemById } from "@/data/mock-items";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/items/[id]
 * 获取单个物品详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const item = getItemById(id);

    if (!item) {
      return NextResponse.json(
        { error: `物品未找到: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
