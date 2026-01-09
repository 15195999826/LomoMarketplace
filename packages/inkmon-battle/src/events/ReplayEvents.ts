/**
 * Replay Events - InkMon 战斗回放事件类型定义
 *
 * 定义 InkMon 项目特有的回放事件类型。
 * 这些事件用于记录战斗过程，支持跨平台回放。
 *
 * ## 设计原则
 *
 * - 与 Battle Replay Protocol v2 兼容
 * - 使用 `actorId` 字符串替代 `ActorRef` 对象
 * - 包含 InkMon 特有字段（element, effectiveness, isSTAB 等）
 * - 事件不包含 logicTime（通过 frame * tickInterval 计算）
 */

import type { GameEventBase } from '@lomo/logic-game-framework';
import type { Element } from '@inkmon/core';
import type { EffectivenessLevel } from '../types/TypeEffectiveness.js';

// ========== 伤害类型 ==========

/** 伤害类型（物理/特殊/纯粹） */
export type DamageCategory = 'physical' | 'special' | 'pure';

// ========== 战斗流程事件 ==========

/**
 * 战斗开始事件
 */
export interface BattleStartEvent extends GameEventBase {
  readonly kind: 'battleStart';
  /** A 队成员 ID 列表 */
  readonly teamAIds: string[];
  /** B 队成员 ID 列表 */
  readonly teamBIds: string[];
}

/**
 * 战斗结束事件
 */
export interface BattleEndEvent extends GameEventBase {
  readonly kind: 'battleEnd';
  /** 战斗结果 */
  readonly result: 'teamA_win' | 'teamB_win' | 'draw';
  /** 总回合数 */
  readonly turnCount: number;
  /** 存活者 ID 列表 */
  readonly survivorIds: string[];
}

/**
 * 回合开始事件
 */
export interface TurnStartEvent extends GameEventBase {
  readonly kind: 'turnStart';
  /** 回合号 */
  readonly turnNumber: number;
  /** 行动单位 ID */
  readonly actorId: string;
}

// ========== 行动事件 ==========

/**
 * 移动事件（已废弃，使用 MoveStartEvent 和 MoveCompleteEvent 替代）
 *
 * @deprecated 使用两阶段移动事件代替
 */
export interface MoveEvent extends GameEventBase {
  readonly kind: 'move';
  /** 移动的 Actor ID */
  readonly actorId: string;
  /** 起始坐标 */
  readonly fromHex: { q: number; r: number };
  /** 目标坐标 */
  readonly toHex: { q: number; r: number };
}

/**
 * 移动开始事件
 *
 * 由 StartMoveAction 产生，表示角色开始向目标格子移动（预订目标格子）。
 */
export interface MoveStartEvent extends GameEventBase {
  readonly kind: 'move_start';
  /** 移动的 Actor ID */
  readonly actorId: string;
  /** 起始坐标 */
  readonly fromHex: { q: number; r: number };
  /** 目标坐标（预订的格子） */
  readonly toHex: { q: number; r: number };
}

/**
 * 移动完成事件
 *
 * 由 ApplyMoveAction 产生，表示角色到达目标格子（实际移动完成）。
 */
export interface MoveCompleteEvent extends GameEventBase {
  readonly kind: 'move_complete';
  /** 移动的 Actor ID */
  readonly actorId: string;
  /** 起始坐标 */
  readonly fromHex: { q: number; r: number };
  /** 目标坐标 */
  readonly toHex: { q: number; r: number };
}

/**
 * 技能使用事件
 */
export interface SkillUseEvent extends GameEventBase {
  readonly kind: 'skillUse';
  /** 使用者 ID */
  readonly actorId: string;
  /** 技能名称 */
  readonly skillName: string;
  /** 技能属性 */
  readonly element: Element;
  /** 目标 ID（单体技能） */
  readonly targetActorId?: string;
  /** 目标坐标（范围技能） */
  readonly targetHex?: { q: number; r: number };
}

/**
 * 伤害事件 - InkMon 特有
 *
 * 包含类型相克信息（effectiveness、isSTAB）
 */
export interface DamageEvent extends GameEventBase {
  readonly kind: 'damage';
  /** 伤害来源 Actor ID（可选，如环境伤害无来源） */
  readonly sourceActorId?: string;
  /** 受击目标 Actor ID */
  readonly targetActorId: string;
  /** 伤害值 */
  readonly damage: number;
  /** 伤害类型（物理/特殊） */
  readonly damageCategory: DamageCategory;
  /** 技能属性 */
  readonly element: Element;
  /** 属性相克效果 */
  readonly effectiveness: EffectivenessLevel;
  /** 类型相克倍率 */
  readonly typeMultiplier: number;
  /** 是否暴击 */
  readonly isCritical: boolean;
  /** 是否有 STAB 加成 */
  readonly isSTAB: boolean;
}

/**
 * 治疗事件
 */
export interface HealEvent extends GameEventBase {
  readonly kind: 'heal';
  /** 治疗来源 Actor ID（可选） */
  readonly sourceActorId?: string;
  /** 治疗目标 Actor ID */
  readonly targetActorId: string;
  /** 治疗量 */
  readonly healAmount: number;
}

/**
 * 死亡事件
 */
