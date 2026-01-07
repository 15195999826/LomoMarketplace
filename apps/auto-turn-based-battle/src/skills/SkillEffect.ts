/**
 * 技能效果系统 - 数据驱动的技能效果定义
 *
 * 将技能效果从硬编码的 if-else 抽象为可配置的数据结构，支持：
 * - 多种效果类型：伤害、治疗、Buff、移动等
 * - 多种目标类型：单体、AOE、自身、友方等
 * - 效果组合：一个技能可包含多个效果
 * - 数据驱动：通过配置而非代码定义技能
 *
 * ## 设计理念
 *
 * 传统的技能实现：
 * ```typescript
 * if (skill === 'Fireball') {
 *   // 火球逻辑
 * } else if (skill === 'Heal') {
 *   // 治疗逻辑
 * }
 * ```
 *
 * 数据驱动的技能实现：
 * ```typescript
 * const skill = {
 *   effects: [
 *     { type: 'damage', target: 'aoe', ... }
 *   ]
 * };
 * executor.execute(skill, source, target);
 * ```
 */

import type { BattleUnit } from "../actors/BattleUnit.js";

// ========== 效果类型 ==========

/**
 * 效果类型枚举
 */
export type EffectType =
  | "damage" // 伤害
  | "heal" // 治疗
  | "buff" // 增益
  | "debuff" // 减益
  | "dispel" // 驱散
  | "summon" // 召唤
  | "teleport"; // 传送

/**
 * 目标类型枚举
 */
export type TargetType =
  | "single" // 单体目标
  | "self" // 自身
  | "aoe" // 以目标为中心的范围
  | "aoe_self" // 以自身为中心的范围
  | "all_enemies" // 所有敌人
  | "all_allies" // 所有友方
  | "random_enemy" // 随机敌人
  | "random_ally" // 随机友方
  | "lowest_hp_ally" // 血量最低的友方
  | "lowest_hp_enemy"; // 血量最低的敌人

/**
 * 伤害类型枚举
 */
export type DamageType = "physical" | "magical" | "true"; // 物理/魔法/真实伤害

// ========== 数值计算 ==========

/**
 * 数值来源类型
 *
 * 支持固定值或基于属性的动态计算
 */
export type ValueSource =
  | { type: "fixed"; value: number }
  | { type: "percent_atk"; percent: number } // 攻击力百分比
  | { type: "percent_max_hp"; percent: number } // 最大生命百分比
  | { type: "percent_current_hp"; percent: number } // 当前生命百分比
  | { type: "percent_missing_hp"; percent: number } // 损失生命百分比
  | { type: "percent_def"; percent: number } // 防御力百分比
  | { type: "formula"; calculate: (source: BattleUnit, target?: BattleUnit) => number };

/**
 * 计算数值
 */
export function calculateValue(
  valueSource: ValueSource,
  source: BattleUnit,
  target?: BattleUnit,
): number {
  switch (valueSource.type) {
    case "fixed":
      return valueSource.value;

    case "percent_atk":
      return Math.floor(source.atk * valueSource.percent);

    case "percent_max_hp":
      return Math.floor(source.maxHp * valueSource.percent);

    case "percent_current_hp":
      return Math.floor(source.hp * valueSource.percent);

    case "percent_missing_hp":
      return Math.floor((source.maxHp - source.hp) * valueSource.percent);

    case "percent_def":
      return Math.floor(source.def * valueSource.percent);

    case "formula":
      return valueSource.calculate(source, target);

    default:
      return 0;
  }
}

// ========== 效果定义 ==========

/**
 * 效果基础接口
 */
interface EffectBase {
  /** 效果类型 */
  type: EffectType;
  /** 目标类型 */
  target: TargetType;
  /** AOE 半径（仅 AOE 类型有效） */
  aoeRadius?: number;
  /** 效果描述（用于 UI） */
  description?: string;
}

/**
 * 伤害效果
 */
export interface DamageEffect extends EffectBase {
  type: "damage";
  /** 伤害数值来源 */
  value: ValueSource;
  /** 伤害类型 */
  damageType: DamageType;
  /** 是否可暴击 */
  canCrit: boolean;
  /** 额外暴击率加成 */
  bonusCritRate?: number;
  /** 额外暴击伤害加成 */
  bonusCritDamage?: number;
  /** 穿透防御百分比（0-1） */
  armorPenetration?: number;
}

/**
 * 治疗效果
 */
export interface HealEffect extends EffectBase {
  type: "heal";
  /** 治疗数值来源 */
  value: ValueSource;
  /** 是否可暴击治疗 */
  canCrit?: boolean;
}

