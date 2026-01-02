/**
 * TypeEffectiveness - 属性相克表
 *
 * 14 种属性的相克关系 (Pokemon 风格)
 */

import type { Element } from '@inkmon/core';

/**
 * 相克倍率类型
 * - 2.0: 超有效 (super effective)
 * - 1.0: 普通 (neutral)
 * - 0.5: 不太有效 (not very effective)
 * - 0.0: 无效 (immune)
 */
export type TypeMultiplier = 0 | 0.5 | 1 | 2;

/**
 * 属性相克表
 * TYPE_CHART[攻击属性][防御属性] = 倍率
 *
 * 14 属性: fire, water, grass, electric, ice, rock, ground, flying, bug, poison, dark, light, steel, dragon
 */
export const TYPE_CHART: Record<Element, Record<Element, TypeMultiplier>> = {
  // 火系
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    electric: 1,
    ice: 2,
    rock: 0.5,
    ground: 1,
    flying: 1,
    bug: 2,
    poison: 1,
    dark: 1,
    light: 1,
    steel: 2,
    dragon: 0.5,
  },
  // 水系
  water: {
    fire: 2,
    water: 0.5,
    grass: 0.5,
    electric: 1,
    ice: 1,
    rock: 2,
    ground: 2,
    flying: 1,
    bug: 1,
    poison: 1,
    dark: 1,
    light: 1,
    steel: 1,
    dragon: 0.5,
  },
  // 草系
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    electric: 1,
    ice: 1,
    rock: 2,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    poison: 0.5,
    dark: 1,
    light: 1,
    steel: 0.5,
    dragon: 0.5,
  },
  // 电系
  electric: {
    fire: 1,
    water: 2,
    grass: 0.5,
    electric: 0.5,
    ice: 1,
    rock: 1,
    ground: 0, // 免疫
    flying: 2,
    bug: 1,
    poison: 1,
    dark: 1,
    light: 1,
    steel: 1,
    dragon: 0.5,
  },
  // 冰系
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    electric: 1,
    ice: 0.5,
    rock: 1,
    ground: 2,
    flying: 2,
    bug: 1,
    poison: 1,
    dark: 1,
    light: 1,
    steel: 0.5,
    dragon: 2,
  },
  // 岩石系
  rock: {
    fire: 2,
    water: 1,
    grass: 1,
    electric: 1,
    ice: 2,
    rock: 1,
    ground: 0.5,
    flying: 2,
    bug: 2,
    poison: 1,
    dark: 1,
    light: 1,
    steel: 0.5,
    dragon: 1,
  },
  // 地面系
  ground: {
    fire: 2,
    water: 1,
    grass: 0.5,
    electric: 2,
    ice: 1,
    rock: 2,
    ground: 1,
    flying: 0, // 免疫
    bug: 0.5,
    poison: 2,
    dark: 1,
    light: 1,
    steel: 2,
    dragon: 1,
  },
  // 飞行系
  flying: {
    fire: 1,
    water: 1,
    grass: 2,
    electric: 0.5,
    ice: 1,
    rock: 0.5,
    ground: 1,
    flying: 1,
    bug: 2,
    poison: 1,
    dark: 1,
    light: 1,
    steel: 0.5,
    dragon: 1,
  },
  // 虫系
  bug: {
    fire: 0.5,
    water: 1,
    grass: 2,
    electric: 1,
    ice: 1,
    rock: 1,
    ground: 1,
    flying: 0.5,
    bug: 1,
    poison: 0.5,
    dark: 2,
    light: 0.5,
    steel: 0.5,
    dragon: 1,
  },
  // 毒系
  poison: {
    fire: 1,
    water: 1,
    grass: 2,
    electric: 1,
    ice: 1,
    rock: 0.5,
    ground: 0.5,
    flying: 1,
    bug: 1,
    poison: 0.5,
    dark: 1,
    light: 1,
    steel: 0, // 免疫
    dragon: 1,
  },
  // 暗系
  dark: {
    fire: 1,
    water: 1,
    grass: 1,
    electric: 1,
    ice: 1,
    rock: 1,
    ground: 1,
    flying: 1,
    bug: 1,
    poison: 1,
    dark: 0.5,
    light: 2,
    steel: 1,
    dragon: 1,
  },
  // 光系
  light: {
    fire: 1,
    water: 1,
    grass: 1,
    electric: 1,
    ice: 1,
    rock: 1,
    ground: 1,
    flying: 1,
    bug: 1,
    poison: 1,
    dark: 2,
    light: 0.5,
    steel: 1,
    dragon: 1,
  },
  // 钢系
  steel: {
    fire: 0.5,
    water: 0.5,
    grass: 1,
    electric: 0.5,
    ice: 2,
    rock: 2,
    ground: 1,
    flying: 1,
    bug: 1,
    poison: 1,
    dark: 1,
    light: 1,
    steel: 0.5,
    dragon: 1,
  },
  // 龙系
  dragon: {
    fire: 1,
    water: 1,
    grass: 1,
    electric: 1,
    ice: 1,
    rock: 1,
    ground: 1,
    flying: 1,
    bug: 1,
    poison: 1,
    dark: 1,
    light: 1,
    steel: 0.5,
    dragon: 2,
  },
};

/**
 * 相克效果描述
 */
export type EffectivenessLevel =
  | 'super_effective'
  | 'neutral'
  | 'not_very_effective'
  | 'immune';

/**
 * 根据倍率获取效果描述
 */
export function getEffectivenessLevel(multiplier: number): EffectivenessLevel {
  if (multiplier === 0) return 'immune';
  if (multiplier >= 2) return 'super_effective';
  if (multiplier < 1) return 'not_very_effective';
  return 'neutral';
}

/**
 * 获取效果描述的中文文本
 */
export function getEffectivenessText(level: EffectivenessLevel): string {
  switch (level) {
    case 'super_effective':
      return '效果拔群!';
    case 'not_very_effective':
      return '效果不佳';
    case 'immune':
      return '无效';
    case 'neutral':
    default:
      return '';
  }
}
