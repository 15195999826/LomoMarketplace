/**
 * MoveAction - InkMon 移动 Action
 *
 * 执行单位在六边形网格上的移动。
 * 目标由 targetSelector 决定（谁要移动），
 * 坐标由 targetCoord 参数决定（移动到哪里）。
 *
 * **重要**：此 Action 会真正修改游戏状态（更新网格占用）
 */

import {
  BaseAction,
  type BaseActionParams,
  type ActionResult,
  type ExecutionContext,
  type ParamResolver,
  createSuccessResult,
  resolveParam,
} from '@lomo/logic-game-framework';

import type { AxialCoord } from '@lomo/hex-grid';
import { createMoveEvent } from '../events/ReplayEvents.js';
import type { InkMonBattle } from '../InkMonBattle.js';

// ========== 类型定义 ==========

/**
 * MoveAction 参数
 */
export interface MoveActionParams extends BaseActionParams {
  /** 目标坐标（必填，支持延迟求值） */
  targetCoord: ParamResolver<AxialCoord>;
}

// ========== 辅助函数 ==========

/** 安全的 console.log */
function logMessage(message: string): void {
  (globalThis as { console?: { log: (msg: string) => void } }).console?.log(
    message
  );
}

// ========== MoveAction ==========

/**
 * InkMon 移动 Action
 *
 * @example
 * ```typescript
 * // 移动自己
 * new MoveAction({
 *   targetSelector: (ctx) => ctx.ability ? [ctx.ability.owner] : [],
 *   targetCoord: (ctx) => (getCurrentEvent(ctx) as ActionUseEvent).targetCoord!,
 * })
 * ```
 */
export class MoveAction extends BaseAction<MoveActionParams> {
  readonly type = 'inkmon_move';

  constructor(params: MoveActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const targets = this.getTargets(ctx);

    // 解析目标坐标
    const targetCoord = resolveParam(this.params.targetCoord, ctx);

    // 获取 InkMonBattle 实例
    const battle = ctx.gameplayState as InkMonBattle;

    const allEvents = targets.map((target) => {
      // 获取 Actor
      const actor = battle.getUnit(target.id);
      if (!actor) {
        logMessage(`  [MoveAction] Actor ${target.id} not found`);
        return ctx.eventCollector.push(
          createMoveEvent(target.id, { q: 0, r: 0 }, targetCoord ?? { q: 0, r: 0 })
        );
      }

      // 获取当前位置
      const fromHex = actor.hexPosition ?? { q: 0, r: 0 };

      // 执行移动逻辑（更新网格）
      if (actor.hexPosition && targetCoord) {
        battle.grid.removeOccupant(actor.hexPosition);
        battle.grid.placeOccupant(targetCoord, { id: actor.id });
        actor.setPosition(targetCoord);
      }

      logMessage(
        `  [MoveAction] ${target.id} 移动从 (${fromHex.q}, ${fromHex.r}) 到 (${targetCoord?.q}, ${targetCoord?.r})`
      );

      // 产生移动事件
      return ctx.eventCollector.push(
        createMoveEvent(target.id, fromHex, targetCoord ?? { q: 0, r: 0 })
      );
    });

    return createSuccessResult(allEvents, { targetCoord });
  }
}

// ========== 工厂函数 ==========

/**
 * 创建移动 Action
 */
export function createMoveAction(params: MoveActionParams): MoveAction {
  return new MoveAction(params);
}
