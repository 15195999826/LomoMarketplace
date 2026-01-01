/**
 * Abilities - 能力系统示例
 *
 * 包含标签定义和主动技能组件示例。
 * 这些是示例代码，游戏应根据自己的需求定义标签和组件。
 */

// 标签常量
export {
  RPGAbilityTags,
  MOBAAbilityTags,
  TurnBasedAbilityTags,
} from './AbilityTags.js';

// 标签类型
export type { RPGAbilityTag, MOBAAbilityTag, TurnBasedAbilityTag } from './AbilityTags.js';

// 主动技能组件
export { ActiveSkillComponent, activeSkill } from './ActiveSkillComponent.js';

// 主动技能相关类型
export type { InputActionEvent, ResourceCost, ActiveSkillConfig } from './ActiveSkillComponent.js';
