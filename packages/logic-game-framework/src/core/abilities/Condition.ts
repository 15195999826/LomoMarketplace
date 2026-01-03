/**
 * Condition - 条件接口
 *
 * 用于检查技能是否可以释放的条件。
 * ActiveUseComponent 在激活前会检查所有 conditions。
 *
 * ## 使用示例
 *
 * ```typescript
 * // 冷却就绪条件
 * class CooldownReadyCondition implements Condition {
 *   check(ctx: ConditionContext): boolean {
 *     return !ctx.abilitySet.hasTag(`cooldown:${ctx.ability.configId}`);
 *   }
 * }
 *
 * // 拥有 Tag 条件
 * class HasTagCondition implements Condition {
 *   constructor(private tag: string) {}
 *
 *   check(ctx: ConditionContext): boolean {
 *     return ctx.abilitySet.hasTag(this.tag);
 *   }
 * }
 * ```
 */

import type { ActorRef } from '../types/common.js';
import type { AbilitySet } from './AbilitySet.js';
import type { IAbilityForComponent } from './AbilityComponent.js';

/**
 * 条件检查上下文
 */
export type ConditionContext = {
  /** 技能所有者 */
  readonly owner: ActorRef;
  /** AbilitySet 引用（可查询 Tag） */
  readonly abilitySet: AbilitySet;
  /** 当前 Ability */
  readonly ability: IAbilityForComponent;
  /** 游戏状态 */
  readonly gameplayState: unknown;
};

/**
 * 条件接口
 */
export interface Condition {
  /** 条件类型标识（用于调试） */
  readonly type: string;

  /**
   * 检查条件是否满足
   *
   * @param ctx 条件检查上下文
   * @returns true 表示条件满足
   */
  check(ctx: ConditionContext): boolean;

  /**
   * 获取条件不满足时的原因（可选，用于 UI 提示）
   */
  getFailReason?(ctx: ConditionContext): string;
}

// ========== 常用条件实现 ==========

/**
 * HasTag 条件 - 要求拥有指定 Tag
 */
export class HasTagCondition implements Condition {
  readonly type = 'hasTag';

  constructor(private readonly tag: string) {}

  check(ctx: ConditionContext): boolean {
    return ctx.abilitySet.hasTag(this.tag);
  }

  getFailReason(): string {
    return `缺少 Tag: ${this.tag}`;
  }
}

/**
 * NoTag 条件 - 要求没有指定 Tag
 */
export class NoTagCondition implements Condition {
  readonly type = 'noTag';

  constructor(private readonly tag: string) {}

  check(ctx: ConditionContext): boolean {
    return !ctx.abilitySet.hasTag(this.tag);
  }

  getFailReason(): string {
    return `已有 Tag: ${this.tag}`;
  }
}

/**
 * TagStacks 条件 - 要求 Tag 层数达到指定值
 */
export class TagStacksCondition implements Condition {
  readonly type = 'tagStacks';

  constructor(
    private readonly tag: string,
    private readonly minStacks: number
  ) {}

  check(ctx: ConditionContext): boolean {
    return ctx.abilitySet.getTagStacks(this.tag) >= this.minStacks;
  }

  getFailReason(ctx: ConditionContext): string {
    const current = ctx.abilitySet.getTagStacks(this.tag);
    return `${this.tag} 层数不足: ${current}/${this.minStacks}`;
  }
}

/**
 * CooldownReady 条件 - 冷却就绪（无冷却 Tag）
 *
 * 冷却通过 Tag 实现：`cooldown:{configId}`
 */
export class CooldownReadyCondition implements Condition {
  readonly type = 'cooldownReady';

  check(ctx: ConditionContext): boolean {
    const cooldownTag = `cooldown:${ctx.ability.configId}`;
    return !ctx.abilitySet.hasTag(cooldownTag);
  }

  getFailReason(): string {
    return '技能冷却中';
  }
}

/**
 * 组合条件 - 所有条件都满足
 */
export class AllConditions implements Condition {
  readonly type = 'all';

  constructor(private readonly conditions: Condition[]) {}

  check(ctx: ConditionContext): boolean {
    return this.conditions.every((c) => c.check(ctx));
  }

  getFailReason(ctx: ConditionContext): string {
    for (const c of this.conditions) {
      if (!c.check(ctx)) {
        return c.getFailReason?.(ctx) ?? `条件不满足: ${c.type}`;
      }
    }
    return '';
  }
}

/**
 * 组合条件 - 任意条件满足
 */
export class AnyCondition implements Condition {
  readonly type = 'any';

  constructor(private readonly conditions: Condition[]) {}

  check(ctx: ConditionContext): boolean {
    return this.conditions.some((c) => c.check(ctx));
  }

  getFailReason(): string {
    return '所有条件都不满足';
  }
}
