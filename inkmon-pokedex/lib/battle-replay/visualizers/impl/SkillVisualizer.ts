/**
 * SkillVisualizer - 技能使用事件转换器
 *
 * 将 SkillUseEvent 翻译为近战打击动作
 *
 * @module lib/battle-replay/visualizers/impl/SkillVisualizer
 */

import type { GameEventBase } from '@lomo/logic-game-framework';
import type {
  VisualAction,
  MeleeStrikeAction,
  VisualizerContext,
  MeleeStrikeStyle,
} from '../../types';
import type { IVisualizer } from '../IVisualizer';

/**
 * 技能使用事件（来自 @inkmon/battle）
 */
interface SkillUseEvent extends GameEventBase {
  readonly kind: 'skillUse';
  readonly actorId: string;
  readonly skillName: string;
  readonly element: string;
  readonly targetActorId?: string;
  readonly targetHex?: { q: number; r: number };
}

/**
 * 类型守卫：检查是否为 SkillUseEvent
 */
function isSkillUseEvent(event: GameEventBase): event is SkillUseEvent {
  return event.kind === 'skillUse';
}

/**
 * 元素类型对应的颜色
 */
const ELEMENT_COLORS: Record<string, string> = {
  fire: '#ff6b35',
  water: '#4dabf7',
  grass: '#51cf66',
  electric: '#ffd43b',
  ice: '#74c0fc',
  fighting: '#e03131',
  poison: '#be4bdb',
  ground: '#d2a679',
  flying: '#a5d8ff',
  psychic: '#f783ac',
  bug: '#94d82d',
  rock: '#ced4da',
  ghost: '#845ef7',
  dragon: '#7950f2',
  dark: '#495057',
  steel: '#adb5bd',
  fairy: '#faa2c1',
  normal: '#dee2e6',
};

/**
 * 根据元素获取颜色
 */
function getElementColor(element: string): string {
  return ELEMENT_COLORS[element.toLowerCase()] ?? ELEMENT_COLORS.normal;
}

/**
 * 根据技能名称推断打击样式
 *
 * 简单实现：默认使用 slash
 */
function inferStrikeStyle(_skillName: string): MeleeStrikeStyle {
  // 未来可以根据技能名称或类型推断
  // 例如：包含 "punch" 的用 impact，包含 "stab" 的用 thrust
  return 'slash';
}

/**
 * 技能使用事件 Visualizer
 *
 * 产生的动作：
 * 1. MeleeStrikeAction - 近战打击特效
 */
export class SkillVisualizer implements IVisualizer<SkillUseEvent> {
  readonly name = 'SkillVisualizer';

  canHandle(event: GameEventBase): event is SkillUseEvent {
    return isSkillUseEvent(event);
  }

  translate(event: SkillUseEvent, ctx: VisualizerContext): VisualAction[] {
    const config = ctx.getAnimationConfig();

    // 获取攻击者位置
    const attackerPosition = ctx.getActorPosition(event.actorId);

    // 获取目标位置
    let targetPosition = attackerPosition; // 默认指向自己（无目标时）

    if (event.targetActorId) {
      targetPosition = ctx.getActorPosition(event.targetActorId);
    } else if (event.targetHex) {
      targetPosition = ctx.hexToWorld(event.targetHex);
    }

    // 创建近战打击动作
    const meleeStrike: MeleeStrikeAction = {
      type: 'MeleeStrike',
      from: attackerPosition,
      to: targetPosition,
      style: inferStrikeStyle(event.skillName),
      color: getElementColor(event.element),
      duration: config.skill.basicAttack.duration,
    };

    return [meleeStrike];
  }
}

/**
 * 创建 SkillVisualizer 实例
 */
export function createSkillVisualizer(): SkillVisualizer {
  return new SkillVisualizer();
}
