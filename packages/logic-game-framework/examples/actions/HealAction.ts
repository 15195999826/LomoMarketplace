/**
 * HealAction - 治疗 Action 示例
 *
 * 这是一个示例实现，展示如何基于框架创建自定义 Action。
 * 实际项目应根据自己的需求创建类似的 Action。
 */

import {
  BaseAction,
  type ActionResult,
  type ExecutionContext,
  createSuccessResult,
  createFailureResult,
  getCurrentEvent,
} from '../../src/core/actions/index.js';
import type { ActorRef } from '../../src/core/types/common.js';

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
    // 使用 TargetSelector 获取目标
    const targets = this.getTargets(ctx);
    if (targets.length === 0) {
      return createFailureResult('No targets selected');
    }

    // 获取来源（从 ability 或当前触发事件）
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner ?? (currentEvent as { source?: ActorRef }).source;

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

    // 对每个目标进行治疗
    const allEvents: ReturnType<typeof ctx.eventCollector.emit>[] = [];

    for (const target of targets) {
      // 实际治疗量（考虑过量治疗）
      // 简化实现：不检查目标当前 HP
      const actualHeal = amount;
      const overheal = 0; // 需要外部计算

      // 发出事件（事件包含完整信息：target, overheal）
      const event = ctx.eventCollector.emit({
        kind: 'heal',
        logicTime: currentEvent.logicTime,
        source,
        target,
        healAmount: actualHeal,
        overheal: overheal > 0 ? overheal : undefined,
      });

      allEvents.push(event);
    }

    const result = createSuccessResult(allEvents, { healAmount: amount, targetCount: targets.length });

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
