/**
 * StatModifierComponent - 属性修改组件
 *
 * 给持有者添加属性修改器
 *
 * Modifier 的应用/移除在 onApply/onRemove 时自动处理，
 * 外部无需手动调用 addModifier。
 */

import {
  BaseAbilityComponent,
  ComponentTypes,
  type ComponentLifecycleContext,
} from '../../core/abilities/AbilityComponent.js';
import { ModifierType, type AttributeModifier } from '../../core/attributes/AttributeModifier.js';
import { generateId } from '../../core/utils/IdGenerator.js';

/**
 * 属性修改配置
 */
export type StatModifierConfig = {
  /** 目标属性名 */
  attributeName: string;
  /** 修改器类型 */
  modifierType: ModifierType;
  /** 修改值 */
  value: number;
};

/**
 * StatModifierComponent
 *
 * @example
 * ```typescript
 * // Component 在 Ability 构造时注入
 * const ability = new Ability({
 *   configId: 'buff_strength',
 *   components: [
 *     new StatModifierComponent([
 *       { attributeName: 'attack', modifierType: ModifierType.AddBase, value: 30 },
 *       { attributeName: 'defense', modifierType: ModifierType.MulBase, value: 0.2 },
 *     ]),
 *   ],
 * }, ownerRef);
 *
 * // 通过 AbilitySet 授予（自动应用效果）
 * abilitySet.grantAbility(ability);
 *
 * // 移除时自动移除 Modifier
 * abilitySet.revokeAbility(ability.id);
 * ```
 */
export class StatModifierComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.STAT_MODIFIER;

  /** 静态配置（构造时确定） */
  private readonly configs: StatModifierConfig[];

  /** Modifier ID 前缀 */
  private readonly modifierPrefix: string;

  /** 当前应用的 Modifier 列表 */
  private appliedModifiers: AttributeModifier[] = [];

  /** 当前缩放倍数（用于层数） */
  private currentScale: number = 1;

  constructor(configs: StatModifierConfig[]) {
    super();
    this.configs = configs;
    this.modifierPrefix = generateId('statmod');
  }

  /**
   * Ability grant 时调用
   * 创建并应用 Modifier 到 owner 的 AttributeSet
   */
  onApply(context: ComponentLifecycleContext): void {
    // 创建 Modifier
    this.appliedModifiers = this.configs.map((config, index) => ({
      id: `${this.modifierPrefix}_${index}`,
      attributeName: config.attributeName,
      modifierType: config.modifierType,
      value: config.value * this.currentScale,
      source: context.ability.id,
    }));

    // 应用到 AttributeSet
    for (const modifier of this.appliedModifiers) {
      context.attributes.addModifier(modifier);
    }
  }

  /**
   * Ability revoke/expire 时调用
   * 从 owner 的 AttributeSet 移除 Modifier
   */
  onRemove(context: ComponentLifecycleContext): void {
    // 按来源移除所有 Modifier
    context.attributes.removeModifiersBySource(context.ability.id);
    this.appliedModifiers = [];
  }

  /**
   * 获取当前应用的 Modifier 列表（只读）
   */
  getModifiers(): readonly AttributeModifier[] {
    return this.appliedModifiers;
  }

  /**
   * 获取 Modifier ID 列表（用于查询）
   */
  getModifierIds(): string[] {
    return this.appliedModifiers.map((m) => m.id);
  }

  /**
   * 设置缩放倍数（用于层数）
   * 如果 Ability 已 grant，需要重新应用 Modifier
   */
  setScale(scale: number): void {
    this.currentScale = scale;
  }

  /**
   * 按层数缩放 Modifier 值
   * 注意：如果 Ability 已 grant，需要手动重新应用以更新值
   */
  scaleByStacks(stacks: number): void {
    this.setScale(stacks);
  }

  /**
   * 获取原始配置（只读）
   */
  getConfigs(): readonly StatModifierConfig[] {
    return this.configs;
  }

  serialize(): object {
    return {
      configs: this.configs,
      scale: this.currentScale,
    };
  }

  /**
   * 从序列化数据创建新的 StatModifierComponent 实例
   *
   * @param data 序列化数据
   * @returns 新的 StatModifierComponent 实例
   *
   * @example
   * ```typescript
   * const saved = component.serialize();
   * const restored = StatModifierComponent.fromSerialized(saved);
   * ```
   */
  static fromSerialized(data: object): StatModifierComponent {
    const d = data as { configs: StatModifierConfig[]; scale?: number };
    const component = new StatModifierComponent(d.configs ?? []);
    component.currentScale = d.scale ?? 1;
    return component;
  }
}

/**
 * 创建属性修改组件的便捷函数
 */
export function statModifier(configs: StatModifierConfig[]): StatModifierComponent {
  return new StatModifierComponent(configs);
}

/**
 * 快速创建单个 AddBase 修改
 */
export function addBaseStat(attributeName: string, value: number): StatModifierComponent {
  return new StatModifierComponent([
    { attributeName, modifierType: ModifierType.AddBase, value },
  ]);
}

/**
 * 快速创建单个 MulBase 修改
 */
export function mulBaseStat(attributeName: string, value: number): StatModifierComponent {
  return new StatModifierComponent([
    { attributeName, modifierType: ModifierType.MulBase, value },
  ]);
}

/**
 * 快速创建单个 AddFinal 修改
 */
export function addFinalStat(attributeName: string, value: number): StatModifierComponent {
  return new StatModifierComponent([
    { attributeName, modifierType: ModifierType.AddFinal, value },
  ]);
}

/**
 * 快速创建单个 MulFinal 修改
 */
export function mulFinalStat(attributeName: string, value: number): StatModifierComponent {
  return new StatModifierComponent([
    { attributeName, modifierType: ModifierType.MulFinal, value },
  ]);
}
