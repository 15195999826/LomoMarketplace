import { NextRequest, NextResponse } from "next/server";
import {
  getInkMonsPaginated,
  filterInkMons,
  type Element,
  type EvolutionStage,
  VALID_ELEMENTS,
} from "@inkmon/core";
import { initDb } from "@/lib/db";

// 初始化数据库
initDb();

/**
 * GET /api/inkmon
 * 获取 InkMon 列表
 *
 * Query params:
 * - page: 页码 (从 1 开始，默认 1)
 * - pageSize: 每页数量 (默认 24)
 * - search: 搜索关键词 (名称/编号)
 * - element: 属性筛选 (可多个，逗号分隔)
 * - stage: 进化阶段筛选 (可多个，逗号分隔)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "24", 10);
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

    // 有筛选条件时使用 filter（不分页），否则使用分页
    const hasFilters = search || elements || stages;

    if (hasFilters) {
      const data = filterInkMons({ search, elements, stages });
      return NextResponse.json({
        data,
        total: data.length,
        page: 1,
        pageSize: data.length,
        hasMore: false,
        filters: { search, elements, stages },
      });
    }

    // 无筛选时使用分页
    const result = getInkMonsPaginated(page, pageSize);

    return NextResponse.json({
      data: result.data,
      total: result.total,
      page,
      pageSize,
      hasMore: result.hasMore,
      filters: {},
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
