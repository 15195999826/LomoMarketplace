/**
 * 单位配置 - 定义角色职业和属性
 *
 * 回合制自走棋战斗系统：
 * - 每回合开始时，所有角色按速度排序
 * - 每个角色有行动点（ActionPoint），可在一回合内执行多次行动
 * - 精力（Stamina）系统：移动消耗精力，精力耗尽无法移动
 */

import type { AttributeDefConfig } from '@lomo/logic-game-framework';

// ========== 类型定义 ==========

/**
 * 职业类型
 */
export type UnitClass =
  | 'Warrior'    // 战士：高HP、高防御，近战
  | 'Archer'     // 弓箭手：远程攻击，中等属性
  | 'Mage'       // 法师：高攻击、低HP，远程AOE
  | 'Priest'     // 牧师：治疗能力，低攻击
  | 'Assassin'   // 刺客：高速、高暴击，低HP
  | 'Knight';    // 骑士：高机动性，均衡属性

/**
 * 技能类型
 */
export type SkillType =
  | 'NormalAttack'    // 普通攻击
  | 'HeavyStrike'     // 重击（战士）
  | 'PrecisionShot'   // 精准射击（弓箭手）
  | 'Fireball'        // 火球术（法师）
  | 'Heal'            // 治疗（牧师）
  | 'Backstab'        // 背刺（刺客）
  | 'Charge'          // 冲锋（骑士）
  | 'Move'            // 移动
  | 'Idle';           // 待机（结束回合）

// ========== 属性定义 ==========

/**
 * 角色属性定义（用于 defineAttributes）
 *
 * 回合制战斗属性：
 * - hp/maxHp: 生命值
 * - atk: 攻击力
 * - def: 防御力
 * - speed: 速度（决定行动顺序）
 * - actionPoint/maxActionPoint: 行动点（每回合可执行的行动次数）
 * - stamina/maxStamina: 精力（移动消耗）
 * - staminaCost: 已消耗精力
 */
export const UNIT_ATTRIBUTES = {
  hp: { baseValue: 100, minValue: 0 },
  maxHp: { baseValue: 100, minValue: 1 },
  atk: { baseValue: 50 },
  def: { baseValue: 30 },
  speed: { baseValue: 100 },
  actionPoint: { baseValue: 2, minValue: 0 },
  maxActionPoint: { baseValue: 2, minValue: 1 },
  stamina: { baseValue: 3, minValue: 0 },
  maxStamina: { baseValue: 3, minValue: 1 },
  staminaCost: { baseValue: 0, minValue: 0 },
  critRate: { baseValue: 0.05, minValue: 0, maxValue: 1 },      // 暴击率 5%
  critDamage: { baseValue: 1.5, minValue: 1 },                   // 暴击伤害 150%
  moveRange: { baseValue: 3, minValue: 1 },                      // 移动范围
  attackRange: { baseValue: 1, minValue: 1 },                    // 攻击范围
} as const satisfies Record<string, AttributeDefConfig>;

/**
 * 单位属性快照类型
 */
export type UnitStats = {
  [K in keyof typeof UNIT_ATTRIBUTES]: number;
};

// ========== 职业配置 ==========

/**
 * 职业配置项
 */
export interface UnitClassConfig {
  /** 显示名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 基础属性 */
  stats: Partial<UnitStats>;
  /** 默认技能 */
  defaultSkill: SkillType;
  /** 攻击类型 */
  attackType: 'melee' | 'ranged';
}

/**
 * 职业配置表
 */
export const UNIT_CLASS_CONFIGS: Record<UnitClass, UnitClassConfig> = {
  Warrior: {
    name: '战士',
    description: '近战坦克，高生命值和防御力',
    stats: {
      hp: 150,
      maxHp: 150,
      atk: 45,
      def: 40,
      speed: 80,
      actionPoint: 2,
      maxActionPoint: 2,
      stamina: 3,
      maxStamina: 3,
      critRate: 0.05,
      critDamage: 1.5,
      moveRange: 2,
      attackRange: 1,
    },
    defaultSkill: 'HeavyStrike',
    attackType: 'melee',
  },

  Archer: {
    name: '弓箭手',
    description: '远程物理攻击，平衡的属性',
    stats: {
      hp: 90,
      maxHp: 90,
      atk: 55,
      def: 25,
      speed: 100,
      actionPoint: 2,
      maxActionPoint: 2,
      stamina: 4,
      maxStamina: 4,
      critRate: 0.1,
      critDamage: 1.8,
      moveRange: 3,
      attackRange: 4,
    },
    defaultSkill: 'PrecisionShot',
    attackType: 'ranged',
  },

  Mage: {
    name: '法师',
    description: '远程魔法攻击，高攻击低生命',
    stats: {
      hp: 70,
      maxHp: 70,
      atk: 80,
      def: 15,
      speed: 90,
      actionPoint: 2,
      maxActionPoint: 2,
      stamina: 2,
      maxStamina: 2,
      critRate: 0.05,
      critDamage: 2.0,
      moveRange: 2,
      attackRange: 3,
    },
    defaultSkill: 'Fireball',
    attackType: 'ranged',
  },

  Priest: {
    name: '牧师',
    description: '治疗支援，可恢复队友生命',
    stats: {
      hp: 80,
      maxHp: 80,
      atk: 30,
      def: 20,
      speed: 95,
      actionPoint: 2,
      maxActionPoint: 2,
      stamina: 3,
      maxStamina: 3,
      critRate: 0.02,
      critDamage: 1.5,
      moveRange: 3,
      attackRange: 3,
    },
    defaultSkill: 'Heal',
    attackType: 'ranged',
  },

  Assassin: {
    name: '刺客',
    description: '高速高暴击，擅长偷袭',
    stats: {
      hp: 75,
      maxHp: 75,
      atk: 60,
      def: 20,
      speed: 140,
      actionPoint: 3,
      maxActionPoint: 3,
      stamina: 5,
      maxStamina: 5,
      critRate: 0.25,
      critDamage: 2.5,
      moveRange: 4,
      attackRange: 1,
    },
    defaultSkill: 'Backstab',
    attackType: 'melee',
  },

  Knight: {
    name: '骑士',
    description: '高机动性，可冲锋攻击',
    stats: {
      hp: 120,
      maxHp: 120,
      atk: 50,
      def: 35,
      speed: 110,
      actionPoint: 2,
      maxActionPoint: 2,
      stamina: 6,
      maxStamina: 6,
      critRate: 0.08,
      critDamage: 1.6,
      moveRange: 5,
      attackRange: 1,
    },
    defaultSkill: 'Charge',
    attackType: 'melee',
  },
};

