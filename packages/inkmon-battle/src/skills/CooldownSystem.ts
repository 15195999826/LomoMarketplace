/**
 * 冷却系统 - InkMon 战斗冷却实现
 *
 * 包含冷却相关的 Condition 和 Cost 实现。
 *
 * ## ATB 战斗的冷却机制
 *
 * - 使用 AutoDurationTag 实现时间制冷却
 * - 冷却 Tag 格式：`cooldown:{abilityId}`
 * - Tag 在指定时间后自动过期
 */

import type {
  Condition,
  ConditionContext,
  Cost,
  CostContext,
} from '@lomo/logic-game-framework';

// ========== 冷却 Tag 工具 ==========

/** 冷却 Tag 前缀 */
export const COOLDOWN_TAG_PREFIX = 'cooldown:';

/**
 * 生成冷却 Tag 名称
 */
export function getCooldownTag(abilityId: string): string {
  return `${COOLDOWN_TAG_PREFIX}${abilityId}`;
}

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
 * CooldownCost - TimedCooldownCost 的别名
 *
 * 本项目默认使用时间制冷却。
 */
export const CooldownCost = TimedCooldownCost;

// ========== 工具函数 ==========

/**
 * 检查 Ability 是否在冷却中
 */
export function isOnCooldown(
  abilitySet: { hasTag(tag: string): boolean },
  abilityId: string
): boolean {
  return abilitySet.hasTag(getCooldownTag(abilityId));
}
