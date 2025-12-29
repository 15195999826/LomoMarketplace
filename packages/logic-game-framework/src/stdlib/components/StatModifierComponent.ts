/**
 * StatModifierComponent - 属性修改组件
 *
 * 给持有者添加属性修改器
 *
 * Modifier 的应用/移除在 onActivate/onDeactivate 时自动处理，
 * 外部无需手动调用 addModifier。
 */

import {
  BaseAbilityComponent,
  ComponentTypes,
  type IAbilityForComponent,
  type ComponentLifecycleContext,
} from '../../core/abilities/AbilityComponent.js';
import type { AttributeModifier, ModifierType } from '../../core/attributes/AttributeModifier.js';
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
 * const ability = new Ability({ configId: 'buff_strength' }, ownerRef);
 *
 * // 添加属性修改组件
 * ability.addComponent(
 *   new StatModifierComponent([
 *     { attributeName: 'attack', modifierType: 'AddBase', value: 30 },
 *     { attributeName: 'defense', modifierType: 'MulBase', value: 0.2 },
 *   ])
 * );
 *
 * // 激活时自动应用 Modifier
 * ability.activate(context);
 *
 * // 失效时自动移除 Modifier
 * ability.expire();
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

  onAttach(ability: IAbilityForComponent): void {
    super.onAttach(ability);
    // 不在 onAttach 时创建 Modifier，只保存引用
  }

  onDetach(): void {
    this.appliedModifiers = [];
    super.onDetach();
  }

  /**
   * Ability 激活时调用
   * 创建并应用 Modifier 到 owner 的 AttributeSet
   */
  onActivate(context: ComponentLifecycleContext): void {
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
   * Ability 失效时调用
   * 从 owner 的 AttributeSet 移除 Modifier
   */
  onDeactivate(context: ComponentLifecycleContext): void {
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
   * 如果 Ability 已激活，需要重新应用 Modifier
   */
  setScale(scale: number): void {
    this.currentScale = scale;
  }

  /**
   * 按层数缩放 Modifier 值
   * 注意：如果 Ability 已激活，需要手动重新激活以应用新值
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

  deserialize(data: object): void {
    const d = data as { configs: StatModifierConfig[]; scale?: number };
    // configs 是 readonly，不能重新赋值
    // 只恢复 scale
    this.currentScale = d.scale ?? 1;
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
    { attributeName, modifierType: 'AddBase', value },
  ]);
}

/**
 * 快速创建单个 MulBase 修改
 */
export function mulBaseStat(attributeName: string, value: number): StatModifierComponent {
  return new StatModifierComponent([
    { attributeName, modifierType: 'MulBase', value },
  ]);
}

/**
 * 快速创建单个 AddFinal 修改
 */
export function addFinalStat(attributeName: string, value: number): StatModifierComponent {
  return new StatModifierComponent([
    { attributeName, modifierType: 'AddFinal', value },
  ]);
}

/**
 * 快速创建单个 MulFinal 修改
 */
export function mulFinalStat(attributeName: string, value: number): StatModifierComponent {
  return new StatModifierComponent([
    { attributeName, modifierType: 'MulFinal', value },
  ]);
}
