/**
 * HealAction - 治疗 Action
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

/**
 * HealAction
 */
export class HealAction extends BaseAction {
  readonly type = 'heal';

  private healAmount: number = 0;

  setHealAmount(value: number): this {
    this.healAmount = value;
    return this;
  }

  execute(ctx: Readonly<ExecutionContext>): ActionResult {
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner;
    const targets = this.getTargets(ctx);

    // 只打印日志
    const targetIds = targets.map(t => t.id).join(', ');
    console.log(`  [HealAction] ${source?.id} 对 [${targetIds}] 治疗 ${this.healAmount} HP`);

    const allEvents = targets.map(target =>
      ctx.eventCollector.emit({
        kind: 'heal',
        logicTime: currentEvent.logicTime,
        source,
        target,
        healAmount: this.healAmount,
      })
    );

    return createSuccessResult(allEvents, { healAmount: this.healAmount });
  }
}
