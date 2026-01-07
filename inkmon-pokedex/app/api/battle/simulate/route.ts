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
  createInkMonBattle,
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

// ========== 辅助函数 ==========

function runSimpleAI(battle: ReturnType<typeof createInkMonBattle>): void {
  while (battle.isOngoing) {
    const currentUnit = battle.advanceToNextUnit();
    if (!currentUnit) break;

    // 简单 AI：尝试攻击，否则移动或跳过
    const targets = battle.getAttackableTargets(currentUnit);
    if (targets.length > 0) {
      // 攻击第一个目标
      const target = targets[0];
      const elements = currentUnit.getElements();
      const element = elements[0] ?? "Normal";
      battle.executeAttack(currentUnit, target, 60, element, "physical");
    } else {
      // 移动或跳过
      const movablePositions = battle.getMovablePositions(currentUnit);
      if (movablePositions.length > 0) {
        // 朝敌人方向移动
        const enemies = battle.aliveActors.filter(
          (a) => a.team !== currentUnit.team,
        );
        if (enemies.length > 0) {
          const enemy = enemies[0];
          const enemyPos = enemy.hexPosition;
          const currentPos = currentUnit.hexPosition;
          if (enemyPos && currentPos) {
            // 选择距离敌人最近的位置
            let bestPos = movablePositions[0];
            let bestDist = Infinity;
            for (const pos of movablePositions) {
              const dist =
                Math.abs(pos.q - enemyPos.q) + Math.abs(pos.r - enemyPos.r);
              if (dist < bestDist) {
                bestDist = dist;
                bestPos = pos;
              }
            }
            battle.executeMove(currentUnit, bestPos);
          }
        }
      } else {
        battle.executeSkip(currentUnit);
      }
    }

    battle.endTurn();
  }
}

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

    // 创建并运行战斗
    const battle = createInkMonBattle(teamAInkmons, teamBInkmons, battleConfig);
    battle.start();

    // 运行 AI 直到战斗结束
    runSimpleAI(battle);

    // 获取 replay
    const replay = battle.getReplay();

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
