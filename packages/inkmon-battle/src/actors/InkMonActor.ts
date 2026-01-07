/**
 * InkMonActor - InkMon 战斗单位 Actor
 *
 * 基于 logic-game-framework 的 Actor 基类，整合：
 * - AttributeSet：属性管理（hp, atk, def, spAtk, spDef, speed）
 * - AbilitySet：技能和 Buff 管理
 * - IRecordableActor：支持战斗录像
 *
 * ## 架构说明
 *
 * 遵循 hex-atb-battle 的架构风格：
 * - 使用 defineAttributes 创建 AttributeSet
 * - 使用 BattleAbilitySet 管理技能
 * - ATB 系统基于 speed 属性累积
 */

import {
  Actor,
  defineAttributes,
  type AttributeSet,
  type AttributeDefConfig,
} from '@lomo/logic-game-framework';

import type { IRecordableActor, IAbilityInitData, IRecordingContext } from '@lomo/logic-game-framework/stdlib';
import { recordAttributeChanges, recordAbilitySetChanges } from '@lomo/logic-game-framework/stdlib';

import type { AxialCoord } from '@lomo/hex-grid';
import type { InkMon, Element } from '@inkmon/core';

import { InkMonAbilitySet, createInkMonAbilitySet } from '../abilities/InkMonAbilitySet.js';
import type { IATBUnit } from '../atb/index.js';

// ========== 属性定义 ==========

/** InkMon 属性定义（用于 defineAttributes） */
export const INKMON_ATTRIBUTES = {
  hp: { baseValue: 100, minValue: 0 },
  maxHp: { baseValue: 100, minValue: 1 },
  atk: { baseValue: 50 },
  def: { baseValue: 50 },
  spAtk: { baseValue: 50 },
  spDef: { baseValue: 50 },
  speed: { baseValue: 50, minValue: 1 },
} as const satisfies Record<string, AttributeDefConfig>;

/** ATB 满值 */
const ATB_FULL = 100;

// ========== InkMonActor ==========

/**
 * InkMon 战斗单位配置
 */
export type InkMonActorConfig = {
  /** InkMon 数据 */
  inkmon: InkMon;
  /** 等级（默认 50） */
  level?: number;
  /** 队伍 */
  team: 'A' | 'B';
  /** 攻击范围（默认 1） */
  attackRange?: number;
};

/**
 * InkMonActor - InkMon 战斗单位
 */
export class InkMonActor extends Actor implements IRecordableActor, IATBUnit {
  readonly type = 'InkMonActor';

  /** 原始 InkMon 数据 */
  readonly inkmon: InkMon;

  /** 等级 */
  readonly level: number;

  /** 主属性 */
  readonly primaryElement: Element;

  /** 副属性 */
  readonly secondaryElement: Element | null;

  /** 属性集 */
  readonly attributeSet: AttributeSet<typeof INKMON_ATTRIBUTES>;

  /** 能力集 */
  readonly abilitySet: InkMonAbilitySet;

  /** ATB 条当前值 */
  private _atbGauge: number = 0;

  /** 是否正在行动 */
  isActing: boolean = false;

  /** 六边形位置 */
  private _hexPosition?: AxialCoord;

  /** 攻击范围 */
  readonly attackRange: number;

  constructor(config: InkMonActorConfig) {
    super();

    this.inkmon = config.inkmon;
    this.level = config.level ?? 50;
    this.primaryElement = config.inkmon.elements.primary;
    this.secondaryElement = config.inkmon.elements.secondary;
    this.attackRange = config.attackRange ?? 1;

    // 设置队伍和显示名称
    this._team = config.team;
    this._displayName = config.inkmon.name;

    // 创建属性集
    this.attributeSet = defineAttributes(INKMON_ATTRIBUTES);

    // 计算并设置属性
    const stats = this.calculateStats(config.inkmon);
    this.attributeSet.setMaxHpBase(stats.maxHp);
    this.attributeSet.setHpBase(stats.hp);
    this.attributeSet.setAtkBase(stats.atk);
    this.attributeSet.setDefBase(stats.def);
    this.attributeSet.setSpAtkBase(stats.spAtk);
    this.attributeSet.setSpDefBase(stats.spDef);
    this.attributeSet.setSpeedBase(stats.speed);

    // 创建能力集
    this.abilitySet = createInkMonAbilitySet(
      this.toRef(),
      this.attributeSet._modifierTarget
    );
  }

