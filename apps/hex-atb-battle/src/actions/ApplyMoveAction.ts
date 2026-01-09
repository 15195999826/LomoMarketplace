/**
 * ApplyMoveAction - 应用移动 Action
 *
 * 移动的第二阶段：执行实际移动，更新 grid 状态，取消预订，创建 MoveCompleteEvent。
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
import { createMoveCompleteEvent } from '../events/index.js';
import type { HexBattle } from '../battle/HexBattle.js';

/**
 * ApplyMoveAction 参数
 */
export interface ApplyMoveActionParams extends BaseActionParams {
  /** 目标坐标（必填，支持延迟求值） */
  targetCoord: ParamResolver<AxialCoord>;
}

/**
 * ApplyMoveAction
 *
 * @example
 * ```typescript
 * new ApplyMoveAction({
 *   targetSelector: TargetSelectors.abilityOwner,
 *   targetCoord: (ctx) => (getCurrentEvent(ctx) as ActionUseEvent).targetCoord!,
 * })
 * ```
 */
export class ApplyMoveAction extends BaseAction<ApplyMoveActionParams> {
  readonly type = 'apply_move';

  constructor(params: ApplyMoveActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const currentEvent = getCurrentEvent(ctx);
    const targets = this.getTargets(ctx);

    // 解析目标坐标
    const targetCoord = resolveParam(this.params.targetCoord, ctx);

    if (!targetCoord) {
      console.warn(`  [ApplyMoveAction] 目标坐标未定义`);
      return createSuccessResult([], {});
    }

    // 获取 HexBattle 实例
    const battle = ctx.gameplayState as HexBattle;

    // 对每个目标执行移动
    const allEvents = targets.map(target => {
      // 获取 Actor 当前位置
      const actor = battle.getActor(target.id);
      const fromHex = actor ? battle.getActorPosition(actor as any) : undefined;

      if (!fromHex) {
        console.warn(`  [ApplyMoveAction] ${target.id} 当前位置未找到`);
        return undefined;
      }

      // 执行实际移动（moveOccupant 会自动取消预订）
      // 注意：在正确的实现下，移动不应该失败（StartMoveAction 已预订格子）
      // 如果失败，说明预订机制被破坏，应该立即报错
      const grid = battle.grid;
      const moveSuccess = grid.moveOccupant(fromHex, targetCoord);

      if (!moveSuccess) {
        const occupant = grid.getOccupantAt(targetCoord);
        const reservation = grid.getReservation(targetCoord);
        const hasTile = grid.hasTile(targetCoord);
        throw new Error(
          `[ApplyMoveAction] BUG: ${target.id} 移动失败：从 (${fromHex.q}, ${fromHex.r}) → (${targetCoord.q}, ${targetCoord.r})\n` +
          `  格子存在: ${hasTile}\n` +
          `  当前占用: ${occupant?.id ?? 'none'}\n` +
          `  当前预订: ${reservation ?? 'none'}\n` +
          `  这不应该发生！StartMoveAction 已预订该格子。`
        );
      }

      console.log(`  [ApplyMoveAction] ${target.id} 移动完成：从 (${fromHex.q}, ${fromHex.r}) → (${targetCoord.q}, ${targetCoord.r})`);

      // 创建移动完成事件
      return ctx.eventCollector.push(
        createMoveCompleteEvent(
          target.id,
          fromHex,
          targetCoord
        )
      );
    }).filter(e => e !== undefined);

    return createSuccessResult(allEvents, { targetCoord });
  }
}
