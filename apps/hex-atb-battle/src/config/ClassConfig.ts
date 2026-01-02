/**
 * 职业配置
 */

import type { AttributeDefConfig } from '@lomo/logic-game-framework';

/** 职业类型 */
export type CharacterClass = 'Priest' | 'Warrior' | 'Archer' | 'Mage' | 'Berserker' | 'Assassin';

/** 角色属性定义（defineAttributes 使用） */
export const CHARACTER_ATTRIBUTES = {
  hp: { baseValue: 100, minValue: 0 },
  maxHp: { baseValue: 100, minValue: 1 },
  atk: { baseValue: 50 },
  def: { baseValue: 30 },
  speed: { baseValue: 100 },
} as const satisfies Record<string, AttributeDefConfig>;

/** 职业属性配置（从属性定义派生，确保一致） */
export type ClassStats = {
  [K in keyof typeof CHARACTER_ATTRIBUTES]: number;
};

/** 职业配置项 */
export type ClassConfigItem = {
  name: string;
  stats: ClassStats;
};

/** 职业配置表 */
export const CLASS_CONFIGS: Record<CharacterClass, ClassConfigItem> = {
  Priest: {
    name: '牧师',
    stats: { hp: 100, maxHp: 100, atk: 30, def: 30, speed: 100 },
  },
  Warrior: {
    name: '战士',
    stats: { hp: 100, maxHp: 100, atk: 50, def: 30, speed: 100 },
  },
  Archer: {
    name: '弓箭手',
    stats: { hp: 100, maxHp: 100, atk: 50, def: 30, speed: 100 },
  },
  Mage: {
    name: '法师',
    stats: { hp: 70, maxHp: 70, atk: 80, def: 20, speed: 70 },
  },
  Berserker: {
    name: '狂战士',
    stats: { hp: 150, maxHp: 150, atk: 70, def: 40, speed: 70 },
  },
  Assassin: {
    name: '刺客',
    stats: { hp: 80, maxHp: 80, atk: 40, def: 25, speed: 140 },
  },
};
