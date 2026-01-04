/**
 * 振奋 Buff - 防御力 +10，持续 2 秒
 */

import { type AbilityConfig, ModifierType } from '@lomo/logic-game-framework';
import {
  StatModifierComponent,
  TimeDurationComponent,
} from '@lomo/logic-game-framework/stdlib';

/** 振奋 Buff 持续时间（毫秒） */
export const INSPIRE_DURATION_MS = 2000;

/** 振奋 Buff 防御力加成 */
export const INSPIRE_DEF_BONUS = 10;

/**
 * 振奋 Buff 配置
 *
 * - 效果：防御力 +10（AddBase）
 * - 持续：2 秒
 * - 标签：buff, inspire
 *
 * 使用工厂模式：每次创建 Ability 时生成新的 Component 实例，
 * 避免多个 Ability 共享 Component 状态。
 */
export const INSPIRE_BUFF: AbilityConfig = {
  configId: 'buff_inspire',
  displayName: '振奋',
  tags: ['buff', 'inspire'],
  components: [
    // 属性修改：防御力 +10
    () => new StatModifierComponent([
      {
        attributeName: 'def',
        modifierType: ModifierType.AddBase,
        value: INSPIRE_DEF_BONUS,
      },
    ]),
    // 持续时间：2 秒
    () => new TimeDurationComponent(INSPIRE_DURATION_MS),
  ],
};
