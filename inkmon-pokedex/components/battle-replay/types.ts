/**
 * Battle Replay Types - Web 端播放状态类型定义
 */

import type { IBattleRecord, IActorInitData, IFrameData, GameEventBase } from "@inkmon/battle";
import { worldToHex, type HexMapConfig } from "@lomo/hex-grid";

// 重新导出 GameEventBase（来自 @lomo/logic-game-framework）
export type { GameEventBase };

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

// ========== InkMon Replay Event Types ==========

/**
 * InkMon 战斗事件联合类型（用于 BattleStage）
 */
export type InkMonReplayEvent =
  | BattleStartEvent
  | BattleEndEvent
  | TurnStartEvent
  | MoveEvent
  | SkillUseEvent
  | DamageEvent
  | HealEvent
  | DeathEvent
  | SkipEvent
  | UnknownEvent;

export interface BattleStartEvent {
  kind: "battleStart";
  teamAIds: string[];
  teamBIds: string[];
}

export interface BattleEndEvent {
  kind: "battleEnd";
  result: string;
  turnCount: number;
  survivorIds: string[];
}

export interface TurnStartEvent {
  kind: "turnStart";
  turnNumber: number;
  actorId: string;
}

export interface MoveEvent {
  kind: "move";
  actorId: string;
  fromHex: { q: number; r: number };
  toHex: { q: number; r: number };
}

export interface SkillUseEvent {
  kind: "skillUse";
  actorId: string;
  skillName: string;
  element: string;
  targetActorId?: string;
  targetHex?: { q: number; r: number };
}

export interface DamageEvent {
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

export interface HealEvent {
  kind: "heal";
  sourceActorId?: string;
  targetActorId: string;
  healAmount: number;
}

export interface DeathEvent {
  kind: "death";
  actorId: string;
  killerActorId?: string;
}

export interface SkipEvent {
  kind: "skip";
  actorId: string;
}

export interface UnknownEvent {
  kind: string;
  [key: string]: unknown;
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
  /** 当前帧的事件（来自 IBattleRecord.timeline[].events） */
  currentEvents: GameEventBase[];
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

  // 从 replay.configs.map 获取地图配置
  const mapConfig = replay.configs?.map as HexMapConfig | undefined;

  for (const actor of replay.initialActors) {
    actors.set(actor.id, createActorState(actor, mapConfig));
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
 *
 * @param actor Actor 初始数据
 * @param mapConfig 地图配置（用于 world -> hex 坐标转换）
 */
export function createActorState(
  actor: IActorInitData,
  mapConfig?: HexMapConfig
): ActorState {
  const elements = (actor as { elements?: string[] }).elements ?? [];

  // 优先使用 hex 坐标，如果没有则从 world 坐标转换
  let position: { q: number; r: number };

  if (actor.position?.hex) {
    // 直接使用 hex 坐标
    position = { q: actor.position.hex.q, r: actor.position.hex.r };
  } else if (actor.position?.world && mapConfig) {
    // 从 world 坐标转换为 hex 坐标
    const hexCoord = worldToHex(
      { x: actor.position.world.x, y: actor.position.world.y },
      {
        hexSize: mapConfig.hexSize,
        orientation: mapConfig.orientation,
      }
    );
    position = { q: hexCoord.q, r: hexCoord.r };
  } else {
    // 默认位置
    position = { q: 0, r: 0 };
  }

  return {
    id: actor.id,
    displayName: actor.displayName,
    team: actor.team === "A" || actor.team === 1 ? "A" : "B",
    hp: actor.attributes.hp ?? 0,
    maxHp: actor.attributes.maxHp ?? actor.attributes.hp ?? 100,
    position,
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
