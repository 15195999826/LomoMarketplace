import { NextRequest, NextResponse } from "next/server";
import {
  initializeDatabase,
  setDatabasePath,
  getAllInkMons,
  filterInkMons,
  getInkMonCount,
  type Element,
  type EvolutionStage,
  VALID_ELEMENTS,
} from "@inkmon/core";
import path from "path";

// 设置数据库路径为项目根目录的 data/inkmon.db
const dbPath = path.join(process.cwd(), "..", "data", "inkmon.db");
setDatabasePath(dbPath);
initializeDatabase();

/**
 * GET /api/inkmon
 * 获取 InkMon 列表
 *
 * Query params:
 * - search: 搜索关键词 (名称/编号)
 * - element: 属性筛选 (可多个，逗号分隔)
 * - stage: 进化阶段筛选 (可多个，逗号分隔)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const elementParam = searchParams.get("element");
    const stageParam = searchParams.get("stage");

    // 解析属性参数
    let elements: Element[] | undefined;
    if (elementParam) {
      const elementList = elementParam.split(",").filter(e =>
        VALID_ELEMENTS.includes(e as Element)
      ) as Element[];
      if (elementList.length > 0) {
        elements = elementList;
      }
    }

    // 解析阶段参数
    let stages: EvolutionStage[] | undefined;
    if (stageParam) {
      const validStages = ["baby", "mature", "adult"] as const;
      const stageList = stageParam.split(",").filter(s =>
        validStages.includes(s as EvolutionStage)
      ) as EvolutionStage[];
      if (stageList.length > 0) {
        stages = stageList;
      }
    }

    // 有筛选条件时使用 filter，否则获取全部
    const hasFilters = search || elements || stages;
    const data = hasFilters
      ? filterInkMons({ search, elements, stages })
      : getAllInkMons();

    return NextResponse.json({
      data,
      total: data.length,
      filters: { search, elements, stages },
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
