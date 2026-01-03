/**
 * DamageAction - 伤害 Action
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
  resolveOptionalParam,
} from '@lomo/logic-game-framework';

/**
 * 伤害类型
 */
export type DamageType = 'physical' | 'magical' | 'pure';

/**
 * DamageAction 参数
 */
export interface DamageActionParams extends BaseActionParams {
  /** 伤害值（必填） */
  damage: ParamResolver<number>;
  /** 伤害类型（可选，默认 'physical'） */
  damageType?: ParamResolver<DamageType>;
}

/**
 * DamageAction
 */
export class DamageAction extends BaseAction<DamageActionParams> {
  readonly type = 'damage';

  constructor(params: DamageActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner;
    const targets = this.getTargets(ctx);

    // 解析参数
    const damage = resolveParam(this.params.damage, ctx);
    const damageType = resolveOptionalParam(this.params.damageType, 'physical', ctx);

    // 打印日志
    const targetIds = targets.map(t => t.id).join(', ');
    console.log(`  [DamageAction] ${source?.id} 对 [${targetIds}] 造成 ${damage} ${damageType} 伤害`);

    const allEvents = targets.map(target =>
      ctx.eventCollector.push({
        kind: 'damage',
        logicTime: currentEvent.logicTime,
        source,
        target,
        damage,
        damageType,
      })
    );

    return createSuccessResult(allEvents, { damage });
  }
}
