/**
 * MoveAction - 移动 Action
 *
 * 目标由 targetSelector 决定（谁要移动），
 * 坐标由 targetCoord 参数决定（移动到哪里）。
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
import { createMoveEvent } from '../events/index.js';
import type { HexBattle } from '../battle/HexBattle.js';

/**
 * MoveAction 参数
 */
export interface MoveActionParams extends BaseActionParams {
  /** 目标坐标（必填，支持延迟求值） */
  targetCoord: ParamResolver<AxialCoord>;
}

/**
 * MoveAction
 *
 * @example
 * ```typescript
 * // 普通移动（移动自己）
 * new MoveAction({
 *   targetSelector: TargetSelectors.abilityOwner,
 *   targetCoord: (ctx) => (getCurrentEvent(ctx) as ActionUseEvent).targetCoord!,
 * })
 *
 * // 击退（移动敌人）
 * new MoveAction({
 *   targetSelector: TargetSelectors.currentTarget,
 *   targetCoord: (ctx) => calculateKnockbackPosition(ctx),
 * })
 * ```
 */
export class MoveAction extends BaseAction<MoveActionParams> {
  readonly type = 'move';

  constructor(params: MoveActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const currentEvent = getCurrentEvent(ctx);
    const targets = this.getTargets(ctx);

    // 解析目标坐标
    const targetCoord = resolveParam(this.params.targetCoord, ctx);

    // 获取 HexBattle 实例（用于查询位置）
    const battle = ctx.gameplayState as HexBattle;

    // 对每个目标执行移动
    const allEvents = targets.map(target => {
      // 获取 Actor 当前位置
      const actor = battle.getActor(target.id);
      const fromHex = actor ? battle.getActorPosition(actor as any) : undefined;

      console.log(`  [MoveAction] ${target.id} 移动从 (${fromHex?.q ?? '?'}, ${fromHex?.r ?? '?'}) 到 (${targetCoord?.q}, ${targetCoord?.r})`);

      // 产生回放格式事件
      return ctx.eventCollector.push(
        createMoveEvent(
          target.id,
          fromHex ?? { q: 0, r: 0 },  // 默认值（理论上不应触发）
          targetCoord ?? { q: 0, r: 0 }
        )
      );
    });

    return createSuccessResult(allEvents, { targetCoord });
  }
}
