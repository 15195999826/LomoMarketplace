/**
 * DamageAction - 伤害 Action
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
 * 伤害类型
 */
export type DamageType = 'physical' | 'magical' | 'pure';

/**
 * DamageAction
 */
export class DamageAction extends BaseAction {
  readonly type = 'damage';

  private baseDamage: number = 0;
  private damageType: DamageType = 'physical';

  setDamage(value: number): this {
    this.baseDamage = value;
    return this;
  }

  setDamageType(type: DamageType): this {
    this.damageType = type;
    return this;
  }

  setPhysical(): this {
    return this.setDamageType('physical');
  }

  setMagical(): this {
    return this.setDamageType('magical');
  }

  execute(ctx: Readonly<ExecutionContext>): ActionResult {
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner;
    const targets = this.getTargets(ctx);

    // 只打印日志
    const targetIds = targets.map(t => t.id).join(', ');
    console.log(`  [DamageAction] ${source?.id} 对 [${targetIds}] 造成 ${this.baseDamage} ${this.damageType} 伤害`);

    const allEvents = targets.map(target =>
      ctx.eventCollector.emit({
        kind: 'damage',
        logicTime: currentEvent.logicTime,
        source,
        target,
        damage: this.baseDamage,
        damageType: this.damageType,
      })
    );

    return createSuccessResult(allEvents, { damage: this.baseDamage });
  }
}
