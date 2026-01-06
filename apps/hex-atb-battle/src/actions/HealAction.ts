/**
 * HealAction - 治疗 Action
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

import { createHealEvent } from '../events/index.js';

/**
 * HealAction 参数
 */
export interface HealActionParams extends BaseActionParams {
  /** 治疗量（必填） */
  healAmount: ParamResolver<number>;
}

/**
 * HealAction
 */
export class HealAction extends BaseAction<HealActionParams> {
  readonly type = 'heal';

  constructor(params: HealActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner;
    const targets = this.getTargets(ctx);

    // 解析参数
    const healAmount = resolveParam(this.params.healAmount, ctx);

    // 打印日志
    const targetIds = targets.map(t => t.id).join(', ');
    console.log(`  [HealAction] ${source?.id} 对 [${targetIds}] 治疗 ${healAmount} HP`);

    // 产生回放格式事件
    const allEvents = targets.map(target =>
      ctx.eventCollector.push(
        createHealEvent(
          currentEvent.logicTime,
          target.id,
          healAmount,
          source?.id
        )
      )
    );

    return createSuccessResult(allEvents, { healAmount });
  }
}
