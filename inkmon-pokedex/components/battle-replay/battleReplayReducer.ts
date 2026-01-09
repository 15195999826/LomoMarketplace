/**
 * Battle Replay Reducer - 纯函数处理帧事件
 *
 * 将 replay 数据转换为可渲染的状态
 *
 * ## 设计原则
 *
 * 1. **状态更新**：只通过框架事件更新 Actor 状态
 *    - AttributeChangedEvent: 更新属性（HP、MP 等）
 *    - AbilityGrantedEvent/RemovedEvent: 更新 Buff 列表
 *    - TagChangedEvent: 更新状态标签
 *
 * 2. **表演效果**：业务事件触发视觉/音效
 *    - DamageEvent: 伤害飘字、震屏、音效
 *    - HealEvent: 治疗飘字、特效
 *    - SkillUseEvent: 技能特效、动画
 *    - MoveStartEvent/MoveCompleteEvent: 移动动画
 */

import type { IBattleRecord, IFrameData, GameEventBase } from "@inkmon/battle";
import {
  isMoveStartEvent,
  isMoveCompleteEvent,
  isDamageEvent,
  isHealEvent,
  isDeathEvent,
  isTurnStartEvent,
  isBattleEndEvent,
  isSkillUseEvent,
  // 框架事件 Type Guards（从 @lomo/logic-game-framework 重新导出）
  isAttributeChangedEvent,
  isAbilityActivatedEvent,
  isTagChangedEvent,
} from "@inkmon/battle";
import {
  type ActorState,
  type ReplayPlayerState,
  createInitialState,
} from "./types";

// ========== Reducer ==========

/**
 * 应用单个事件到状态（表演层更新）
 *
 * 处理两类事件：
 * 1. 框架事件 (FrameworkEvent): 更新 Actor 状态
 * 2. 业务事件 (BusinessEvent): 触发表演效果（未来扩展）
 */
export function applyEvent(
  state: ReplayPlayerState,
  event: GameEventBase,
): ReplayPlayerState {
  const actors = new Map(state.actors);

  // ========== 框架事件：状态更新 ==========

  // 属性变化：这是更新 Actor 属性的标准方式
  if (isAttributeChangedEvent(event)) {
    const actor = actors.get(event.actorId);
    if (actor) {
      // 动态更新属性
      const updatedActor: ActorState = {
        ...actor,
        // 特殊处理：hp 属性
        ...(event.attribute === 'hp' ? { hp: event.newValue } : {}),
        // 特殊处理：maxHp 属性
        ...(event.attribute === 'maxHp' ? { maxHp: event.newValue } : {}),
      };

      // 如果 HP 降到 0 或以下，标记为死亡
      if (event.attribute === 'hp' && event.newValue <= 0) {
        updatedActor.isAlive = false;
      }

      actors.set(event.actorId, updatedActor);
    }
    return { ...state, actors };
  }

  // Ability 激活完成：记录用于表演（显示技能图标、特效等）
  if (isAbilityActivatedEvent(event)) {
    // TODO: 未来可以记录到 state.lastAbilityActivation 用于显示特效
    return state;
  }

  // Tag 变化：记录用于表演（显示 Buff/Debuff 图标）
  if (isTagChangedEvent(event)) {
    // TODO: 未来可以记录到 state.actorTags 用于显示状态图标
    return state;
  }

  // ========== 业务事件：表演效果 + 状态更新 ==========

  // 移动开始事件：触发移动动画（表演层关心这个）
  // 注意：不更新 Actor 位置，位置由 move_complete 更新
  if (isMoveStartEvent(event)) {
    // 表演层会在 BattleReplayPlayer 中处理动画
    // reducer 不需要做任何状态更新
    return state;
  }

  // 移动完成事件：更新 Actor 位置（数据层）
  if (isMoveCompleteEvent(event)) {
    const actor = actors.get(event.actorId);
    if (actor) {
      actors.set(event.actorId, {
        ...actor,
        position: { q: event.toHex.q, r: event.toHex.r },
      });
    }
    return { ...state, actors };
  }

  // 伤害事件：记录用于表演（伤害飘字、震屏、音效）
  // 注意：HP 的实际更新由 AttributeChangedEvent 处理
  if (isDamageEvent(event)) {
    // TODO: 未来可以记录到 state.pendingEffects 用于显示特效
    return state;
  }

  // 治疗事件：记录用于表演（治疗飘字、特效）
  // 注意：HP 的实际更新由 AttributeChangedEvent 处理
  if (isHealEvent(event)) {
    // TODO: 未来可以记录到 state.pendingEffects 用于显示特效
    return state;
  }

  // 死亡事件：标记为死亡
  if (isDeathEvent(event)) {
    const actor = actors.get(event.actorId);
    if (actor) {
      actors.set(event.actorId, {
        ...actor,
        isAlive: false,
      });
    }
    return { ...state, actors };
  }

  // 技能使用事件：记录用于表演（技能特效、动画）
  if (isSkillUseEvent(event)) {
    // TODO: 未来可以记录到 state.pendingEffects 用于显示特效
    return state;
  }

  // 回合开始事件：更新当前行动者
  if (isTurnStartEvent(event)) {
    return {
      ...state,
      turnNumber: event.turnNumber,
      currentActorId: event.actorId,
    };
  }

  // 战斗结束事件：记录结果
  if (isBattleEndEvent(event)) {
    return {
      ...state,
      battleResult: event.result,
    };
  }

  // 未知事件：不修改状态（向前兼容）
  return state;
}

/**
 * 应用一帧的所有事件（帧同步核心）
 *
 * 遍历该帧的所有事件，逐个应用到状态
 */
export function applyFrame(
  state: ReplayPlayerState,
  frameData: IFrameData,
): ReplayPlayerState {
  let newState: ReplayPlayerState = {
    ...state,
    currentFrame: frameData.frame,
    currentEvents: frameData.events,
    // 将本帧事件添加到历史记录（只有非空事件才添加）
    eventHistory: frameData.events.length > 0
      ? [...state.eventHistory, { frame: frameData.frame, events: frameData.events }]
      : state.eventHistory,
  };

  // 逐个应用事件到状态（支持所有 GameEventBase 类型）
  for (const event of frameData.events) {
    newState = applyEvent(newState, event);
  }

  return newState;
}

/**
 * 重置到初始状态
 */
export function resetToInitial(replay: IBattleRecord): ReplayPlayerState {
  return createInitialState(replay);
}

/**
 * 前进一帧（播放核心）
 */
export function stepForward(
  replay: IBattleRecord,
  state: ReplayPlayerState,
): ReplayPlayerState {
  const nextIndex = state.currentFrameIndex + 1;
  if (nextIndex >= replay.timeline.length) {
    return { ...state, isPlaying: false };
  }

  const frameData = replay.timeline[nextIndex];
  let newState = applyFrame(state, frameData);
  newState = { ...newState, currentFrameIndex: nextIndex };

  return newState;
}
