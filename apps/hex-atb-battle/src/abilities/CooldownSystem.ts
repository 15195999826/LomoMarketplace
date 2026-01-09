/**
 * 冷却系统 - 项目层实现
 *
 * 包含冷却相关的 Condition 和 Cost 实现。
 * 这些是项目特定的实现，框架层不包含。
 *
 * ## ATB 战斗的冷却机制
 *
 * - 使用 AutoDurationTag 实现时间制冷却
 * - 冷却 Tag 格式：`cooldown:{abilityId}`
 * - Tag 在指定时间后自动过期
 */

import type { Condition, ConditionContext, Cost, CostContext } from '@lomo/logic-game-framework';
import { getCooldownTag } from './BattleAbilitySet.js';

// ========== Condition ==========

/**
 * CooldownReady 条件 - 冷却就绪（无冷却 Tag）
 *
 * 使用 ability.id 作为冷却标识，支持同一 configId 的多实例独立冷却。
 */
export class CooldownReadyCondition implements Condition {
  readonly type = 'cooldownReady';

  check(ctx: ConditionContext): boolean {
    const cooldownTag = getCooldownTag(ctx.ability.id);
    return !ctx.abilitySet.hasTag(cooldownTag);
  }

  getFailReason(): string {
    return '技能冷却中';
  }
}

// ========== Cost ==========

/**
 * 时间制冷却消耗 - 使用 AutoDurationTag
 *
 * 适用于 ATB/实时战斗系统。
 * 冷却 Tag 在指定时间后自动过期。
 */
export class TimedCooldownCost implements Cost {
  readonly type = 'timedCooldown';

  /**
   * @param durationMs 冷却时间（毫秒）
   */
  constructor(private readonly durationMs: number) {}

  canPay(): boolean {
    return true; // 冷却总是可以添加
  }

  pay(ctx: CostContext): void {
    const cooldownTag = getCooldownTag(ctx.ability.id);
    ctx.abilitySet.addAutoDurationTag(cooldownTag, this.durationMs);
  }
}

/**
 * 回合制冷却消耗 - 使用 LooseTag (stacks = 剩余回合数)
 *
 * 适用于回合制战斗系统。
 * 需要配合 System 在每回合结束时调用 tickCooldowns()。
 */
export class TurnCooldownCost implements Cost {
  readonly type = 'turnCooldown';

  /**
   * @param turns 冷却回合数
   */
  constructor(private readonly turns: number) {}

  canPay(): boolean {
    return true; // 冷却总是可以添加
  }

  pay(ctx: CostContext): void {
    const cooldownTag = getCooldownTag(ctx.ability.id);
    // 使用 stacks 表示剩余回合数
    ctx.abilitySet.addLooseTag(cooldownTag, this.turns);
  }
}
