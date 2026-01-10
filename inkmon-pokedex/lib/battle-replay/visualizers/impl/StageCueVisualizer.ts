/**
 * StageCueVisualizer - 舞台提示事件转换器
 *
 * 将 StageCueEvent 翻译为对应的视觉动作。
 * 通过 cueId 判断应该播放什么类型的动画/特效。
 *
 * @module lib/battle-replay/visualizers/impl/StageCueVisualizer
 */

import type { StageCueEvent } from '@lomo/logic-game-framework';
import { isStageCueEvent } from '@lomo/logic-game-framework';
import type { GameEventBase } from '@lomo/logic-game-framework';
import type {
  VisualAction,
  MeleeStrikeAction,
  VisualizerContext,
  MeleeStrikeStyle,
} from '../../types';
import type { IVisualizer } from '../IVisualizer';

/**
 * 已知的 Cue ID 常量
 */
const CUE_IDS = {
  ATTACK_SLASH: 'attack_slash',
  ATTACK_THRUST: 'attack_thrust',
  ATTACK_IMPACT: 'attack_impact',
} as const;

/**
 * 根据 cueId 推断打击样式
 */
function inferStrikeStyle(cueId: string): MeleeStrikeStyle {
  switch (cueId) {
    case CUE_IDS.ATTACK_THRUST:
      return 'thrust';
    case CUE_IDS.ATTACK_IMPACT:
      return 'impact';
    case CUE_IDS.ATTACK_SLASH:
    default:
      return 'slash';
  }
}

/**
 * 获取攻击颜色
 *
 * 优先级：
 * 1. params.element 元素颜色
 * 2. 队伍颜色（A队绿色系，B队红色系）
 */
function getAttackColor(
  team: 'A' | 'B',
  params?: Record<string, unknown>
): string {
  // 如果有 element 参数，根据元素返回颜色
  const element = params?.element as string | undefined;
  if (element) {
    const elementColors: Record<string, string> = {
      fire: '#ff6b35',
      water: '#4dabf7',
      grass: '#51cf66',
      electric: '#ffd43b',
      ice: '#74c0fc',
    };
    return elementColors[element.toLowerCase()] ?? (team === 'A' ? '#22c55e' : '#ef4444');
  }

  // 根据队伍返回颜色
  // A队（我方）：绿色系
  // B队（敌方）：红色系
  return team === 'A' ? '#22c55e' : '#ef4444';
}

/**
 * 舞台提示事件 Visualizer
 *
 * 处理 stageCue 事件，根据 cueId 生成对应的视觉动作
 */
export class StageCueVisualizer implements IVisualizer<StageCueEvent> {
  readonly name = 'StageCueVisualizer';

  canHandle(event: GameEventBase): event is StageCueEvent {
    return isStageCueEvent(event);
  }

  translate(event: StageCueEvent, ctx: VisualizerContext): VisualAction[] {
    // 根据 cueId 前缀决定生成什么类型的动画
    if (event.cueId.startsWith('attack_')) {
      return this.translateAttack(event, ctx);
    }

    // 未知的 cueId，输出警告
    console.warn(
      `[StageCueVisualizer] Unknown cueId: ${event.cueId}`,
      event
    );
    return [];
  }

  /**
   * 翻译攻击动画
   */
  private translateAttack(
    event: StageCueEvent,
    ctx: VisualizerContext
  ): VisualAction[] {
    const config = ctx.getAnimationConfig();
    const actions: VisualAction[] = [];

    // 获取攻击者位置和队伍
    const attackerPosition = ctx.getActorPosition(event.sourceActorId);
    const attackerTeam = ctx.getActorTeam(event.sourceActorId);

    // 特效持续时间 = hitFrame（从 start 到 hit 的时间）
    // 这样特效会在 hit 帧时刻到达目标
    const strikeDuration = config.skill.basicAttack.hitFrame;

    // 为每个目标生成一个攻击动画
    for (const targetId of event.targetActorIds) {
      const targetPosition = ctx.getActorPosition(targetId);

      const meleeStrike: MeleeStrikeAction = {
        type: 'MeleeStrike',
        actorId: event.sourceActorId,
        from: attackerPosition,
        to: targetPosition,
        style: inferStrikeStyle(event.cueId),
        color: getAttackColor(attackerTeam, event.params),
        duration: strikeDuration,
      };

      actions.push(meleeStrike);
    }

    return actions;
  }
}

/**
 * 创建 StageCueVisualizer 实例
 */
export function createStageCueVisualizer(): StageCueVisualizer {
  return new StageCueVisualizer();
}
