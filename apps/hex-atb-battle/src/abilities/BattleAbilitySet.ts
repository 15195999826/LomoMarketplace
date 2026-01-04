/**
 * BattleAbilitySet - 战斗专用 AbilitySet
 *
 * 继承框架 AbilitySet，添加项目特定的便捷方法。
 * 主要扩展：冷却系统管理。
 *
 * ## ATB 战斗的冷却机制
 *
 * 本项目使用 ATB 战斗系统，冷却通过 AutoDurationTag 实现（基于时间自动过期）。
 * 冷却 Tag 格式：`cooldown:{abilityId}`
 *
 * @see AbilitySet 基类文档了解可选继承模式
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
 * BattleAbilitySet - 战斗专用 AbilitySet
 */
export class BattleAbilitySet extends AbilitySet {
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
   * 注意：AutoDurationTag 无法通过 removeLooseTag 移除，
   * 此方法用于清除 LooseTag 形式的冷却（如回合制冷却）。
   *
   * @param abilityId Ability 实例 ID
   */
  removeCooldown(abilityId: string): void {
    const tag = getCooldownTag(abilityId);
    this.removeLooseTag(tag);
  }
}

// ========== 工厂函数 ==========

/**
 * 创建 BattleAbilitySet
 */
export function createBattleAbilitySet(
  owner: ActorRef,
  modifierTarget: IAttributeModifierTarget
): BattleAbilitySet {
  return new BattleAbilitySet({ owner, modifierTarget });
}
