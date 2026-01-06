/**
 * Replay Events - 战斗回放事件类型定义
 *
 * 定义 hex-atb-battle 项目特有的回放事件类型。
 * 这些事件由各 Action 产生，记录到回放时间线中。
 *
 * ## 命名约定
 *
 * - 事件使用过去时态命名（表示"已发生的事实"）
 * - Actor 引用使用 `actorId: string`（不使用 ActorRef）
 * - 坐标使用 `{ q: number; r: number }` 格式
 */

import type { GameEventBase } from '@lomo/logic-game-framework';

// ========== 伤害类型 ==========

/** 伤害类型 */
export type DamageType = 'physical' | 'magical' | 'pure';

// ========== 战斗事件接口 ==========

/**
 * 伤害事件
 *
 * 由 DamageAction 产生。
 */
export interface DamageEvent extends GameEventBase {
  readonly kind: 'damage';
  /** 伤害来源 Actor ID（可选，如环境伤害无来源） */
  readonly sourceActorId?: string;
  /** 受击目标 Actor ID */
  readonly targetActorId: string;
  /** 伤害值 */
  readonly damage: number;
  /** 伤害类型 */
  readonly damageType: DamageType;
  /** 是否暴击（可选） */
  readonly isCritical?: boolean;
  /** 是否反伤（可选，用于防止反伤链） */
  readonly isReflected?: boolean;
}

/**
 * 治疗事件
 *
 * 由 HealAction 产生。
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
 * 移动事件
 *
 * 由 MoveAction 产生。
 */
export interface MoveEvent extends GameEventBase {
  readonly kind: 'move';
  /** 移动的 Actor ID */
  readonly actorId: string;
  /** 起始坐标 */
  readonly fromHex: { q: number; r: number };
  /** 目标坐标 */
  readonly toHex: { q: number; r: number };
  /** 路径（可选，用于多格移动动画） */
  readonly path?: Array<{ q: number; r: number }>;
}

/**
 * 死亡事件
 *
 * 由 DamageAction（致死伤害后）产生。
 */
export interface DeathEvent extends GameEventBase {
  readonly kind: 'death';
  /** 死亡的 Actor ID */
  readonly actorId: string;
  /** 击杀者 Actor ID（可选） */
  readonly killerActorId?: string;
}

// ========== 工厂函数 ==========

/**
 * 创建伤害事件
 */
export function createDamageEvent(
  targetActorId: string,
  damage: number,
  damageType: DamageType,
  sourceActorId?: string,
  options?: { isCritical?: boolean; isReflected?: boolean }
): DamageEvent {
  return {
    kind: 'damage',
    sourceActorId,
    targetActorId,
    damage,
    damageType,
    ...options,
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
  return {
    kind: 'heal',
    sourceActorId,
    targetActorId,
    healAmount,
  };
}

/**
 * 创建移动事件
 */
export function createMoveEvent(
  actorId: string,
  fromHex: { q: number; r: number },
  toHex: { q: number; r: number },
  path?: Array<{ q: number; r: number }>
): MoveEvent {
  return {
    kind: 'move',
    actorId,
    fromHex,
    toHex,
    path,
  };
}

/**
 * 创建死亡事件
 */
export function createDeathEvent(
  actorId: string,
  killerActorId?: string
): DeathEvent {
  return {
    kind: 'death',
    actorId,
    killerActorId,
  };
}

// ========== 类型守卫 ==========

export function isDamageEvent(event: GameEventBase): event is DamageEvent {
  return event.kind === 'damage';
}

export function isHealEvent(event: GameEventBase): event is HealEvent {
  return event.kind === 'heal';
}

export function isMoveEvent(event: GameEventBase): event is MoveEvent {
  return event.kind === 'move';
}

export function isDeathEvent(event: GameEventBase): event is DeathEvent {
  return event.kind === 'death';
}