// ========== 技能配置 ==========

/**
 * 技能配置项
 */
export interface SkillConfig {
  /** 显示名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 行动点消耗 */
  actionPointCost: number;
  /** 精力消耗（移动用） */
  staminaCost: number;
  /** 冷却回合数 */
  cooldown: number;
  /** 攻击范围（0 表示自身，-1 表示使用角色属性） */
  range: number;
  /** 伤害倍率（基于 ATK） */
  damageMultiplier: number;
  /** 是否是治疗技能 */
  isHeal: boolean;
  /** 是否是AOE */
  isAoe: boolean;
  /** AOE 半径 */
  aoeRadius: number;
}

/**
 * 技能配置表
 */
export const SKILL_CONFIGS: Record<SkillType, SkillConfig> = {
  NormalAttack: {
    name: '普通攻击',
    description: '基础攻击',
    actionPointCost: 1,
    staminaCost: 0,
    cooldown: 0,
    range: -1, // 使用角色攻击范围
    damageMultiplier: 1.0,
    isHeal: false,
    isAoe: false,
    aoeRadius: 0,
  },

  HeavyStrike: {
    name: '重击',
    description: '蓄力重击，造成 150% 伤害',
    actionPointCost: 2,
    staminaCost: 0,
    cooldown: 2,
    range: 1,
    damageMultiplier: 1.5,
    isHeal: false,
    isAoe: false,
    aoeRadius: 0,
  },

  PrecisionShot: {
    name: '精准射击',
    description: '瞄准射击，必定暴击',
    actionPointCost: 2,
    staminaCost: 0,
    cooldown: 3,
    range: 5,
    damageMultiplier: 1.2,
    isHeal: false,
    isAoe: false,
    aoeRadius: 0,
  },

  Fireball: {
    name: '火球术',
    description: '发射火球，造成范围伤害',
    actionPointCost: 2,
    staminaCost: 0,
    cooldown: 2,
    range: 4,
    damageMultiplier: 1.3,
    isHeal: false,
    isAoe: true,
    aoeRadius: 1,
  },

  Heal: {
    name: '治疗术',
    description: '恢复目标 80% 攻击力的生命值',
    actionPointCost: 1,
    staminaCost: 0,
    cooldown: 1,
    range: 3,
    damageMultiplier: 0.8,
    isHeal: true,
    isAoe: false,
    aoeRadius: 0,
  },

  Backstab: {
    name: '背刺',
    description: '偷袭敌人，造成 200% 暴击伤害',
    actionPointCost: 2,
    staminaCost: 1,
    cooldown: 3,
    range: 1,
    damageMultiplier: 2.0,
    isHeal: false,
    isAoe: false,
    aoeRadius: 0,
  },

  Charge: {
    name: '冲锋',
    description: '冲向目标并攻击，移动不消耗精力',
    actionPointCost: 2,
    staminaCost: 0,
    cooldown: 2,
    range: 4,
    damageMultiplier: 1.4,
    isHeal: false,
    isAoe: false,
    aoeRadius: 0,
  },

  Move: {
    name: '移动',
    description: '移动到目标位置',
    actionPointCost: 1,
    staminaCost: 1, // 每格消耗 1 精力
    cooldown: 0,
    range: -1, // 使用角色移动范围
    damageMultiplier: 0,
    isHeal: false,
    isAoe: false,
    aoeRadius: 0,
  },

  Idle: {
    name: '待机',
    description: '结束本回合行动',
    actionPointCost: 0, // 待机不消耗行动点，直接结束回合
    staminaCost: 0,
    cooldown: 0,
    range: 0,
    damageMultiplier: 0,
    isHeal: false,
    isAoe: false,
    aoeRadius: 0,
  },
};

// ========== 工具函数 ==========

/**
 * 获取职业默认属性
 */
export function getClassDefaultStats(unitClass: UnitClass): UnitStats {
  const config = UNIT_CLASS_CONFIGS[unitClass];
  const defaults: UnitStats = {} as UnitStats;

  // 先填充默认值
  for (const [key, def] of Object.entries(UNIT_ATTRIBUTES)) {
    defaults[key as keyof UnitStats] = def.baseValue;
  }

  // 覆盖职业特定值
  for (const [key, value] of Object.entries(config.stats)) {
    if (value !== undefined) {
      defaults[key as keyof UnitStats] = value;
    }
  }

  return defaults;
}

/**
 * 获取技能有效范围
 */
export function getSkillEffectiveRange(
  skill: SkillType,
  attackRange: number,
  moveRange: number
): number {
  const config = SKILL_CONFIGS[skill];

  if (config.range === -1) {
    // 使用角色属性
    return skill === 'Move' ? moveRange : attackRange;
  }

  return config.range;
}
