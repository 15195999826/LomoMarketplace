/**
 * StartMoveAction - 开始移动 Action
 *
 * 移动的第一阶段：预订目标格子，创建 MoveStartEvent。
 * 此时 Actor 仍在原位置，但目标格子已被预订。
 */

import {
  BaseAction,
  type BaseActionParams,
  type ActionResult,
  type ExecutionContext,
  type ParamResolver,
  createSuccessResult,
  getCurrentEvent,
  resolveParam,
} from '@lomo/logic-game-framework';

import type { AxialCoord } from '@lomo/hex-grid';
import { createMoveStartEvent } from '../events/index.js';
import type { HexBattle } from '../battle/HexBattle.js';

/**
 * StartMoveAction 参数
 */
export interface StartMoveActionParams extends BaseActionParams {
  /** 目标坐标（必填，支持延迟求值） */
  targetCoord: ParamResolver<AxialCoord>;
}

/**
 * StartMoveAction
 *
 * @example
 * ```typescript
 * new StartMoveAction({
 *   targetSelector: TargetSelectors.abilityOwner,
 *   targetCoord: (ctx) => (getCurrentEvent(ctx) as ActionUseEvent).targetCoord!,
 * })
 * ```
 */
export class StartMoveAction extends BaseAction<StartMoveActionParams> {
  readonly type = 'start_move';

  constructor(params: StartMoveActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const currentEvent = getCurrentEvent(ctx);
    const targets = this.getTargets(ctx);

    // 解析目标坐标
    const targetCoord = resolveParam(this.params.targetCoord, ctx);

    if (!targetCoord) {
      console.warn(`  [StartMoveAction] 目标坐标未定义`);
      return createSuccessResult([], {});
    }

    // 获取 HexBattle 实例
    const battle = ctx.gameplayState as HexBattle;

    // 对每个目标执行预订
    const allEvents = targets.map(target => {
      // 获取 Actor 当前位置
      const actor = battle.getActor(target.id);
      const fromHex = actor ? battle.getActorPosition(actor as any) : undefined;

      if (!fromHex) {
        console.warn(`  [StartMoveAction] ${target.id} 当前位置未找到`);
        return undefined;
      }

      // 预订目标格子
      // 注意：在正确的实现下，预订不应该失败（AI 决策已过滤不可用格子）
      // 如果失败，说明系统状态不一致，应该立即报错
      const reserved = battle.grid.reserveTile(targetCoord, target.id);

      if (!reserved) {
        const occupant = battle.grid.getOccupantAt(targetCoord);
        const reservation = battle.grid.getReservation(targetCoord);
        throw new Error(
          `[StartMoveAction] BUG: ${target.id} 无法预订格子 (${targetCoord.q}, ${targetCoord.r})\n` +
          `  当前占用: ${occupant?.id ?? 'none'}\n` +
          `  当前预订: ${reservation ?? 'none'}\n` +
          `  这不应该发生！AI 决策应该过滤了不可用格子。`
        );
      }

      console.log(`  [StartMoveAction] ${target.id} 开始移动：从 (${fromHex.q}, ${fromHex.r}) → (${targetCoord.q}, ${targetCoord.r})`);

      // 创建开始移动事件
      return ctx.eventCollector.push(
        createMoveStartEvent(
          target.id,
          fromHex,
          targetCoord
        )
      );
    }).filter(e => e !== undefined);

    return createSuccessResult(allEvents, { targetCoord });
  }
}
