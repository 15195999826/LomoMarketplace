/**
 * DeathVisualizer - 死亡事件转换器
 *
 * 将 DeathEvent 翻译为死亡标记动作
 *
 * @module lib/battle-replay/visualizers/impl/DeathVisualizer
 */

import type { GameEventBase } from '@lomo/logic-game-framework';
import type {
  VisualAction,
  UpdateHPAction,
  VisualizerContext,
} from '../../types';
import type { IVisualizer } from '../IVisualizer';

/**
 * 死亡事件（来自 @inkmon/battle）
 */
interface DeathEvent extends GameEventBase {
  readonly kind: 'death';
  readonly actorId: string;
  readonly killerActorId?: string;
}

/**
 * 类型守卫：检查是否为 DeathEvent
 */
function isDeathEvent(event: GameEventBase): event is DeathEvent {
  return event.kind === 'death';
}

/**
 * 死亡事件 Visualizer
 *
 * 产生的动作：
 * 1. UpdateHPAction - 将 HP 设为 0（确保死亡状态）
 */
export class DeathVisualizer implements IVisualizer<DeathEvent> {
  readonly name = 'DeathVisualizer';

  canHandle(event: GameEventBase): event is DeathEvent {
    return isDeathEvent(event);
  }

  translate(event: DeathEvent, ctx: VisualizerContext): VisualAction[] {
    const currentHP = ctx.getActorHP(event.actorId);

    // 强制将 HP 设为 0，触发死亡状态
    // 使用 duration: 1 确保动画立即完成（0 会导致除零问题）
    const updateHP: UpdateHPAction = {
      type: 'UpdateHP',
      actorId: event.actorId,
      fromHP: currentHP,
      toHP: 0,
      duration: 1, // 立即完成
    };

    return [updateHP];
  }
}

/**
 * 创建 DeathVisualizer 实例
 */
export function createDeathVisualizer(): DeathVisualizer {
  return new DeathVisualizer();
}
