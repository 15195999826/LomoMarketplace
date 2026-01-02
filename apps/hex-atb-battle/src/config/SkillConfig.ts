/**
 * 技能配置
 */

import type { CharacterClass } from './ClassConfig.js';

/** 技能类型 */
export type SkillType = 'HolyHeal' | 'Slash' | 'PreciseShot' | 'Fireball' | 'CrushingBlow' | 'SwiftStrike';

/** 技能配置 */
export type SkillConfig = {
  id: SkillType;
  name: string;
  description: string;
  damage?: number;     // 伤害值
  healAmount?: number; // 治疗量
  range: number;       // 射程（格子数）
  isRanged: boolean;   // 是否远程
};

/** 技能配置表 */
export const SKILL_CONFIGS: Record<SkillType, SkillConfig> = {
  HolyHeal: {
    id: 'HolyHeal',
    name: '圣光治愈',
    description: '治疗友方单位，恢复生命值',
    healAmount: 40,
    range: 3,
    isRanged: true,
  },
  Slash: {
    id: 'Slash',
    name: '横扫斩',
    description: '近战攻击，对敌人造成物理伤害',
    damage: 50,
    range: 1,
    isRanged: false,
  },
  PreciseShot: {
    id: 'PreciseShot',
    name: '精准射击',
    description: '远程攻击，精准命中敌人',
    damage: 45,
    range: 4,
    isRanged: true,
  },
  Fireball: {
    id: 'Fireball',
    name: '火球术',
    description: '远程魔法攻击，造成高额伤害',
    damage: 80,
    range: 5,
    isRanged: true,
  },
  CrushingBlow: {
    id: 'CrushingBlow',
    name: '毁灭重击',
    description: '近战重击，造成毁灭性伤害',
    damage: 90,
    range: 1,
    isRanged: false,
  },
  SwiftStrike: {
    id: 'SwiftStrike',
    name: '疾风连刺',
    description: '快速近战攻击，伤害较低但出手快',
    damage: 30,
    range: 1,
    isRanged: false,
  },
};

/** 职业对应技能映射 */
export const CLASS_SKILLS: Record<CharacterClass, SkillType> = {
  Priest: 'HolyHeal',
  Warrior: 'Slash',
  Archer: 'PreciseShot',
  Mage: 'Fireball',
  Berserker: 'CrushingBlow',
  Assassin: 'SwiftStrike',
};
