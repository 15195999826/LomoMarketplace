/**
 * InkMonUnit - InkMon 战斗单位
 *
 * 继承自 Actor，整合 RawAttributeSet 管理属性
 */

import { Actor, RawAttributeSet } from '@lomo/logic-game-framework';
import type { AxialCoord } from '@lomo/hex-grid';
import type { InkMon, Element } from '@inkmon/core';
import type { IATBUnit } from './atb/index.js';

/**
 * InkMon 战斗单位配置
 */
export type InkMonUnitConfig = {
  /** InkMon 数据 */
  inkmon: InkMon;
  /** 等级（默认 50） */
  level?: number;
  /** 队伍 */
  team: 'A' | 'B';
  /** 初始位置 */
  position?: AxialCoord;
};

/**
 * 属性名称常量
 */
export const ATTR = {
  MAX_HP: 'maxHp',
  HP: 'hp',
  ATK: 'atk',
  DEF: 'def',
  SP_ATK: 'spAtk',
  SP_DEF: 'spDef',
  SPEED: 'speed',
} as const;

/**
 * InkMon 战斗单位
 *
 * 属性映射：
 * - hp -> maxHp (直接使用)
 * - attack -> atk (物理攻击)
 * - defense -> def (物理防御)
 * - sp_attack -> spAtk (特殊攻击)
 * - sp_defense -> spDef (特殊防御)
 * - speed -> speed (ATB 速度)
 */
export class InkMonUnit extends Actor implements IATBUnit {
  readonly type = 'InkMonUnit';

  /** 原始 InkMon 数据 */
  readonly inkmon: InkMon;

  /** 等级 */
  readonly level: number;

  /** 主属性 */
  readonly primaryElement: Element;

  /** 副属性 */
  readonly secondaryElement: Element | null;

  /** 属性集 */
  readonly attributes: RawAttributeSet;

  /** ATB 条当前值 */
  atbGauge: number = 0;

  /** 是否正在行动 */
  isActing: boolean = false;

  /** 六边形位置 */
  hexPosition?: AxialCoord;

  /** 攻击范围（默认 1 格） */
  readonly attackRange: number = 1;

  constructor(config: InkMonUnitConfig) {
    super();
    // ID 由 Actor 基类延迟生成，格式: type_N

    this.inkmon = config.inkmon;
    this.level = config.level ?? 50;
    this.primaryElement = config.inkmon.elements.primary;
    this.secondaryElement = config.inkmon.elements.secondary;
    this.hexPosition = config.position;

    // 设置队伍和显示名称
    this._team = config.team;
    this._displayName = config.inkmon.name;

    // 计算 HP（考虑等级）
    const calculatedHp = this.calculateHp(config.inkmon.stats.hp);

    // 初始化属性集
    this.attributes = new RawAttributeSet([
      { name: ATTR.MAX_HP, baseValue: calculatedHp },
      { name: ATTR.HP, baseValue: calculatedHp, minValue: 0, maxValue: calculatedHp },
      { name: ATTR.ATK, baseValue: config.inkmon.stats.attack },
      { name: ATTR.DEF, baseValue: config.inkmon.stats.defense },
      { name: ATTR.SP_ATK, baseValue: config.inkmon.stats.sp_attack },
      { name: ATTR.SP_DEF, baseValue: config.inkmon.stats.sp_defense },
      { name: ATTR.SPEED, baseValue: config.inkmon.stats.speed },
    ]);
  }

  /**
   * 计算 HP（考虑等级）
   * 简化公式: HP = (2 * Base * Level / 100) + Level + 10
   */
  private calculateHp(baseHp: number): number {
    return Math.floor((2 * baseHp * this.level) / 100) + this.level + 10;
  }

  // ========== 属性快捷访问 ==========

  /** 当前 HP */
  get hp(): number {
    return this.attributes.getCurrentValue(ATTR.HP);
  }

  /** 最大 HP */
  get maxHp(): number {
    return this.attributes.getCurrentValue(ATTR.MAX_HP);
  }

  /** 物理攻击 */
  get atk(): number {
    return this.attributes.getCurrentValue(ATTR.ATK);
  }

  /** 物理防御 */
  get def(): number {
    return this.attributes.getCurrentValue(ATTR.DEF);
  }

  /** 特殊攻击 */
  get spAtk(): number {
    return this.attributes.getCurrentValue(ATTR.SP_ATK);
  }

  /** 特殊防御 */
  get spDef(): number {
    return this.attributes.getCurrentValue(ATTR.SP_DEF);
  }

  /** 速度 */
  get speed(): number {
    return this.attributes.getCurrentValue(ATTR.SPEED);
  }

  // ========== 战斗相关 ==========

  /**
   * 受到伤害
   * @returns 实际伤害值
   */
  takeDamage(damage: number): number {
    const currentHp = this.hp;
    const actualDamage = Math.min(currentHp, Math.max(0, Math.floor(damage)));

    this.attributes.setBase(ATTR.HP, currentHp - actualDamage);

    // 检查死亡
    if (this.hp <= 0) {
      this.onDeath();
    }

    return actualDamage;
  }

  /**
   * 恢复 HP
   * @returns 实际恢复量
   */
  heal(amount: number): number {
    const currentHp = this.hp;
    const maxHp = this.maxHp;
    const actualHeal = Math.min(maxHp - currentHp, Math.max(0, Math.floor(amount)));

    this.attributes.setBase(ATTR.HP, currentHp + actualHeal);
    return actualHeal;
  }

  // ========== 元素相关 ==========

  /**
   * 获取所有元素类型
   */
  getElements(): Element[] {
    const elements: Element[] = [this.primaryElement];
    if (this.secondaryElement) {
      elements.push(this.secondaryElement);
    }
    return elements;
  }

  /**
   * 是否有指定元素
   */
  hasElement(element: Element): boolean {
    return this.primaryElement === element || this.secondaryElement === element;
  }

  // ========== 位置相关 ==========

  /**
   * 设置位置
   */
  setPosition(coord: AxialCoord): void {
    this.hexPosition = coord;
  }

  /**
   * 清除位置
   */
  clearPosition(): void {
    this.hexPosition = undefined;
  }

  // ========== 序列化 ==========

  serialize(): object {
    return {
      ...this.serializeBase(),
      inkmonNameEn: this.inkmon.name_en,
      level: this.level,
      atbGauge: this.atbGauge,
      isActing: this.isActing,
      hexPosition: this.hexPosition,
      hp: this.hp,
      maxHp: this.maxHp,
    };
  }
}

/**
 * 创建 InkMon 战斗单位的工厂函数
 */
export function createInkMonUnit(
  inkmon: InkMon,
  team: 'A' | 'B',
  options?: { level?: number; position?: AxialCoord }
): InkMonUnit {
  return new InkMonUnit({
    inkmon,
    team,
    level: options?.level,
    position: options?.position,
  });
}
