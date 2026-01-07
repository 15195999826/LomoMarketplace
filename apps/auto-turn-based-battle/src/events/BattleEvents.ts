/**
 * 战斗事件类型定义
 *
 * 用于解耦战斗逻辑与表演层/日志系统/成就系统等。
 * 所有事件通过 EventCollector 发出，外部监听处理。
 *
 * ## 事件分类
 *
 * 1. 战斗流程事件: BattleStart, RoundStart, TurnStart 等
 * 2. 战斗行动事件: Damage, Heal, Move, SkillUse 等
 * 3. 状态变化事件: Death, Buff, Debuff 等
 */

import type { GameEventBase } from "@lomo/logic-game-framework";

// ========== 事件类型常量 ==========

/** 战斗开始 */
export const BATTLE_START_EVENT = "battle.start" as const;
/** 战斗结束 */
export const BATTLE_END_EVENT = "battle.end" as const;
/** 回合开始 */
export const ROUND_START_EVENT = "battle.roundStart" as const;
/** 回合结束 */
export const ROUND_END_EVENT = "battle.roundEnd" as const;
/** 角色获得行动权 */
export const TURN_START_EVENT = "battle.turnStart" as const;
/** 角色结束行动 */
export const TURN_END_EVENT = "battle.turnEnd" as const;
/** 伤害事件 */
export const DAMAGE_EVENT = "battle.damage" as const;
/** 治疗事件 */
export const HEAL_EVENT = "battle.heal" as const;
/** 死亡事件 */
export const DEATH_EVENT = "battle.death" as const;
/** 移动事件 */
export const MOVE_EVENT = "battle.move" as const;
/** 技能使用事件 */
export const SKILL_USE_EVENT = "battle.skillUse" as const;
/** 技能冷却事件 */
export const COOLDOWN_EVENT = "battle.cooldown" as const;
/** 跳过行动事件 */
export const SKIP_TURN_EVENT = "battle.skipTurn" as const;

// ========== 战斗流程事件 ==========

/**
 * 战斗开始事件
 */
export interface BattleStartEvent extends GameEventBase {
  readonly kind: typeof BATTLE_START_EVENT;
  /** 战斗 ID */
  readonly battleId: string;
  /** 队伍 A 单位 ID 列表 */
  readonly teamA: readonly string[];
  /** 队伍 B 单位 ID 列表 */
  readonly teamB: readonly string[];
}

/**
 * 战斗结束事件
 */
export interface BattleEndEvent extends GameEventBase {
  readonly kind: typeof BATTLE_END_EVENT;
  /** 战斗 ID */
  readonly battleId: string;
  /** 战斗结果 */
  readonly result: "Victory" | "Defeat" | "Draw";
  /** 获胜队伍 ID（-1 表示平局） */
  readonly winnerTeamId: number;
  /** 总回合数 */
  readonly totalRounds: number;
}

/**
 * 回合开始事件
 */
export interface RoundStartEvent extends GameEventBase {
  readonly kind: typeof ROUND_START_EVENT;
  /** 回合数 */
  readonly round: number;
  /** 行动顺序（单位 ID 列表） */
  readonly actionOrder: readonly string[];
}

/**
 * 回合结束事件
 */
export interface RoundEndEvent extends GameEventBase {
  readonly kind: typeof ROUND_END_EVENT;
  /** 回合数 */
  readonly round: number;
  /** 队伍 A 存活数 */
  readonly aliveCountA: number;
  /** 队伍 B 存活数 */
  readonly aliveCountB: number;
}

/**
 * 角色获得行动权事件
 */
export interface TurnStartEvent extends GameEventBase {
  readonly kind: typeof TURN_START_EVENT;
  /** 角色 ID */
  readonly unitId: string;
  /** 当前 HP */
  readonly hp: number;
  /** 最大 HP */
  readonly maxHp: number;
  /** 当前行动点 */
  readonly actionPoint: number;
  /** 最大行动点 */
  readonly maxActionPoint: number;
}

/**
 * 角色结束行动事件
 */
export interface TurnEndEvent extends GameEventBase {
  readonly kind: typeof TURN_END_EVENT;
  /** 角色 ID */
  readonly unitId: string;
}

/**
 * 跳过行动事件（眩晕等）
 */
export interface SkipTurnEvent extends GameEventBase {
  readonly kind: typeof SKIP_TURN_EVENT;
  /** 角色 ID */
  readonly unitId: string;
  /** 跳过原因 */
  readonly reason: string;
}

// ========== 战斗行动事件 ==========

/**
 * 伤害事件
 */
export interface DamageEvent extends GameEventBase {
  readonly kind: typeof DAMAGE_EVENT;
  /** 伤害来源 ID */
  readonly sourceId: string;
  /** 受击目标 ID */
  readonly targetId: string;
  /** 伤害值 */
  readonly damage: number;
  /** 是否暴击 */
  readonly isCrit: boolean;
  /** 目标剩余 HP */
  readonly remainingHp: number;
  /** 技能类型（可选） */
  readonly skillType?: string;
  /** 是否是 AOE 伤害 */
  readonly isAoe?: boolean;
}

/**
 * 治疗事件
 */
