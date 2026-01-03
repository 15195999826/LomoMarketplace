/**
 * TagComponent - Tag 组件
 *
 * 随 Ability 生命周期管理 Tag：
 * - onApply: 添加 Tag
 * - onRemove: 移除 Tag
 *
 * Tag 通过 AbilitySet._addComponentTags/_removeComponentTags 管理，
 * 属于 ComponentTags 类型（第三种 Tag 来源）。
 *
 * ## 使用示例
 *
 * ```typescript
 * // Buff 带有 Tag
 * const poisonBuff: AbilityConfig = {
 *   configId: 'buff_poison',
 *   components: [
 *     new TagComponent({ tags: ['debuff', 'poison', 'dot'] }),
 *     new DurationComponent({ time: 10000 }),
 *   ],
 * };
 *
 * // 技能激活时临时添加状态
 * const chargeSkill: AbilityConfig = {
 *   configId: 'skill_charge',
 *   components: [
 *     new TagComponent({ tags: ['charging'] }),
 *   ],
 * };
 * ```
 */

import {
  BaseAbilityComponent,
  type ComponentLifecycleContext,
} from './AbilityComponent.js';

/**
 * TagComponent 配置
 */
export type TagComponentConfig = {
  /** 要添加的 Tag 列表 */
  readonly tags: string[];
};

/**
 * TagComponent - Tag 组件
 *
 * 随 Ability 生命周期管理 Tag。
 */
export class TagComponent extends BaseAbilityComponent {
  readonly type = 'tag';

  private readonly tags: string[];

  constructor(config: TagComponentConfig) {
    super();
    this.tags = [...config.tags];
  }

  /**
   * Ability grant 时添加 Tag
   */
  onApply(context: ComponentLifecycleContext): void {
    if (!context.abilitySet) {
      return;
    }

    context.abilitySet._addComponentTags(context.ability.id, this.tags);
  }

  /**
   * Ability revoke/expire 时移除 Tag
   */
  onRemove(context: ComponentLifecycleContext): void {
    if (!context.abilitySet) {
      return;
    }

    context.abilitySet._removeComponentTags(context.ability.id);
  }

  serialize(): object {
    return {
      type: this.type,
      tags: this.tags,
    };
  }
}
