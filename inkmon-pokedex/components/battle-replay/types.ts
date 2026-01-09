/**
 * Battle Replay Types - Web 端播放状态类型定义
 */

import type { IBattleRecord, IActorInitData, IFrameData, GameEventBase } from "@inkmon/battle";
import { worldToHex, type HexMapConfig } from "@lomo/hex-grid";

// 重新导出 GameEventBase（来自 @lomo/logic-game-framework）
export type { GameEventBase };

// ========== 时钟常量 ==========

/** 基准渲染帧间隔（毫秒） */
export const BASE_RENDER_TICK_MS = 20;

/** 逻辑帧间隔（毫秒） */
export const LOGIC_TICK_MS = 100;

/** 每个逻辑帧包含的渲染帧数 */
export const RENDER_FRAMES_PER_LOGIC_FRAME = LOGIC_TICK_MS / BASE_RENDER_TICK_MS; // = 5

// ========== Timeline 常量（从 @inkmon/battle 同步） ==========

/** 移动动画时长（毫秒） */
export const MOVE_DURATION_MS = 500;

/** 普通攻击动画时长（毫秒） */
export const BASIC_ATTACK_DURATION_MS = 1000;

/** 普通攻击 Hit 帧时间（毫秒） */
export const BASIC_ATTACK_HIT_MS = 500;

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
  | MoveStartEvent
  | MoveCompleteEvent
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

export interface MoveStartEvent {
  kind: "move_start";
  actorId: string;
  fromHex: { q: number; r: number };
  toHex: { q: number; r: number };
}

export interface MoveCompleteEvent {
  kind: "move_complete";
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

// ========== Animation Types ==========

/**
 * 动画类型
 */
export type AnimationType = 'idle' | 'move' | 'skill';

/**
 * 移动动画数据
 */
export interface MoveAnimationData {
  type: 'move';
  actorId: string;
  fromPos: { q: number; r: number };
  toPos: { q: number; r: number };
  /** 动画总时长（毫秒），从 Timeline 读取 */
  duration: number;
  /** 动画开始时的渲染帧计数 */
  startRenderFrame: number;
}

/**
 * 技能动画数据
 */
export interface SkillAnimationData {
  type: 'skill';
  actorId: string;
  skillName: string;
  /** 动画总时长（毫秒），从 Timeline 读取 */
  duration: number;
  /** 动画开始时的渲染帧计数 */
  startRenderFrame: number;
  /** Tag 时间点（毫秒），用于触发效果 */
  tags: Record<string, number>;
  /** 已触发的 Tag */
  triggeredTags: Set<string>;
  /** 待触发的效果（如伤害飘字） */
  pendingEffects: PendingEffect[];
}

/**
 * 待触发效果
 */
export interface PendingEffect {
  type: 'damage' | 'heal';
  targetActorId: string;
  value: number;
  triggerTag: string;
}

/**
 * 动画数据联合类型（不含 null，用于 Map 值）
 */
export type AnimationData = MoveAnimationData | SkillAnimationData;

/**
 * 动画状态联合类型（兼容旧代码，含 null）
 * @deprecated 使用 activeAnimations Map 替代
 */
export type AnimationState = AnimationData | null;

// ========== Replay Player State ==========

/**
 * 帧事件记录（用于事件历史）
 */
export interface FrameEventRecord {
  frame: number;
  events: GameEventBase[];
}

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
  speed: 0.1 | 0.5 | 1 | 2 | 4;
  /** 所有 Actor 的当前状态 */
  actors: Map<string, ActorState>;
  /** 当前帧的事件（来自 IBattleRecord.timeline[].events） */
  currentEvents: GameEventBase[];
  /** 事件历史（按帧分组） */
  eventHistory: FrameEventRecord[];
  /** 战斗结果 */
  battleResult: string | null;
  /** 当前回合号 */
  turnNumber: number;
  /** 当前行动的 Actor ID */
  currentActorId: string | null;
  /** 当前渲染帧计数（用于动画插值） */
  renderFrameCount: number;
  /** 活跃的动画（按 actorId 索引，支持多单位并发动画） */
  activeAnimations: Map<string, AnimationData>;
  /** 插值位置（用于渲染移动动画） */
  interpolatedPositions: Map<string, { q: number; r: number }>;
  /** 地图配置（从回放数据读取） */
  mapConfig?: HexMapConfig;
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
    eventHistory: [],
    battleResult: null,
    turnNumber: 0,
    currentActorId: null,
    renderFrameCount: 0,
    activeAnimations: new Map(),
    interpolatedPositions: new Map(),
    mapConfig,
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