export interface HealEvent extends GameEventBase {
  readonly kind: typeof HEAL_EVENT;
  /** 治疗来源 ID */
  readonly sourceId: string;
  /** 治疗目标 ID */
  readonly targetId: string;
  /** 治疗量 */
  readonly amount: number;
  /** 目标当前 HP */
  readonly currentHp: number;
  /** 是否是自我治疗 */
  readonly isSelfHeal: boolean;
}

/**
 * 死亡事件
 */
export interface DeathEvent extends GameEventBase {
  readonly kind: typeof DEATH_EVENT;
  /** 死亡角色 ID */
  readonly unitId: string;
  /** 击杀者 ID（可选） */
  readonly killerId?: string;
}

/**
 * 移动事件
 */
export interface MoveEvent extends GameEventBase {
  readonly kind: typeof MOVE_EVENT;
  /** 角色 ID */
  readonly unitId: string;
  /** 起始位置 */
  readonly from: { x: number; y: number };
  /** 目标位置 */
  readonly to: { x: number; y: number };
}

/**
 * 技能使用事件
 */
export interface SkillUseEvent extends GameEventBase {
  readonly kind: typeof SKILL_USE_EVENT;
  /** 使用者 ID */
  readonly unitId: string;
  /** 技能类型 */
  readonly skillType: string;
  /** 技能名称 */
  readonly skillName: string;
  /** 目标 ID（可选） */
  readonly targetId?: string;
  /** 目标位置（可选） */
  readonly targetPosition?: { x: number; y: number };
}

/**
 * 技能冷却事件
 */
export interface CooldownEvent extends GameEventBase {
  readonly kind: typeof COOLDOWN_EVENT;
  /** 角色 ID */
  readonly unitId: string;
  /** 技能类型 */
  readonly skillType: string;
  /** 技能名称 */
  readonly skillName: string;
  /** 冷却回合数 */
  readonly cooldown: number;
}

// ========== 联合类型 ==========

/**
 * 所有战斗事件的联合类型
 */
export type BattleEvent =
  | BattleStartEvent
  | BattleEndEvent
  | RoundStartEvent
  | RoundEndEvent
  | TurnStartEvent
  | TurnEndEvent
  | SkipTurnEvent
  | DamageEvent
  | HealEvent
  | DeathEvent
  | MoveEvent
  | SkillUseEvent
  | CooldownEvent;

/**
 * 战斗事件类型常量联合
 */
export type BattleEventKind = BattleEvent["kind"];

// ========== 工厂函数 ==========

export function createBattleStartEvent(
  battleId: string,
  teamA: readonly string[],
  teamB: readonly string[],
): BattleStartEvent {
  return { kind: BATTLE_START_EVENT, battleId, teamA, teamB };
}

export function createBattleEndEvent(
  battleId: string,
  result: "Victory" | "Defeat" | "Draw",
  winnerTeamId: number,
  totalRounds: number,
): BattleEndEvent {
  return { kind: BATTLE_END_EVENT, battleId, result, winnerTeamId, totalRounds };
}

export function createRoundStartEvent(
  round: number,
  actionOrder: readonly string[],
): RoundStartEvent {
  return { kind: ROUND_START_EVENT, round, actionOrder };
}

export function createRoundEndEvent(
  round: number,
  aliveCountA: number,
  aliveCountB: number,
): RoundEndEvent {
  return { kind: ROUND_END_EVENT, round, aliveCountA, aliveCountB };
}

export function createTurnStartEvent(
  unitId: string,
  hp: number,
  maxHp: number,
  actionPoint: number,
  maxActionPoint: number,
): TurnStartEvent {
  return { kind: TURN_START_EVENT, unitId, hp, maxHp, actionPoint, maxActionPoint };
}

export function createTurnEndEvent(unitId: string): TurnEndEvent {
  return { kind: TURN_END_EVENT, unitId };
}

export function createSkipTurnEvent(unitId: string, reason: string): SkipTurnEvent {
  return { kind: SKIP_TURN_EVENT, unitId, reason };
}

export function createDamageEvent(
  sourceId: string,
  targetId: string,
  damage: number,
  isCrit: boolean,
  remainingHp: number,
  skillType?: string,
  isAoe?: boolean,
): DamageEvent {
  return {
    kind: DAMAGE_EVENT,
    sourceId,
    targetId,
    damage,
    isCrit,
    remainingHp,
    skillType,
    isAoe,
  };
}

export function createHealEvent(
  sourceId: string,
  targetId: string,
  amount: number,
  currentHp: number,
): HealEvent {
  return {
    kind: HEAL_EVENT,
    sourceId,
    targetId,
    amount,
    currentHp,
    isSelfHeal: sourceId === targetId,
  };
}

export function createDeathEvent(unitId: string, killerId?: string): DeathEvent {
  return { kind: DEATH_EVENT, unitId, killerId };
}

export function createMoveEvent(
  unitId: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
): MoveEvent {
  return { kind: MOVE_EVENT, unitId, from, to };
}

export function createSkillUseEvent(
  unitId: string,
  skillType: string,
  skillName: string,
  targetId?: string,
  targetPosition?: { x: number; y: number },
): SkillUseEvent {
  return { kind: SKILL_USE_EVENT, unitId, skillType, skillName, targetId, targetPosition };
}

export function createCooldownEvent(
  unitId: string,
  skillType: string,
  skillName: string,
  cooldown: number,
): CooldownEvent {
  return { kind: COOLDOWN_EVENT, unitId, skillType, skillName, cooldown };
}
