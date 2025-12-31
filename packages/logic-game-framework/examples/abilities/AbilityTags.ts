/**
 * AbilityTags - 能力标签示例
 *
 * 展示如何为游戏定义 Ability 标签常量。
 * 不同游戏的标签定义各不相同，因此框架不提供内置标签。
 *
 * @example
 * ```typescript
 * // 在你的游戏中定义标签
 * const MyAbilityTags = {
 *   BUFF: 'buff',
 *   DEBUFF: 'debuff',
 *   ULTIMATE: 'ultimate',  // 游戏特有
 *   ELEMENTAL: 'elemental', // 游戏特有
 * } as const;
 *
 * // 使用标签
 * const fireball = new Ability({
 *   configId: 'skill_fireball',
 *   tags: [MyAbilityTags.ACTIVE, MyAbilityTags.ELEMENTAL],
 *   components: [...],
 * }, caster.toRef());
 *
 * // 按标签查询
 * const buffs = hero.abilitySet.findAbilitiesByTag(MyAbilityTags.BUFF);
 * hero.abilitySet.revokeAbilitiesByTag(MyAbilityTags.DEBUFF, 'dispelled');
 * ```
 */

// ========== 通用 RPG 标签示例 ==========

/**
 * 通用 RPG 游戏标签（示例）
 */
export const RPGAbilityTags = {
  /** Buff（增益效果） */
  BUFF: 'buff',
  /** Debuff（减益效果） */
  DEBUFF: 'debuff',
  /** 主动技能 */
  ACTIVE: 'active',
  /** 被动技能 */
  PASSIVE: 'passive',
  /** 可叠加 */
  STACKABLE: 'stackable',
  /** 可驱散 */
  DISPELLABLE: 'dispellable',
  /** 隐藏（不显示在 UI 中） */
  HIDDEN: 'hidden',
} as const;

export type RPGAbilityTag = (typeof RPGAbilityTags)[keyof typeof RPGAbilityTags];

// ========== MOBA 游戏标签示例 ==========

/**
 * MOBA 游戏标签（示例）
 */
export const MOBAAbilityTags = {
  // 技能类型
  ACTIVE: 'active',
  PASSIVE: 'passive',
  ULTIMATE: 'ultimate',

  // 效果类型
  BUFF: 'buff',
  DEBUFF: 'debuff',
  CROWD_CONTROL: 'cc',
  DAMAGE_OVER_TIME: 'dot',
  HEAL_OVER_TIME: 'hot',

  // 控制类型
  STUN: 'stun',
  SLOW: 'slow',
  SILENCE: 'silence',
  ROOT: 'root',

  // 特殊属性
  DISPELLABLE: 'dispellable',
  UNDISPELLABLE: 'undispellable',
  HIDDEN: 'hidden',
} as const;

export type MOBAAbilityTag = (typeof MOBAAbilityTags)[keyof typeof MOBAAbilityTags];

// ========== 回合制游戏标签示例 ==========

/**
 * 回合制游戏标签（示例）
 */
export const TurnBasedAbilityTags = {
  // 技能类型
  ACTIVE: 'active',
  PASSIVE: 'passive',
  COUNTER: 'counter', // 反击技能

  // 效果类型
  BUFF: 'buff',
  DEBUFF: 'debuff',
  SHIELD: 'shield',
  HEAL: 'heal',

  // 持续类型
  PERMANENT: 'permanent', // 永久效果
  TURN_BASED: 'turn_based', // 回合制持续

  // 属性
  DISPELLABLE: 'dispellable',
  STACKABLE: 'stackable',
} as const;

export type TurnBasedAbilityTag = (typeof TurnBasedAbilityTags)[keyof typeof TurnBasedAbilityTags];
