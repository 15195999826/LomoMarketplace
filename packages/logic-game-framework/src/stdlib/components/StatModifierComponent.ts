/**
 * StatModifierComponent - 属性修改组件
 *
 * 给持有者添加属性修改器
 */

import {
  BaseAbilityComponent,
  ComponentTypes,
  type IAbilityForComponent,
} from '../../core/abilities/AbilityComponent.js';
import type { AttributeModifier, ModifierType } from '../../core/attributes/AttributeModifier.js';
import { generateId } from '../../core/utils/IdGenerator.js';

/**
 * 属性修改配置
 */
export interface StatModifierConfig {
  /** 目标属性名 */
  attributeName: string;
  /** 修改器类型 */
  modifierType: ModifierType;
  /** 修改值 */
  value: number;
}

/**
 * StatModifierComponent
 */
export class StatModifierComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.STAT_MODIFIER;

  private configs: StatModifierConfig[];
  private createdModifiers: AttributeModifier[] = [];
  private modifierPrefix: string;

  constructor(configs: StatModifierConfig[]) {
    super();
    this.configs = configs;
    this.modifierPrefix = generateId('statmod');
  }

  onAttach(ability: IAbilityForComponent): void {
    super.onAttach(ability);

    // 创建 Modifier（实际应用需要外部处理）
    this.createdModifiers = this.configs.map((config, index) => ({
      id: `${this.modifierPrefix}_${index}`,
      attributeName: config.attributeName,
      modifierType: config.modifierType,
      value: config.value,
      source: ability.id,
    }));
  }

  onDetach(): void {
    // 清理创建的 Modifier（实际移除需要外部处理）
    this.createdModifiers = [];
    super.onDetach();
  }

  /**
   * 获取创建的 Modifier 列表
   */
  getModifiers(): readonly AttributeModifier[] {
    return this.createdModifiers;
  }

  /**
   * 获取 Modifier ID 列表（用于移除）
   */
  getModifierIds(): string[] {
    return this.createdModifiers.map((m) => m.id);
  }

  /**
   * 按层数缩放 Modifier 值
   */
  scaleByStacks(stacks: number): void {
    this.createdModifiers = this.configs.map((config, index) => ({
      id: `${this.modifierPrefix}_${index}`,
      attributeName: config.attributeName,
      modifierType: config.modifierType,
      value: config.value * stacks,
      source: this.ability?.id,
    }));
  }

  serialize(): object {
    return {
      configs: this.configs,
    };
  }

  deserialize(data: object): void {
    const d = data as { configs: StatModifierConfig[] };
    this.configs = d.configs;
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