export interface DeathEvent extends GameEventBase {
  readonly kind: 'death';
  /** 死亡的 Actor ID */
  readonly actorId: string;
  /** 击杀者 Actor ID（可选） */
  readonly killerActorId?: string;
}

/**
 * 跳过行动事件
 */
export interface SkipEvent extends GameEventBase {
  readonly kind: 'skip';
  /** 跳过行动的 Actor ID */
  readonly actorId: string;
}

// ========== 联合类型 ==========

/**
 * 所有 InkMon 战斗事件类型
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
  | SkipEvent;

/**
 * 事件类型标识
 */
export type InkMonReplayEventKind = InkMonReplayEvent['kind'];

// ========== 工厂函数 ==========

/**
 * 创建战斗开始事件
 */
export function createBattleStartEvent(
  teamAIds: string[],
  teamBIds: string[]
): BattleStartEvent {
  return { kind: 'battleStart', teamAIds, teamBIds };
}

/**
 * 创建战斗结束事件
 */
export function createBattleEndEvent(
  result: 'teamA_win' | 'teamB_win' | 'draw',
  turnCount: number,
  survivorIds: string[]
): BattleEndEvent {
  return { kind: 'battleEnd', result, turnCount, survivorIds };
}

/**
 * 创建回合开始事件
 */
export function createTurnStartEvent(
  turnNumber: number,
  actorId: string
): TurnStartEvent {
  return { kind: 'turnStart', turnNumber, actorId };
}

/**
 * 创建移动事件
 * @deprecated 使用 createMoveStartEvent 和 createMoveCompleteEvent 替代
 */
export function createMoveEvent(
  actorId: string,
  fromHex: { q: number; r: number },
  toHex: { q: number; r: number }
): MoveEvent {
  return { kind: 'move', actorId, fromHex, toHex };
}

/**
 * 创建开始移动事件
 */
export function createMoveStartEvent(
  actorId: string,
  fromHex: { q: number; r: number },
  toHex: { q: number; r: number }
): MoveStartEvent {
  return { kind: 'move_start', actorId, fromHex, toHex };
}

/**
 * 创建移动完成事件
 */
export function createMoveCompleteEvent(
  actorId: string,
  fromHex: { q: number; r: number },
  toHex: { q: number; r: number }
): MoveCompleteEvent {
  return { kind: 'move_complete', actorId, fromHex, toHex };
}

/**
 * 创建技能使用事件
 */
export function createSkillUseEvent(
  actorId: string,
  skillName: string,
  element: Element,
  options?: { targetActorId?: string; targetHex?: { q: number; r: number } }
): SkillUseEvent {
  return {
    kind: 'skillUse',
    actorId,
    skillName,
    element,
    ...options,
  };
}

/**
 * 创建伤害事件（InkMon 特有）
 */
export function createDamageEvent(
  targetActorId: string,
  damage: number,
  element: Element,
  options: {
    sourceActorId?: string;
    damageCategory: DamageCategory;
    effectiveness: EffectivenessLevel;
    typeMultiplier: number;
    isCritical: boolean;
    isSTAB: boolean;
  }
): DamageEvent {
  return {
    kind: 'damage',
    targetActorId,
    damage,
    element,
    sourceActorId: options.sourceActorId,
    damageCategory: options.damageCategory,
    effectiveness: options.effectiveness,
    typeMultiplier: options.typeMultiplier,
    isCritical: options.isCritical,
    isSTAB: options.isSTAB,
  };
}

/**
 * 创建治疗事件
 */
export function createHealEvent(
  targetActorId: string,
  healAmount: number,
  sourceActorId?: string
): HealEvent {
  return { kind: 'heal', sourceActorId, targetActorId, healAmount };
}

/**
 * 创建死亡事件
 */
export function createDeathEvent(
  actorId: string,
  killerActorId?: string
): DeathEvent {
  return { kind: 'death', actorId, killerActorId };
}

/**
 * 创建跳过行动事件
 */
export function createSkipEvent(actorId: string): SkipEvent {
  return { kind: 'skip', actorId };
}

// ========== 类型守卫 ==========

export function isBattleStartEvent(event: GameEventBase): event is BattleStartEvent {
  return event.kind === 'battleStart';
}

export function isBattleEndEvent(event: GameEventBase): event is BattleEndEvent {
  return event.kind === 'battleEnd';
}

export function isTurnStartEvent(event: GameEventBase): event is TurnStartEvent {
  return event.kind === 'turnStart';
}

export function isMoveEvent(event: GameEventBase): event is MoveEvent {
  return event.kind === 'move';
}

export function isMoveStartEvent(event: GameEventBase): event is MoveStartEvent {
  return event.kind === 'move_start';
}

export function isMoveCompleteEvent(event: GameEventBase): event is MoveCompleteEvent {
  return event.kind === 'move_complete';
}

export function isSkillUseEvent(event: GameEventBase): event is SkillUseEvent {
  return event.kind === 'skillUse';
}

export function isDamageEvent(event: GameEventBase): event is DamageEvent {
  return event.kind === 'damage';
}

export function isHealEvent(event: GameEventBase): event is HealEvent {
  return event.kind === 'heal';
}

export function isDeathEvent(event: GameEventBase): event is DeathEvent {
  return event.kind === 'death';
}

export function isSkipEvent(event: GameEventBase): event is SkipEvent {
  return event.kind === 'skip';
}
