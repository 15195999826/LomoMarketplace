import { NextResponse } from "next/server";
import { getAllItems, getItemCount } from "@/data/mock-items";

/**
 * GET /api/items
 * 获取所有物品列表
 */
export async function GET() {
  try {
    const items = getAllItems();
    const total = getItemCount();

    return NextResponse.json({
      items,
      total,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
