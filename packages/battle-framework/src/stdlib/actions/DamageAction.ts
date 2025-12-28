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
  CallbackTriggers,
} from '../../core/actions/index.js';
import type { ActorRef } from '../../core/types/common.js';
import { EventTypes } from '../../core/events/BattleEvent.js';
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
  ): { damage: number; isCritical: boolean };
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
    const target = ctx.primaryTarget;

    // 计算基础伤害
    let baseValue = this.baseDamage;

    // 如果有表达式，可以在这里解析
    // 目前简化处理，仅使用固定值
    if (this.damageExpression && baseValue === 0) {
      // 简单解析：如果表达式是数字字符串
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

    // 使用伤害计算器
    const { damage, isCritical } = damageCalculator.calculate(
      baseValue,
      ctx.source,
      target,
      ctx as ExecutionContext
    );

    // 检查目标是否死亡（简化：假设伤害 >= 目标当前 HP）
    // 实际实现需要获取目标的 HP
    const isKill = false; // 需要外部判断

    // 发出事件
    const event = ctx.eventCollector.emitDamage(ctx.source, target, damage, {
      damageType: this.damageType,
      isCritical,
      isKill,
    });

    // 构建回调触发器
    const triggers: string[] = [CallbackTriggers.ON_HIT];
    if (isCritical) {
      triggers.push(CallbackTriggers.ON_CRITICAL);
    }
    if (isKill) {
      triggers.push(CallbackTriggers.ON_KILL);
    }

    const result = createSuccessResult([event], [target], triggers, {
      damage,
      isCritical,
      isKill,
    });

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
