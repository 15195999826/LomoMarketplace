/**
 * StageCueVisualizer - 舞台提示事件转换器
 *
 * 将 StageCueEvent 翻译为对应的视觉动作。
 * 通过 cueId 判断应该播放什么类型的动画/特效。
 *
 * @module lib/battle-replay/visualizers/impl/StageCueVisualizer
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
 * 舞台提示事件（来自 @lomo/logic-game-framework）
 */
interface StageCueEvent extends GameEventBase {
  readonly kind: 'stageCue';
  readonly sourceActorId: string;
  readonly targetActorIds: readonly string[];
  readonly cueId: string;
  readonly params?: Record<string, unknown>;
}

/**
 * 类型守卫：检查是否为 StageCueEvent
 */
function isStageCueEvent(event: GameEventBase): event is StageCueEvent {
  return event.kind === 'stageCue';
}

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
 */
function getAttackColor(params?: Record<string, unknown>): string {
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
    return elementColors[element.toLowerCase()] ?? '#ff8c00';
  }
  // 默认橙色
  return '#ff8c00';
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

    // 获取攻击者位置
    const attackerPosition = ctx.getActorPosition(event.sourceActorId);

    // 为每个目标生成一个攻击动画
    for (const targetId of event.targetActorIds) {
      const targetPosition = ctx.getActorPosition(targetId);

      const meleeStrike: MeleeStrikeAction = {
        type: 'MeleeStrike',
        actorId: event.sourceActorId,
        from: attackerPosition,
        to: targetPosition,
        style: inferStrikeStyle(event.cueId),
        color: getAttackColor(event.params),
        duration: config.skill.basicAttack.duration,
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
