/**
 * DamageVisualizer - 伤害事件转换器
 *
 * 将 DamageEvent 翻译为飘字和血条更新动作
 *
 * @module lib/battle-replay/visualizers/impl/DamageVisualizer
 */

import type { GameEventBase } from '@lomo/logic-game-framework';
import type {
  VisualAction,
  FloatingTextAction,
  UpdateHPAction,
  VisualizerContext,
  FloatingTextStyle,
} from '../../types';
import type { IVisualizer } from '../IVisualizer';

/**
 * 伤害事件（来自 @inkmon/battle）
 */
interface DamageEvent extends GameEventBase {
  readonly kind: 'damage';
  readonly sourceActorId?: string;
  readonly targetActorId: string;
  readonly damage: number;
  readonly element: string;
  readonly effectiveness: string;
  readonly isCritical: boolean;
}

/**
 * 类型守卫：检查是否为 DamageEvent
 */
function isDamageEvent(event: GameEventBase): event is DamageEvent {
  return event.kind === 'damage';
}

/**
 * 根据属性相克获取飘字颜色
 */
function getEffectivenessColor(effectiveness: string, isCritical: boolean): string {
  if (isCritical) return '#ffcc00'; // 暴击：金色

  switch (effectiveness) {
    case 'super_effective':
      return '#ff6b6b'; // 效果拔群：红色
    case 'not_very_effective':
      return '#888888'; // 效果不佳：灰色
    case 'immune':
      return '#666666'; // 免疫：深灰
    default:
      return '#ffffff'; // 普通：白色
  }
}

/**
 * 获取飘字样式
 */
function getFloatingTextStyle(isCritical: boolean): FloatingTextStyle {
  return isCritical ? 'critical' : 'normal';
}

/**
 * 伤害事件 Visualizer
 *
 * 产生的动作：
 * 1. FloatingTextAction - 伤害飘字
 * 2. UpdateHPAction - 血条平滑过渡
 */
export class DamageVisualizer implements IVisualizer<DamageEvent> {
  readonly name = 'DamageVisualizer';

  canHandle(event: GameEventBase): event is DamageEvent {
    return isDamageEvent(event);
  }

  translate(event: DamageEvent, ctx: VisualizerContext): VisualAction[] {
    const config = ctx.getAnimationConfig();
    const targetPosition = ctx.getActorPosition(event.targetActorId);
    const currentHP = ctx.getActorHP(event.targetActorId);

    const actions: VisualAction[] = [];

    // 1. 伤害飘字
    const floatingText: FloatingTextAction = {
      type: 'FloatingText',
      actorId: event.targetActorId, // 添加 actorId 用于定位
      text: `-${event.damage}`,
      color: getEffectivenessColor(event.effectiveness, event.isCritical),
      position: targetPosition,
      duration: config.damage.floatingTextDuration,
      style: getFloatingTextStyle(event.isCritical),
    };
    actions.push(floatingText);

    // 2. 血条更新（带延迟，等待受击特效）
    const updateHP: UpdateHPAction = {
      type: 'UpdateHP',
      actorId: event.targetActorId,
      fromHP: currentHP,
      toHP: Math.max(0, currentHP - event.damage),
      duration: config.damage.hpBarDuration,
      delay: config.damage.hpBarDelay ?? 0,
    };
    actions.push(updateHP);

    return actions;
  }
}

/**
 * 创建 DamageVisualizer 实例
 */
export function createDamageVisualizer(): DamageVisualizer {
  return new DamageVisualizer();
}
