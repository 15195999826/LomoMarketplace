/**
 * InkMonUnit - InkMon 战斗单位
 *
 * 将 InkMon 数据转换为战斗单位
 */

import { BattleUnit, type BattleUnitConfig } from '@lomo/logic-game-framework';
import type { AxialCoord } from '@lomo/hex-grid';
import type { InkMon, Element } from '@inkmon/core';
import type { IATBUnit } from './atb/index.js';

/**
 * InkMon 战斗单位配置
 */
export interface InkMonUnitConfig {
  /** InkMon 数据 */
  inkmon: InkMon;
  /** 等级（默认 50） */
  level?: number;
  /** 队伍 */
  team: 'A' | 'B';
  /** 初始位置 */
  position?: AxialCoord;
}

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
export class InkMonUnit extends BattleUnit implements IATBUnit {
  // @ts-expect-error - Override parent type
  readonly type = 'InkMonUnit';

  /** 原始 InkMon 数据 */
  readonly inkmon: InkMon;

  /** 等级 */
  readonly level: number;

  /** 主属性 */
  readonly primaryElement: Element;

  /** 副属性 */
  readonly secondaryElement: Element | null;

  /** ATB 条当前值 */
  atbGauge: number = 0;

  /** 是否正在行动 */
  isActing: boolean = false;

  /** 六边形位置 */
  hexPosition?: AxialCoord;

  /** 攻击范围（默认 1 格） */
  readonly attackRange: number = 1;

  constructor(config: InkMonUnitConfig) {
    const battleConfig: BattleUnitConfig = {
      id: `inkmon_${config.inkmon.name_en}_${Date.now()}`,
      name: config.inkmon.name,
      team: config.team,
      stats: {
        maxHp: config.inkmon.stats.hp,
        hp: config.inkmon.stats.hp,
        atk: config.inkmon.stats.attack,
        def: config.inkmon.stats.defense,
        spAtk: config.inkmon.stats.sp_attack,
        spDef: config.inkmon.stats.sp_defense,
        speed: config.inkmon.stats.speed,
      },
    };

    super(battleConfig);

    this.inkmon = config.inkmon;
    this.level = config.level ?? 50;
    this.primaryElement = config.inkmon.elements.primary;
    this.secondaryElement = config.inkmon.elements.secondary;
    this.hexPosition = config.position;
  }

  // ========== 属性快捷访问 ==========

  /** 特攻 */
  get spAtk(): number {
    return this.attributes.getCurrentValue('spAtk');
  }

  /** 特防 */
  get spDef(): number {
    return this.attributes.getCurrentValue('spDef');
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
      ...super.serialize(),
      inkmonNameEn: this.inkmon.name_en,
      level: this.level,
      atbGauge: this.atbGauge,
      isActing: this.isActing,
      hexPosition: this.hexPosition,
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