  /**
   * 计算 InkMon 的战斗属性
   *
   * HP 公式: (2 * Base * Level / 100) + Level + 10
   * 其他属性直接使用基础值
   */
  private calculateStats(inkmon: InkMon): {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    spAtk: number;
    spDef: number;
    speed: number;
  } {
    const level = this.level;
    const hp = Math.floor((2 * inkmon.stats.hp * level) / 100) + level + 10;

    return {
      hp,
      maxHp: hp,
      atk: inkmon.stats.attack,
      def: inkmon.stats.defense,
      spAtk: inkmon.stats.sp_attack,
      spDef: inkmon.stats.sp_defense,
      speed: inkmon.stats.speed,
    };
  }

  // ========== 配置 ID（用于回放） ==========

  get configId(): string {
    return this.inkmon.name_en;
  }

  // ========== 属性快捷访问 ==========

  /** 当前 HP */
  get hp(): number {
    return this.attributeSet.hp;
  }

  /** 最大 HP */
  get maxHp(): number {
    return this.attributeSet.maxHp;
  }

  /** 物理攻击 */
  get atk(): number {
    return this.attributeSet.atk;
  }

  /** 物理防御 */
  get def(): number {
    return this.attributeSet.def;
  }

  /** 特殊攻击 */
  get spAtk(): number {
    return this.attributeSet.spAtk;
  }

  /** 特殊防御 */
  get spDef(): number {
    return this.attributeSet.spDef;
  }

  /** 速度 */
  get speed(): number {
    return this.attributeSet.speed;
  }

  // ========== ATB 系统 ==========

  /** 获取 ATB 值 */
  get atbGauge(): number {
    return this._atbGauge;
  }

  /** 设置 ATB 值 */
  set atbGauge(value: number) {
    this._atbGauge = value;
  }

  /** 累积 ATB（按速度） */
  accumulateATB(dt: number): void {
    // 速度 100 时，1000ms 充满
    this._atbGauge += (this.speed / 1000) * dt;
  }

  /** 是否可以行动 */
  get canAct(): boolean {
    return this._atbGauge >= ATB_FULL && !this.isActing;
  }

  /** 重置 ATB */
  resetATB(): void {
    this._atbGauge = 0;
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

  /** 获取六边形位置 */
  get hexPosition(): AxialCoord | undefined {
    return this._hexPosition;
  }

  /**
   * 设置位置
   */
  setPosition(coord: AxialCoord): void {
    this._hexPosition = coord;
  }

  /**
   * 清除位置
   */
  clearPosition(): void {
    this._hexPosition = undefined;
  }

  // ========== 战斗相关 ==========

  /**
   * 受到伤害
   * @returns 实际伤害值
   */
  takeDamage(damage: number): number {
    const currentHp = this.hp;
    const actualDamage = Math.min(currentHp, Math.max(0, Math.floor(damage)));

    this.attributeSet.modifyBase('hp', -actualDamage);

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

    this.attributeSet.modifyBase('hp', actualHeal);
    return actualHeal;
  }

  // ========== IRecordableActor 实现 ==========

  /** 获取属性快照 */
  getAttributeSnapshot(): Record<string, number> {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      atk: this.atk,
      def: this.def,
      spAtk: this.spAtk,
      spDef: this.spDef,
      speed: this.speed,
    };
  }

  /** 获取 Ability 快照 */
  getAbilitySnapshot(): IAbilityInitData[] {
    return this.abilitySet.getAbilities().map((ability) => ({
      instanceId: ability.id,
      configId: ability.configId,
    }));
  }

  /** 获取 Tag 快照 */
  getTagSnapshot(): Record<string, number> {
    const tags: Record<string, number> = {};
    for (const [tag, count] of this.abilitySet.getAllTags()) {
      tags[tag] = count;
    }
    return tags;
  }

  /**
   * 设置录像订阅
   */
  setupRecording(ctx: IRecordingContext): (() => void)[] {
    return [
      recordAttributeChanges(this.attributeSet, ctx),
      ...recordAbilitySetChanges(this.abilitySet, ctx),
    ];
  }

  // ========== 序列化 ==========

  serialize(): object {
    return {
      ...this.serializeBase(),
      inkmonNameEn: this.inkmon.name_en,
      level: this.level,
      primaryElement: this.primaryElement,
      secondaryElement: this.secondaryElement,
      atbGauge: this._atbGauge,
      isActing: this.isActing,
      hexPosition: this._hexPosition,
      attributes: this.getAttributeSnapshot(),
    };
  }
}

// ========== 工厂函数 ==========

/**
 * 创建 InkMon 战斗单位
 */
export function createInkMonActor(
  inkmon: InkMon,
  team: 'A' | 'B',
  options?: { level?: number; attackRange?: number }
): InkMonActor {
  return new InkMonActor({
    inkmon,
    team,
    level: options?.level,
    attackRange: options?.attackRange,
  });
}
