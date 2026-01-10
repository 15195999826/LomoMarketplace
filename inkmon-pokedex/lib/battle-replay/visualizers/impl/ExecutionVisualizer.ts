/**
 * ExecutionVisualizer - 执行实例激活事件转换器
 *
 * 将 ExecutionActivatedEvent 翻译为对应的视觉动作。
 * 通过 timelineId 判断应该播放什么类型的动画。
 *
 * @module lib/battle-replay/visualizers/impl/ExecutionVisualizer
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
 * 执行实例激活事件（来自 @lomo/logic-game-framework）
 */
interface ExecutionActivatedEvent extends GameEventBase {
  readonly kind: 'executionActivated';
  readonly actorId: string;
  readonly abilityInstanceId: string;
  readonly abilityConfigId: string;
  readonly executionId: string;
  readonly timelineId: string;
}

/**
 * 类型守卫：检查是否为 ExecutionActivatedEvent
 */
function isExecutionActivatedEvent(event: GameEventBase): event is ExecutionActivatedEvent {
  return event.kind === 'executionActivated';
}

/**
 * 已知的 Timeline ID 常量
 */
const TIMELINE_IDS = {
  BASIC_ATTACK: 'skill_basic_attack',
  MOVE: 'action_move',
} as const;

/**
 * 根据 abilityConfigId 推断打击样式
 *
 * 目前简单实现：所有攻击使用 slash 风格
 */
function inferStrikeStyle(_abilityConfigId: string): MeleeStrikeStyle {
  // 未来可以根据技能类型推断不同的打击样式
  // 例如：拳击类用 impact，突刺类用 thrust
  return 'slash';
}

/**
 * 获取默认攻击颜色
 *
 * 未来可以根据 Actor 的元素类型来确定颜色
 */
function getAttackColor(): string {
  // 使用通用的橙色作为普通攻击颜色
  return '#ff8c00';
}

/**
 * 执行实例激活事件 Visualizer
 *
 * 处理 executionActivated 事件，根据 timelineId 生成对应的视觉动作：
 * - skill_basic_attack: 生成 MeleeStrikeAction
 * - action_move: 暂时忽略（移动由其他逻辑处理）
 */
export class ExecutionVisualizer implements IVisualizer<ExecutionActivatedEvent> {
  readonly name = 'ExecutionVisualizer';

  canHandle(event: GameEventBase): event is ExecutionActivatedEvent {
    return isExecutionActivatedEvent(event);
  }

  translate(event: ExecutionActivatedEvent, ctx: VisualizerContext): VisualAction[] {
    // 根据 timelineId 决定生成什么动画
    switch (event.timelineId) {
      case TIMELINE_IDS.BASIC_ATTACK:
        return this.translateBasicAttack(event, ctx);

      case TIMELINE_IDS.MOVE:
        // 移动动画暂时忽略，由 MoveVisualizer 处理 move_start/move_complete 事件
        return [];

      default:
        // 未知的 timelineId，输出警告但不阻塞
        console.warn(
          `[ExecutionVisualizer] Unknown timelineId: ${event.timelineId}`,
          event
        );
        return [];
    }
  }

  /**
   * 翻译普通攻击动画
   */
  private translateBasicAttack(
    event: ExecutionActivatedEvent,
    ctx: VisualizerContext
  ): VisualAction[] {
    const config = ctx.getAnimationConfig();

    // 获取攻击者位置
    const attackerPosition = ctx.getActorPosition(event.actorId);

    // 尝试获取目标位置
    // 从事件中无法直接得知目标，需要使用其他方式推断
    // 简化处理：查找距离攻击者最近的敌方单位
    const targetPosition = this.findNearestEnemyPosition(event.actorId, ctx);

    if (!targetPosition) {
      // 没有找到目标，无法生成攻击动画
      console.warn(
        `[ExecutionVisualizer] No target found for attack from ${event.actorId}`
      );
      return [];
    }

    // 创建近战打击动作
    const meleeStrike: MeleeStrikeAction = {
      type: 'MeleeStrike',
      actorId: event.actorId,
      from: attackerPosition,
      to: targetPosition,
      style: inferStrikeStyle(event.abilityConfigId),
      color: getAttackColor(),
      duration: config.skill.basicAttack.duration,
    };

    return [meleeStrike];
  }

  /**
   * 查找最近的敌方单位位置
   *
   * 简化实现：遍历所有 Actor，找到不同队伍且存活的最近单位
   */
  private findNearestEnemyPosition(
    attackerId: string,
    ctx: VisualizerContext
  ): { x: number; y: number } | null {
    const attackerTeam = ctx.getActorTeam(attackerId);
    const attackerPos = ctx.getActorPosition(attackerId);

    let nearestPosition: { x: number; y: number } | null = null;
    let nearestDistSq = Infinity;

    // 遍历所有 Actor
    const actorIds = ctx.getAllActorIds();
    for (const actorId of actorIds) {
      // 跳过自己
      if (actorId === attackerId) continue;

      // 跳过同队
      const team = ctx.getActorTeam(actorId);
      if (team === attackerTeam) continue;

      // 跳过死亡单位
      if (!ctx.isActorAlive(actorId)) continue;

      // 计算距离
      const pos = ctx.getActorPosition(actorId);
      const dx = pos.x - attackerPos.x;
      const dy = pos.y - attackerPos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestPosition = pos;
      }
    }

    return nearestPosition;
  }
}

/**
 * 创建 ExecutionVisualizer 实例
 */
export function createExecutionVisualizer(): ExecutionVisualizer {
  return new ExecutionVisualizer();
}
