import { NextRequest, NextResponse } from "next/server";
import {
  initializeDatabase,
  setDatabasePath,
  getInkMonByNameEn,
} from "@inkmon/core";
import path from "path";

// 设置数据库路径
const dbPath = path.join(process.cwd(), "..", "data", "inkmon.db");
setDatabasePath(dbPath);
initializeDatabase();

interface RouteParams {
  params: Promise<{ nameEn: string }>;
}

/**
 * GET /api/inkmon/[nameEn]
 * 获取单个 InkMon 详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { nameEn } = await params;
    const inkmon = getInkMonByNameEn(nameEn);

    if (!inkmon) {
      return NextResponse.json(
        { error: `InkMon not found: ${nameEn}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: inkmon });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
