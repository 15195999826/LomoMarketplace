/**
 * TypeSystem - 类型相克系统
 *
 * 计算属性相克倍率和 STAB 加成
 */

import type { Element } from '@inkmon/core';
import {
  TYPE_CHART,
  type TypeMultiplier,
  type EffectivenessLevel,
  getEffectivenessLevel,
} from '../types/TypeEffectiveness.js';

/**
 * STAB 加成倍率 (Same Type Attack Bonus)
 */
const STAB_MULTIPLIER = 1.5;

/**
 * TypeSystem - 类型相克系统
 */
export class TypeSystem {
  /**
   * 计算单个属性对防御方的倍率
   */
  static getTypeMultiplier(
    attackElement: Element,
    defenseElement: Element
  ): TypeMultiplier {
    return TYPE_CHART[attackElement][defenseElement];
  }

  /**
   * 计算攻击属性对防御方的总倍率
   *
   * @param attackElement 攻击属性
   * @param defenderElements 防御方属性列表
   * @returns 最终倍率 (双属性时相乘)
   */
  static calculateMultiplier(
    attackElement: Element,
    defenderElements: Element[]
  ): number {
    if (defenderElements.length === 0) {
      return 1;
    }

    let multiplier = 1;
    for (const defElement of defenderElements) {
      multiplier *= TYPE_CHART[attackElement][defElement];
    }

    return multiplier;
  }

  /**
   * 获取相克效果级别
   */
  static getEffectiveness(multiplier: number): EffectivenessLevel {
    return getEffectivenessLevel(multiplier);
  }

  /**
   * 计算 STAB (Same Type Attack Bonus) 倍率
   *
   * @param attackerElements 攻击者的属性列表
   * @param skillElement 技能的属性
   * @returns 1.5 如果匹配, 否则 1.0
   */
  static getSTABMultiplier(
    attackerElements: Element[],
    skillElement: Element
  ): number {
    return attackerElements.includes(skillElement) ? STAB_MULTIPLIER : 1.0;
  }

  /**
   * 判断是否有 STAB 加成
   */
  static hasSTAB(attackerElements: Element[], skillElement: Element): boolean {
    return attackerElements.includes(skillElement);
  }

  /**
   * 获取属性对另一属性的优势/劣势列表
   *
   * @param element 要查询的属性
   * @returns 强克制和被克制的属性列表
   */
  static getTypeRelations(element: Element): {
    strongAgainst: Element[];
    weakAgainst: Element[];
    immuneTo: Element[];
  } {
    const strongAgainst: Element[] = [];
    const weakAgainst: Element[] = [];
    const immuneTo: Element[] = [];

    const allElements = Object.keys(TYPE_CHART) as Element[];

    for (const target of allElements) {
      const mult = TYPE_CHART[element][target];
      if (mult >= 2) {
        strongAgainst.push(target);
      } else if (mult === 0) {
        immuneTo.push(target);
      } else if (mult < 1) {
        weakAgainst.push(target);
      }
    }

    return { strongAgainst, weakAgainst, immuneTo };
  }

  /**
   * 获取属性的中文名称
   */
  static getElementName(element: Element): string {
    const names: Record<Element, string> = {
      fire: '火',
      water: '水',
      grass: '草',
      electric: '电',
      ice: '冰',
      rock: '岩',
      ground: '地',
      flying: '飞',
      bug: '虫',
      poison: '毒',
      dark: '暗',
      light: '光',
      steel: '钢',
      dragon: '龙',
    };
    return names[element] ?? element;
  }
}
