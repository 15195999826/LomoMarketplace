/**
 * Battle Simulate API
 *
 * POST /api/battle/simulate
 *
 * 接收两队 InkMon name_en 列表，运行战斗并返回 replay 录像
 */

// Force Node.js runtime (required for better-sqlite3)
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { getInkMonByNameEn, type InkMon } from "@inkmon/core";
import {
  runInkMonBattle,
  ReplayLogPrinter,
  type IBattleRecord,
  type InkMonBattleConfig,
} from "@inkmon/battle";

// ========== 类型定义 ==========

export interface SimulateBattleRequest {
  teamA: string[]; // InkMon.name_en
  teamB: string[]; // InkMon.name_en
  config?: {
    tickInterval?: number;
    deterministicMode?: boolean;
    maxTurns?: number;
  };
}

export interface SimulateBattleResponse {
  success: true;
  replay: IBattleRecord;
  log?: string;
}

export interface SimulateBattleErrorResponse {
  success: false;
  error: string;
  code: "INKMON_NOT_FOUND" | "INVALID_TEAM" | "BATTLE_ERROR";
  details?: string[];
}

type ApiResponse = SimulateBattleResponse | SimulateBattleErrorResponse;

// ========== API Handler ==========

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = (await request.json()) as SimulateBattleRequest;

    // 验证请求
    if (!body.teamA || !Array.isArray(body.teamA) || body.teamA.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "teamA must be a non-empty array of InkMon names",
          code: "INVALID_TEAM",
        },
        { status: 400 },
      );
    }

    if (!body.teamB || !Array.isArray(body.teamB) || body.teamB.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "teamB must be a non-empty array of InkMon names",
          code: "INVALID_TEAM",
        },
        { status: 400 },
      );
    }

    // 查询 InkMon
    const notFoundNames: string[] = [];
    const teamAInkmons: InkMon[] = [];
    const teamBInkmons: InkMon[] = [];

    for (const name of body.teamA) {
      const inkmon = getInkMonByNameEn(name);
      if (!inkmon) {
        notFoundNames.push(name);
      } else {
        teamAInkmons.push(inkmon);
      }
    }

    for (const name of body.teamB) {
      const inkmon = getInkMonByNameEn(name);
      if (!inkmon) {
        notFoundNames.push(name);
      } else {
        teamBInkmons.push(inkmon);
      }
    }

    if (notFoundNames.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `InkMon not found: ${notFoundNames.join(", ")}`,
          code: "INKMON_NOT_FOUND",
          details: notFoundNames,
        },
        { status: 404 },
      );
    }

    // 创建战斗配置
    const battleConfig: InkMonBattleConfig = {
      tickInterval: body.config?.tickInterval ?? 100,
      deterministicMode: body.config?.deterministicMode ?? false,
      maxTurns: body.config?.maxTurns ?? 100,
    };

    // 运行战斗并获取 replay（AI 决策在 InkMonBattle.tick() 内部处理）
    const replay = runInkMonBattle(teamAInkmons, teamBInkmons, battleConfig);

    // 轻量级数据完整性校验
    if (replay.version !== "2.0") {
      console.warn(
        `[Battle API] Replay version mismatch: expected "2.0", got "${replay.version}"`,
      );
    }

    // 生成日志
    const log = ReplayLogPrinter.print(replay);

    return NextResponse.json({
      success: true,
      replay,
      log,
    });
  } catch (error) {
    console.error("Battle simulation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        code: "BATTLE_ERROR",
      },
      { status: 500 },
    );
  }
}
