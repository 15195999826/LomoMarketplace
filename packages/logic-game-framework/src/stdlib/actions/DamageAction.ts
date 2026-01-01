/**
 * DamageAction - 伤害 Action
 *
 * 对目标造成伤害
 */

import {
  BaseAction,
  type ActionResult,
  type ExecutionContext,
  createSuccessResult,
  createFailureResult,
  getCurrentEvent,
} from '../../core/actions/index.js';
import type { ActorRef } from '../../core/types/common.js';
import { StandardAttributes } from '../attributes/StandardAttributes.js';

/**
 * 伤害类型
 */
export type DamageType = 'physical' | 'magical' | 'pure' | 'custom';

/**
 * 伤害计算接口
 * 可由外部提供实现
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
    // 简单实现：直接使用基础值
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
 * DamageAction
 */
export class DamageAction extends BaseAction {
  readonly type = 'damage';

  private baseDamage: number = 0;
  private damageExpression?: string;
  private damageType: DamageType = 'physical';

  /**
   * 设置固定伤害值
   */
  setDamage(value: number): this {
    this.baseDamage = value;
    this.damageExpression = undefined;
    return this;
  }

  /**
   * 设置伤害表达式
   * 表达式将在执行时由外部解析
   */
  setDamageExpression(expr: string): this {
    this.damageExpression = expr;
    return this;
  }

  /**
   * 设置伤害类型
   */
  setDamageType(type: DamageType): this {
    this.damageType = type;
    return this;
  }

  /**
   * 设置为物理伤害
   */
  setPhysical(): this {
    return this.setDamageType('physical');
  }

  /**
   * 设置为魔法伤害
   */
  setMagical(): this {
    return this.setDamageType('magical');
  }

  /**
   * 设置为纯粹伤害（无视防御）
   */
  setPure(): this {
    return this.setDamageType('pure');
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
    if (!source) {
      return createFailureResult('No source found');
    }

    // 计算基础伤害
    let baseValue = this.baseDamage;

    // 如果有表达式，可以在这里解析
    if (this.damageExpression && baseValue === 0) {
      const parsed = parseFloat(this.damageExpression);
      if (!isNaN(parsed)) {
        baseValue = parsed;
      } else {
        baseValue = 10; // 默认值
      }
    }

    if (baseValue <= 0) {
      return createFailureResult('Damage value must be positive');
    }

    // 对每个目标造成伤害
    const allEvents: ReturnType<typeof ctx.eventCollector.emit>[] = [];

    for (const target of targets) {
      // 使用伤害计算器
      const calcResult = damageCalculator.calculate(baseValue, source, target, ctx as ExecutionContext);
      const { damage, isCritical } = calcResult;

      // 判断是否击杀
      let isKill = calcResult.isKill ?? false;
      if (calcResult.isKill === undefined) {
        const state = ctx.gameplayState as { getActor?: (id: string) => unknown } | null;
        const targetActor = state?.getActor?.(target.id);
        if (targetActor && typeof targetActor === 'object') {
          const actor = targetActor as { hp?: number; attributes?: { getCurrentValue?(name: string): number } };
          let targetHp: number | undefined;
          if (typeof actor.hp === 'number') {
            targetHp = actor.hp;
          } else if (actor.attributes?.getCurrentValue) {
            targetHp = actor.attributes.getCurrentValue(StandardAttributes.HP);
          }
          if (targetHp !== undefined) {
            isKill = targetHp <= damage;
          }
        }
      }

      // 发出事件（事件包含完整信息：target, isCritical, isKill）
      const event = ctx.eventCollector.emit({
        kind: 'damage',
        logicTime: currentEvent.logicTime,
        source,
        target,
        damage,
        damageType: this.damageType,
        isCritical,
        isKill,
      });

      allEvents.push(event);
    }

    const result = createSuccessResult(allEvents, { damage: baseValue, targetCount: targets.length });

    // 处理回调
    return this.processCallbacks(result, ctx as ExecutionContext);
  }
}

/**
 * 创建 DamageAction 的便捷函数
 */
export function damage(value?: number): DamageAction {
  const action = new DamageAction();
  if (value !== undefined) {
    action.setDamage(value);
  }
  return action;
}
