/**
 * DamageAction - 伤害 Action 示例
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
 * 伤害类型
 */
export type DamageType = 'physical' | 'magical' | 'pure' | 'custom';

/**
 * 伤害计算接口
 */
export interface IDamageCalculator {
  calculate(
    baseValue: number,
    source: ActorRef,
    target: ActorRef,
    ctx: ExecutionContext
  ): { damage: number; isCritical: boolean; isKill?: boolean };
}

/**
 * 默认伤害计算器
 */
export class SimpleDamageCalculator implements IDamageCalculator {
  calculate(
    baseValue: number,
    _source: ActorRef,
    _target: ActorRef,
    _ctx: ExecutionContext
  ): { damage: number; isCritical: boolean } {
    const isCritical = Math.random() < 0.1; // 10% 暴击率
    const damage = isCritical ? Math.floor(baseValue * 1.5) : baseValue;
    return { damage, isCritical };
  }
}

// 全局伤害计算器
let damageCalculator: IDamageCalculator = new SimpleDamageCalculator();

export function setDamageCalculator(calculator: IDamageCalculator): void {
  damageCalculator = calculator;
}

/**
 * DamageAction 参数
 */
export interface DamageActionParams extends BaseActionParams {
  /** 伤害值（必填，支持延迟求值） */
  damage: ParamResolver<number>;
  /** 伤害类型（可选，默认 'physical'） */
  damageType?: ParamResolver<DamageType>;
}

/**
 * DamageAction
 *
 * @example
 * ```typescript
 * // 静态伤害
 * new DamageAction({ damage: 50, damageType: 'physical' })
 *
 * // 动态伤害（基于属性计算）
 * new DamageAction({
 *   damage: (ctx) => {
 *     const atk = ctx.ability?.owner?.attributes?.get('ATK')?.currentValue ?? 0;
 *     return atk * 1.5 + 10;
 *   },
 *   damageType: 'physical',
 * })
 *
 * // 带回调
 * new DamageAction({ damage: 100, damageType: 'fire' })
 *   .onCritical(new HealAction({ healAmount: 20 }))
 *   .onKill(new AddBuffAction({ buffId: 'victory' }))
 * ```
 */
export class DamageAction extends BaseAction<DamageActionParams> {
  readonly type = 'damage';

  constructor(params: DamageActionParams) {
    super(params);
  }

  execute(ctx: Readonly<ExecutionContext>): ActionResult {
    // 获取目标
    const targets = this.getTargets(ctx);
    if (targets.length === 0) {
      return createFailureResult('No targets selected');
    }

    // 解析参数（在执行时求值）
    const damage = resolveParam(this.params.damage, ctx as ExecutionContext);
    const damageType = resolveOptionalParam(this.params.damageType, 'physical', ctx as ExecutionContext);

    if (damage <= 0) {
      return createFailureResult('Damage value must be positive');
    }

    // 获取来源
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner ?? (currentEvent as { source?: ActorRef }).source;
    if (!source) {
      return createFailureResult('No source found');
    }

    // 对每个目标造成伤害
    const allEvents: ReturnType<typeof ctx.eventCollector.emit>[] = [];

    for (const target of targets) {
      const calcResult = damageCalculator.calculate(damage, source, target, ctx as ExecutionContext);
      const { damage: finalDamage, isCritical } = calcResult;
      const isKill = calcResult.isKill ?? false;

      const event = ctx.eventCollector.emit({
        kind: 'damage',
        logicTime: currentEvent.logicTime,
        source,
        target,
        damage: finalDamage,
        damageType,
        isCritical,
        isKill,
      });

      allEvents.push(event);
    }

    const result = createSuccessResult(allEvents, { damage, targetCount: targets.length });
    return this.processCallbacks(result, ctx as ExecutionContext);
  }
}

/**
 * 创建 DamageAction 的便捷函数
 */
export function damage(params: DamageActionParams): DamageAction {
  return new DamageAction(params);
}
