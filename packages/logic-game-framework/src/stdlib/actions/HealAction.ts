/**
 * HealAction - 治疗 Action
 *
 * 对目标进行治疗
 */

import {
  BaseAction,
  type ActionResult,
  type ExecutionContext,
  createSuccessResult,
  createFailureResult,
  CallbackTriggers,
} from '../../core/actions/index.js';
import { EventTypes } from '../../core/events/BattleEvent.js';

/**
 * HealAction
 */
export class HealAction extends BaseAction {
  readonly type = 'heal';

  private healAmount: number = 0;
  private healExpression?: string;
  private canOverheal: boolean = false;

  /**
   * 设置固定治疗量
   */
  setHealAmount(value: number): this {
    this.healAmount = value;
    this.healExpression = undefined;
    return this;
  }

  /**
   * 设置治疗表达式
   */
  setHealExpression(expr: string): this {
    this.healExpression = expr;
    return this;
  }

  /**
   * 设置是否允许过量治疗
   */
  setCanOverheal(value: boolean): this {
    this.canOverheal = value;
    return this;
  }

  execute(ctx: Readonly<ExecutionContext>): ActionResult {
    const target = ctx.primaryTarget;

    // 计算治疗量
    let amount = this.healAmount;

    if (this.healExpression && amount === 0) {
      const parsed = parseFloat(this.healExpression);
      if (!isNaN(parsed)) {
        amount = parsed;
      } else {
        amount = 10;
      }
    }

    if (amount <= 0) {
      return createFailureResult('Heal amount must be positive');
    }

    // 实际治疗量（考虑过量治疗）
    // 简化实现：不检查目标当前 HP
    const actualHeal = amount;
    const overheal = 0; // 需要外部计算

    // 发出事件
    const event = ctx.eventCollector.emitHeal(
      ctx.source,
      target,
      actualHeal,
      overheal > 0 ? overheal : undefined
    );

    // 构建回调触发器
    const triggers: string[] = [CallbackTriggers.ON_HEAL];
    if (overheal > 0) {
      triggers.push(CallbackTriggers.ON_OVERHEAL);
    }

    const result = createSuccessResult([event], [target], triggers, {
      healAmount: actualHeal,
      overheal,
    });

    return this.processCallbacks(result, ctx as ExecutionContext);
  }
}

/**
 * 创建 HealAction 的便捷函数
 */
export function heal(value?: number): HealAction {
  const action = new HealAction();
  if (value !== undefined) {
    action.setHealAmount(value);
  }
  return action;
}
