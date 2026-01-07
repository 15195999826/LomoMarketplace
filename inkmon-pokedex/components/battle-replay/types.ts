/**
 * Battle Replay Types - Web 端播放状态类型定义
 */

import type { IBattleRecord, IActorInitData, IFrameData } from "@inkmon/battle";

// ========== Actor State ==========

/**
 * 播放器中的 Actor 状态
 */
export interface ActorState {
  id: string;
  displayName: string;
  team: "A" | "B";
  hp: number;
  maxHp: number;
  position: { q: number; r: number };
  isAlive: boolean;
  elements: string[];
}

// ========== Replay Player State ==========

/**
 * 播放器状态
 */
export interface ReplayPlayerState {
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前帧索引（在 timeline 中的索引） */
  currentFrameIndex: number;
  /** 当前帧号（逻辑帧） */
  currentFrame: number;
  /** 播放速度 */
  speed: 0.5 | 1 | 2 | 4;
  /** 所有 Actor 的当前状态 */
  actors: Map<string, ActorState>;
  /** 当前帧的事件 */
  currentEvents: unknown[];
  /** 战斗结果 */
  battleResult: string | null;
  /** 当前回合号 */
  turnNumber: number;
  /** 当前行动的 Actor ID */
  currentActorId: string | null;
}

// ========== Replay Summary ==========

/**
 * Replay 摘要信息
 */
export interface ReplaySummary {
  version: string;
  battleId: string;
  tickInterval: number;
  totalFrames: number;
  frameCount: number;
  actorCount: number;
  result?: string;
}

// ========== Helper Functions ==========

/**
 * 从 IBattleRecord 创建初始播放状态
 */
export function createInitialState(replay: IBattleRecord): ReplayPlayerState {
  const actors = new Map<string, ActorState>();

  for (const actor of replay.initialActors) {
    actors.set(actor.id, createActorState(actor));
  }

  return {
    isPlaying: false,
    currentFrameIndex: -1, // -1 表示尚未开始
    currentFrame: 0,
    speed: 1,
    actors,
    currentEvents: [],
    battleResult: null,
    turnNumber: 0,
    currentActorId: null,
  };
}

/**
 * 从 IActorInitData 创建 ActorState
 */
export function createActorState(actor: IActorInitData): ActorState {
  const hex = actor.position?.hex;
  const elements = (actor as { elements?: string[] }).elements ?? [];

  return {
    id: actor.id,
    displayName: actor.displayName,
    team: actor.team === "A" || actor.team === 1 ? "A" : "B",
    hp: actor.attributes.hp ?? 0,
    maxHp: actor.attributes.maxHp ?? actor.attributes.hp ?? 100,
    position: hex ? { q: hex.q, r: hex.r } : { q: 0, r: 0 },
    isAlive: true,
    elements,
  };
}

/**
 * 获取 Replay 摘要
 */
export function getReplaySummary(replay: IBattleRecord): ReplaySummary {
  return {
    version: replay.version,
    battleId: replay.meta.battleId,
    tickInterval: replay.meta.tickInterval,
    totalFrames: replay.meta.totalFrames,
    frameCount: replay.timeline.length,
    actorCount: replay.initialActors.length,
    result: replay.meta.result,
  };
}
