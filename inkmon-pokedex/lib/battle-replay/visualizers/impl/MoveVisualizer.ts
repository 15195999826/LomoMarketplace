/**
 * MoveVisualizer - 移动事件转换器
 *
 * 将 MoveStartEvent 翻译为 MoveAction
 *
 * @module lib/battle-replay/visualizers/impl/MoveVisualizer
 */

import type { GameEventBase } from '@lomo/logic-game-framework';
import type { MoveAction, VisualizerContext } from '../../types';
import type { IVisualizer } from '../IVisualizer';

/**
 * 移动开始事件（来自 @inkmon/battle）
 */
interface MoveStartEvent extends GameEventBase {
  readonly kind: 'move_start';
  readonly actorId: string;
  readonly fromHex: { q: number; r: number };
  readonly toHex: { q: number; r: number };
}

/**
 * 类型守卫：检查是否为 MoveStartEvent
 */
function isMoveStartEvent(event: GameEventBase): event is MoveStartEvent {
  return event.kind === 'move_start';
}

/**
 * 移动事件 Visualizer
 *
 * 将 MoveStartEvent 翻译为 MoveAction
 */
export class MoveVisualizer implements IVisualizer<MoveStartEvent> {
  readonly name = 'MoveVisualizer';

  canHandle(event: GameEventBase): event is MoveStartEvent {
    return isMoveStartEvent(event);
  }

  translate(event: MoveStartEvent, ctx: VisualizerContext): MoveAction[] {
    const config = ctx.getAnimationConfig();

    return [{
      type: 'Move',
      actorId: event.actorId,
      from: { q: event.fromHex.q, r: event.fromHex.r },
      to: { q: event.toHex.q, r: event.toHex.r },
      duration: config.move.duration,
      easing: config.move.easing,
    }];
  }
}

/**
 * 创建 MoveVisualizer 实例
 */
export function createMoveVisualizer(): MoveVisualizer {
  return new MoveVisualizer();
}
