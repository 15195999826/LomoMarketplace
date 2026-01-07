/**
 * InkMonAbilitySet - InkMon 战斗专用 AbilitySet
 *
 * 继承框架 AbilitySet，添加 InkMon 特定的便捷方法。
 * 支持冷却系统管理（基于 AutoDurationTag）。
 */

import {
  AbilitySet,
  type AbilitySetConfig,
  type ActorRef,
  type IAttributeModifierTarget,
} from '@lomo/logic-game-framework';

/** 冷却 Tag 前缀 */
export const COOLDOWN_TAG_PREFIX = 'cooldown:';

/**
 * 生成冷却 Tag 名称
 */
export function getCooldownTag(abilityId: string): string {
  return `${COOLDOWN_TAG_PREFIX}${abilityId}`;
}

/**
 * InkMonAbilitySet - InkMon 战斗专用 AbilitySet
 */
export class InkMonAbilitySet extends AbilitySet {
  constructor(config: AbilitySetConfig) {
    super(config);
  }

  // ========== 冷却系统便捷方法 ==========

  /**
   * 检查 Ability 是否在冷却中
   *
   * @param abilityId Ability 实例 ID
   */
  isOnCooldown(abilityId: string): boolean {
    return this.hasTag(getCooldownTag(abilityId));
  }

  /**
   * 添加冷却（ATB/时间制）
   *
   * 使用 AutoDurationTag，冷却时间到后自动过期。
   *
   * @param abilityId Ability 实例 ID
   * @param durationMs 冷却时间（毫秒）
   */
  addCooldown(abilityId: string, durationMs: number): void {
    const tag = getCooldownTag(abilityId);
    this.addAutoDurationTag(tag, durationMs);
  }

  /**
   * 移除冷却（手动清除）
   *
   * @param abilityId Ability 实例 ID
   */
  removeCooldown(abilityId: string): void {
    const tag = getCooldownTag(abilityId);
    this.removeLooseTag(tag);
  }

  /**
   * 获取剩余冷却时间
   *
   * @param abilityId Ability 实例 ID
   * @returns 剩余时间（毫秒），如果不在冷却则返回 0
   */
  getRemainingCooldown(abilityId: string): number {
    const tag = getCooldownTag(abilityId);
    // AutoDurationTag 的剩余时间需要通过 TagContainer 获取
    // 暂时返回简单判断
    return this.hasTag(tag) ? 1 : 0;
  }
}

// ========== 工厂函数 ==========

/**
 * 创建 InkMonAbilitySet
 */
export function createInkMonAbilitySet(
  owner: ActorRef,
  modifierTarget: IAttributeModifierTarget
): InkMonAbilitySet {
  return new InkMonAbilitySet({ owner, modifierTarget });
}
