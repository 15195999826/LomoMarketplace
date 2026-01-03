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

    // 对每个目标执行移动
    const allEvents = targets.map(target => {
      console.log(`  [MoveAction] ${target.id} 移动到 (${targetCoord?.q}, ${targetCoord?.r})`);

      return ctx.eventCollector.push({
        kind: 'move',
        logicTime: currentEvent.logicTime,
        source: target,
        targetCoord,
      });
    });

    return createSuccessResult(allEvents, { targetCoord });
  }
}