/**
 * Buff/Debuff 效果
 */
export interface BuffEffect extends EffectBase {
  type: "buff" | "debuff";
  /** Buff ID */
  buffId: string;
  /** 持续回合数（-1 表示永久） */
  duration: number;
  /** 层数 */
  stacks?: number;
}

/**
 * 驱散效果
 */
export interface DispelEffect extends EffectBase {
  type: "dispel";
  /** 驱散类型：buff/debuff/all */
  dispelType: "buff" | "debuff" | "all";
  /** 驱散数量（-1 表示全部） */
  count: number;
}

/**
 * 传送效果
 */
export interface TeleportEffect extends EffectBase {
  type: "teleport";
  /** 传送到目标位置 */
  toTarget: boolean;
  /** 传送后的相对偏移 */
  offset?: { x: number; y: number };
}

/**
 * 技能效果联合类型
 */
export type SkillEffect =
  | DamageEffect
  | HealEffect
  | BuffEffect
  | DispelEffect
  | TeleportEffect;

// ========== 技能定义 ==========

/**
 * 技能定义
 *
 * 一个技能可以包含多个效果，按顺序执行
 */
export interface SkillDefinition {
  /** 技能 ID */
  id: string;
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 行动点消耗 */
  actionPointCost: number;
  /** 精力消耗 */
  staminaCost: number;
  /** 冷却回合数 */
  cooldown: number;
  /** 攻击范围（-1 表示使用角色属性） */
  range: number;
  /** 技能效果列表 */
  effects: SkillEffect[];
  /** 技能标签（用于筛选/分类） */
  tags?: string[];
}

// ========== 效果结果 ==========

/**
 * 单个效果的执行结果
 */
export interface EffectResult {
  /** 效果类型 */
  effectType: EffectType;
  /** 目标 ID */
  targetId: string;
  /** 是否成功 */
  success: boolean;
  /** 伤害/治疗数值 */
  value?: number;
  /** 是否暴击 */
  isCrit?: boolean;
  /** 目标是否死亡 */
  targetDied?: boolean;
  /** 额外信息 */
  extra?: Record<string, unknown>;
}

/**
 * 技能执行结果
 */
export interface SkillExecutionResult {
  /** 技能 ID */
  skillId: string;
  /** 执行者 ID */
  sourceId: string;
  /** 主目标 ID */
  primaryTargetId?: string;
  /** 是否成功执行 */
  success: boolean;
  /** 各效果的执行结果 */
  effectResults: EffectResult[];
}

// ========== 辅助函数 ==========

/**
 * 创建伤害效果
 */
export function createDamageEffect(
  target: TargetType,
  value: ValueSource,
  options?: Partial<Omit<DamageEffect, "type" | "target" | "value">>,
): DamageEffect {
  return {
    type: "damage",
    target,
    value,
    damageType: options?.damageType ?? "physical",
    canCrit: options?.canCrit ?? true,
    bonusCritRate: options?.bonusCritRate,
    bonusCritDamage: options?.bonusCritDamage,
    armorPenetration: options?.armorPenetration,
    aoeRadius: options?.aoeRadius,
    description: options?.description,
  };
}

/**
 * 创建治疗效果
 */
export function createHealEffect(
  target: TargetType,
  value: ValueSource,
  options?: Partial<Omit<HealEffect, "type" | "target" | "value">>,
): HealEffect {
  return {
    type: "heal",
    target,
    value,
    canCrit: options?.canCrit,
    aoeRadius: options?.aoeRadius,
    description: options?.description,
  };
}

/**
 * 创建 Buff 效果
 */
export function createBuffEffect(
  target: TargetType,
  buffId: string,
  duration: number,
  options?: Partial<Omit<BuffEffect, "type" | "target" | "buffId" | "duration">>,
): BuffEffect {
  return {
    type: "buff",
    target,
    buffId,
    duration,
    stacks: options?.stacks ?? 1,
    aoeRadius: options?.aoeRadius,
    description: options?.description,
  };
}

/**
 * 创建百分比攻击力伤害值
 */
export function percentAtk(percent: number): ValueSource {
  return { type: "percent_atk", percent };
}

/**
 * 创建固定数值
 */
export function fixedValue(value: number): ValueSource {
  return { type: "fixed", value };
}

/**
 * 创建百分比最大生命值
 */
export function percentMaxHp(percent: number): ValueSource {
  return { type: "percent_max_hp", percent };
}
