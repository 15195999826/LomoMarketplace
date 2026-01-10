/**
 * HealVisualizer - 治疗事件转换器
 *
 * 将 HealEvent 翻译为飘字和血条更新动作
 *
 * @module lib/battle-replay/visualizers/impl/HealVisualizer
 */

import type { GameEventBase } from '@lomo/logic-game-framework';
import type {
  VisualAction,
  FloatingTextAction,
  UpdateHPAction,
  VisualizerContext,
} from '../../types';
import type { IVisualizer } from '../IVisualizer';

/**
 * 治疗事件（来自 @inkmon/battle）
 */
interface HealEvent extends GameEventBase {
  readonly kind: 'heal';
  readonly sourceActorId?: string;
  readonly targetActorId: string;
  readonly healAmount: number;
}

/**
 * 类型守卫：检查是否为 HealEvent
 */
function isHealEvent(event: GameEventBase): event is HealEvent {
  return event.kind === 'heal';
}

/**
 * 治疗事件 Visualizer
 *
 * 产生的动作：
 * 1. FloatingTextAction - 治疗飘字（绿色）
 * 2. UpdateHPAction - 血条平滑过渡
 */
export class HealVisualizer implements IVisualizer<HealEvent> {
  readonly name = 'HealVisualizer';

  canHandle(event: GameEventBase): event is HealEvent {
    return isHealEvent(event);
  }

  translate(event: HealEvent, ctx: VisualizerContext): VisualAction[] {
    const config = ctx.getAnimationConfig();
    const targetPosition = ctx.getActorPosition(event.targetActorId);
    const currentHP = ctx.getActorHP(event.targetActorId);
    const maxHP = ctx.getActorMaxHP(event.targetActorId);

    const actions: VisualAction[] = [];

    // 1. 治疗飘字
    const floatingText: FloatingTextAction = {
      type: 'FloatingText',
      actorId: event.targetActorId, // 添加 actorId 用于定位
      text: `+${event.healAmount}`,
      color: '#51cf66', // 绿色
      position: targetPosition,
      duration: config.heal.floatingTextDuration,
      style: 'heal',
    };
    actions.push(floatingText);

    // 2. 血条更新
    const newHP = Math.min(maxHP, currentHP + event.healAmount);
    const updateHP: UpdateHPAction = {
      type: 'UpdateHP',
      actorId: event.targetActorId,
      fromHP: currentHP,
      toHP: newHP,
      duration: config.heal.hpBarDuration,
    };
    actions.push(updateHP);

    return actions;
  }
}

/**
 * 创建 HealVisualizer 实例
 */
export function createHealVisualizer(): HealVisualizer {
  return new HealVisualizer();
}
