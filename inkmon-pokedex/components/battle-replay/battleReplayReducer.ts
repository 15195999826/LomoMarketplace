/**
 * Battle Replay Reducer - 纯函数处理帧事件
 *
 * 将 replay 数据转换为可渲染的状态
 */

import type { IBattleRecord, IFrameData } from "@inkmon/battle";
import {
  type ActorState,
  type ReplayPlayerState,
  createInitialState,
} from "./types";

// ========== Event Types ==========

interface BaseEvent {
  readonly kind: string;
  readonly [key: string]: unknown;
}

interface MoveEvent extends BaseEvent {
  kind: "move";
  actorId: string;
  fromHex: { q: number; r: number };
  toHex: { q: number; r: number };
}

interface DamageEvent extends BaseEvent {
  kind: "damage";
  sourceActorId?: string;
  targetActorId: string;
  damage: number;
  element: string;
  damageCategory: string;
  effectiveness: string;
  typeMultiplier: number;
  isCritical: boolean;
  isSTAB: boolean;
}

interface HealEvent extends BaseEvent {
  kind: "heal";
  sourceActorId?: string;
  targetActorId: string;
  healAmount: number;
}

interface DeathEvent extends BaseEvent {
  kind: "death";
  actorId: string;
  killerActorId?: string;
}

interface TurnStartEvent extends BaseEvent {
  kind: "turnStart";
  turnNumber: number;
  actorId: string;
}

interface BattleStartEvent extends BaseEvent {
  kind: "battleStart";
  teamAIds: string[];
  teamBIds: string[];
}

interface BattleEndEvent extends BaseEvent {
  kind: "battleEnd";
  result: string;
  turnCount: number;
  survivorIds: string[];
}

interface SkillUseEvent extends BaseEvent {
  kind: "skillUse";
  actorId: string;
  skillName: string;
  element: string;
  targetActorId?: string;
  targetHex?: { q: number; r: number };
}

// ========== Type Guards ==========

function isMoveEvent(event: BaseEvent): event is MoveEvent {
  return event.kind === "move";
}

function isDamageEvent(event: BaseEvent): event is DamageEvent {
  return event.kind === "damage";
}

function isHealEvent(event: BaseEvent): event is HealEvent {
  return event.kind === "heal";
}

function isDeathEvent(event: BaseEvent): event is DeathEvent {
  return event.kind === "death";
}

function isTurnStartEvent(event: BaseEvent): event is TurnStartEvent {
  return event.kind === "turnStart";
}

function isBattleStartEvent(event: BaseEvent): event is BattleStartEvent {
  return event.kind === "battleStart";
}

function isBattleEndEvent(event: BaseEvent): event is BattleEndEvent {
  return event.kind === "battleEnd";
}

// ========== Reducer ==========

/**
 * 应用单个事件到状态
 */
export function applyEvent(
  state: ReplayPlayerState,
  event: BaseEvent,
): ReplayPlayerState {
  const actors = new Map(state.actors);

  if (isMoveEvent(event)) {
    const actor = actors.get(event.actorId);
    if (actor) {
      actors.set(event.actorId, {
        ...actor,
        position: { q: event.toHex.q, r: event.toHex.r },
      });
    }
    return { ...state, actors };
  }

  if (isDamageEvent(event)) {
    const target = actors.get(event.targetActorId);
    if (target) {
      const newHp = Math.max(0, target.hp - event.damage);
      actors.set(event.targetActorId, {
        ...target,
        hp: newHp,
      });
    }
    return { ...state, actors };
  }

  if (isHealEvent(event)) {
    const target = actors.get(event.targetActorId);
    if (target) {
      const newHp = Math.min(target.maxHp, target.hp + event.healAmount);
      actors.set(event.targetActorId, {
        ...target,
        hp: newHp,
      });
    }
    return { ...state, actors };
  }

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

  if (isTurnStartEvent(event)) {
    return {
      ...state,
      turnNumber: event.turnNumber,
      currentActorId: event.actorId,
    };
  }

  if (isBattleEndEvent(event)) {
    return {
      ...state,
      battleResult: event.result,
    };
  }

  // 未知事件：不修改状态
  return state;
}

/**
 * 应用一帧的所有事件
 */
export function applyFrame(
  state: ReplayPlayerState,
  frameData: IFrameData,
): ReplayPlayerState {
  let newState: ReplayPlayerState = {
    ...state,
    currentFrame: frameData.frame,
    currentEvents: frameData.events as unknown[],
  };

  for (const event of frameData.events) {
    newState = applyEvent(newState, event as BaseEvent);
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
 * 应用到指定帧索引（从头开始重新计算）
 */
export function applyToFrameIndex(
  replay: IBattleRecord,
  targetIndex: number,
): ReplayPlayerState {
  let state = createInitialState(replay);
  state = { ...state, currentFrameIndex: targetIndex };

  for (let i = 0; i <= targetIndex && i < replay.timeline.length; i++) {
    state = applyFrame(state, replay.timeline[i]);
    state = { ...state, currentFrameIndex: i };
  }

  return state;
}

/**
 * 前进一帧
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

/**
 * 后退一帧（需要重新计算）
 */
export function stepBackward(
  replay: IBattleRecord,
  state: ReplayPlayerState,
): ReplayPlayerState {
  const prevIndex = state.currentFrameIndex - 1;
  if (prevIndex < 0) {
    return resetToInitial(replay);
  }

  return applyToFrameIndex(replay, prevIndex);
}
