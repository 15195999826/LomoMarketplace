/**
 * MoveAction - 移动 Action
 *
 * 目前只打印日志，验证框架流程。
 */

import {
  BaseAction,
  type ActionResult,
  type ExecutionContext,
  createSuccessResult,
  getCurrentEvent,
} from '@lomo/logic-game-framework';

import type { AxialCoord } from '@lomo/hex-grid';

/**
 * MoveAction
 */
export class MoveAction extends BaseAction {
  readonly type = 'move';

  private targetCoord?: AxialCoord;

  /**
   * 设置目标坐标
   */
  setTargetCoord(coord: AxialCoord): this {
    this.targetCoord = coord;
    return this;
  }

  execute(ctx: Readonly<ExecutionContext>): ActionResult {
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner;

    // 只打印日志
    console.log(`  [MoveAction] ${source?.id} 移动到 (${this.targetCoord?.q}, ${this.targetCoord?.r})`);

    const event = ctx.eventCollector.emit({
      kind: 'move',
      logicTime: currentEvent.logicTime,
      source,
      targetCoord: this.targetCoord,
    });

    return createSuccessResult([event], { targetCoord: this.targetCoord });
  }
}
