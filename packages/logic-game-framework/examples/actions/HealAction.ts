/**
 * HealAction - 治疗 Action 示例
 *
 * 展示如何使用构造函数参数 + ParamResolver 模式创建 Action。
 */

import {
  BaseAction,
  type BaseActionParams,
  type ActionResult,
  type ExecutionContext,
  createSuccessResult,
  createFailureResult,
  getCurrentEvent,
  type ParamResolver,
  resolveParam,
  resolveOptionalParam,
} from '../../src/core/actions/index.js';
import type { ActorRef } from '../../src/core/types/common.js';

/**
 * HealAction 参数
 */
export interface HealActionParams extends BaseActionParams {
  /** 治疗量（必填，支持延迟求值） */
  healAmount: ParamResolver<number>;
  /** 是否允许过量治疗（可选，默认 false） */
  canOverheal?: ParamResolver<boolean>;
}

/**
 * HealAction
 *
 * @example
 * ```typescript
 * // 静态治疗量
 * new HealAction({ healAmount: 50 })
 *
 * // 动态治疗量（基于伤害事件）
 * new HealAction({
 *   healAmount: (ctx) => {
 *     const damageEvent = getCurrentEvent(ctx) as { damage: number };
 *     return Math.floor(damageEvent.damage * 0.2);  // 20% 吸血
 *   },
 *   targetSelector: TargetSelectors.abilityOwner,
 * })
 * ```
 */
export class HealAction extends BaseAction<HealActionParams> {
  readonly type = 'heal';

  constructor(params: HealActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    // 获取目标
    const targets = this.getTargets(ctx);
    if (targets.length === 0) {
      return createFailureResult('No targets selected');
    }

    // 解析参数
    const healAmount = resolveParam(this.params.healAmount, ctx);
    const _canOverheal = resolveOptionalParam(this.params.canOverheal, false, ctx);

    if (healAmount <= 0) {
      return createFailureResult('Heal amount must be positive');
    }

    // 获取来源
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner ?? (currentEvent as { source?: ActorRef }).source;

    // 对每个目标进行治疗
    const allEvents: ReturnType<typeof ctx.eventCollector.push>[] = [];

    for (const target of targets) {
      // 简化实现：不检查目标当前 HP
      const actualHeal = healAmount;
      const overheal = 0;

      const event = ctx.eventCollector.push({
        kind: 'heal',
        logicTime: currentEvent.logicTime,
        source,
        target,
        healAmount: actualHeal,
        overheal: overheal > 0 ? overheal : undefined,
      });

      allEvents.push(event);
    }

    const result = createSuccessResult(allEvents, { healAmount, targetCount: targets.length });
    return this.processCallbacks(result, ctx);
  }
}

/**
 * 创建 HealAction 的便捷函数
 */
export function heal(params: HealActionParams): HealAction {
  return new HealAction(params);
}
