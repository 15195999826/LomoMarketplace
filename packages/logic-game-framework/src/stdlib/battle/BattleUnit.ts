/**
 * BattleUnit - 战斗单位
 *
 * Actor 的标准战斗实现
 * 包含属性系统和能力系统
 */

import { Actor } from '../../core/entity/Actor.js';
import { RawAttributeSet, type AttributeConfig } from '../../core/attributes/AttributeSet.js';
import type { Ability } from '../../core/abilities/Ability.js';
import type { IAbilityActor } from '../../core/abilities/AbilitySystem.js';
import type { ComponentLifecycleContext } from '../../core/abilities/AbilityComponent.js';
import { StandardAttributes, BasicUnitAttributeTemplates } from '../attributes/StandardAttributes.js';

/**
 * 战斗单位配置
 */
export type BattleUnitConfig = {
  /** 单位 ID（可选） */
  id?: string;
  /** 显示名称 */
  name?: string;
  /** 所属队伍 */
  team?: string;
  /** 初始属性值 */
  stats?: Partial<Record<string, number>>;
  /** 自定义属性配置 */
  attributeConfigs?: AttributeConfig[];
};

/**
 * BattleUnit
 */
export class BattleUnit extends Actor implements IAbilityActor {
  readonly type: string = 'BattleUnit';

  /** 属性集合 */
  attributes: RawAttributeSet;

  /** 能力列表 */
  abilities: Ability[] = [];

  constructor(config: BattleUnitConfig = {}) {
    super(config.id);

    if (config.name) {
      this.displayName = config.name;
    }
    if (config.team) {
      this.team = config.team;
    }

    // 初始化属性
    if (config.attributeConfigs) {
      this.attributes = new RawAttributeSet(config.attributeConfigs);
    } else {
      // 使用默认属性模板
      this.attributes = new RawAttributeSet(
        BasicUnitAttributeTemplates.map((t) => ({
          name: t.name,
          baseValue: t.defaultBase,
          minValue: t.min,
          maxValue: t.max,
        }))
      );
    }

    // 应用初始属性值
    if (config.stats) {
      for (const [name, value] of Object.entries(config.stats)) {
        if (value !== undefined && this.attributes.hasAttribute(name)) {
          this.attributes.setBase(name, value);
        }
      }
    }
  }

  // ========== 属性快捷访问 ==========

  get hp(): number {
    return this.attributes.getCurrentValue(StandardAttributes.HP);
  }

  get maxHp(): number {
    return this.attributes.getCurrentValue(StandardAttributes.MAX_HP);
  }

  get atk(): number {
    return this.attributes.getCurrentValue(StandardAttributes.ATK);
  }

  get def(): number {
    return this.attributes.getCurrentValue(StandardAttributes.DEF);
  }

  get speed(): number {
    return this.attributes.getCurrentValue(StandardAttributes.SPEED);
  }

  // ========== HP 操作 ==========

  /**
   * 获取 HP 百分比
   */
  get hpPercent(): number {
    const maxHp = this.maxHp;
    return maxHp > 0 ? this.hp / maxHp : 0;
  }

  /**
   * 是否满血
   */
  get isFullHp(): boolean {
    return this.hp >= this.maxHp;
  }

  /**
   * 是否低血量（<30%）
   */
  get isLowHp(): boolean {
    return this.hpPercent < 0.3;
  }

  /**
   * 造成伤害
   * @returns 实际伤害值
   */
  takeDamage(damage: number): number {
    const currentHp = this.attributes.getBase(StandardAttributes.HP);
    const actualDamage = Math.min(damage, currentHp);

    this.attributes.modifyBase(StandardAttributes.HP, -actualDamage);

    // 检查死亡
    if (this.attributes.getBase(StandardAttributes.HP) <= 0) {
      this.onDeath();
    }

    return actualDamage;
  }

  /**
   * 治疗
   * @returns 实际治疗量
   */
  heal(amount: number): number {
    const currentHp = this.attributes.getBase(StandardAttributes.HP);
    const maxHp = this.maxHp;
    const actualHeal = Math.min(amount, maxHp - currentHp);

    if (actualHeal > 0) {
      this.attributes.modifyBase(StandardAttributes.HP, actualHeal);
    }

    return actualHeal;
  }

  // ========== 生命周期 ==========

  onSpawn(): void {
    super.onSpawn();
    // 初始化 HP 为 MaxHP
    const maxHp = this.attributes.getCurrentValue(StandardAttributes.MAX_HP);
    this.attributes.setBase(StandardAttributes.HP, maxHp);
  }

  onDeath(): void {
    super.onDeath();
    // 清理所有非永久 Ability
    this.abilities = this.abilities.filter((a) => a.hasTag('permanent'));
  }

  tick(dt: number): void {
    super.tick(dt);

    // Tick 所有 Ability
    for (const ability of this.abilities) {
      ability.tick(dt);
    }

    // 移除过期的 Ability
    this.abilities = this.abilities.filter((a) => !a.isExpired);
  }

  // ========== 能力管理 ==========

  /**
   * 创建 Component 生命周期上下文
   */
  private createLifecycleContext(ability: Ability): ComponentLifecycleContext {
    return {
      owner: { id: this.id },
      attributes: {
        addModifier: (mod) => this.attributes.addModifier(mod),
        removeModifier: (id) => this.attributes.removeModifier(id),
        removeModifiersBySource: (source) => this.attributes.removeModifiersBySource(source),
        getModifiers: (name) => this.attributes.getModifiers(name),
        hasModifier: (id) => this.attributes.hasModifier(id),
      },
      ability,
    };
  }

  /**
   * 添加能力
   * Ability 激活时会自动应用 Modifier
   */
  addAbility(ability: Ability): void {
    this.abilities.push(ability);

    // 创建上下文并激活（Component 会自动应用 Modifier）
    const context = this.createLifecycleContext(ability);
    ability.activate(context);
  }

  /**
   * 移除能力
   * Ability 过期时会自动移除 Modifier
   */
  removeAbility(abilityId: string): boolean {
    const index = this.abilities.findIndex((a) => a.id === abilityId);
    if (index === -1) {
      return false;
    }

    const ability = this.abilities[index];
    ability.expire(); // 内部会调用 deactivate，自动移除 Modifier
    this.abilities.splice(index, 1);
    return true;
  }

  /**
   * 根据 configId 查找能力
   */
  findAbility(configId: string): Ability | undefined {
    return this.abilities.find((a) => a.configId === configId);
  }

  /**
   * 检查是否有某个能力
   */
  hasAbility(configId: string): boolean {
    return this.abilities.some((a) => a.configId === configId);
  }

  // ========== 序列化 ==========

  serialize(): object {
    return {
      ...this.serializeBase(),
      attributes: this.attributes.serialize(),
      abilities: this.abilities.map((a) => a.serialize()),
    };
  }
}
