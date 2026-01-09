/**
 * ProjectileEvents - 投射物事件定义
 *
 * 定义投射物生命周期中的所有事件类型，用于：
 * - Ability 系统内部分发
 * - 通过 EventCollector 输出给表演层
 */

import type { ActorRef } from '../types/common.js';
import { Vector3 } from '@lomo/core';
import type { GameEventBase } from './GameEvent.js';

// ========== 事件类型常量 ==========

export const PROJECTILE_LAUNCHED_EVENT = 'projectileLaunched' as const;
export const PROJECTILE_HIT_EVENT = 'projectileHit' as const;
export const PROJECTILE_MISS_EVENT = 'projectileMiss' as const;
export const PROJECTILE_DESPAWN_EVENT = 'projectileDespawn' as const;
export const PROJECTILE_PIERCE_EVENT = 'projectilePierce' as const;

// ========== 事件接口 ==========

/**
 * 投射物发射事件
 *
 * 当投射物被创建并发射时触发
 */
export interface ProjectileLaunchedEvent extends GameEventBase {
  readonly kind: typeof PROJECTILE_LAUNCHED_EVENT;
  /** 投射物 ID */
  readonly projectileId: string;
  /** 发射者引用 */
  readonly source: ActorRef;
  /** 目标引用（可选） */
  readonly target?: ActorRef;
  /** 起始位置 */
  readonly startPosition: Vector3;
  /** 目标位置（可选） */
  readonly targetPosition?: Vector3;
  /** 投射物类型 */
  readonly projectileType: string;
  /** 飞行速度 */
  readonly speed: number;
}

/**
 * 投射物命中事件
 *
 * 当投射物命中目标时触发
 */
export interface ProjectileHitEvent extends GameEventBase {
  readonly kind: typeof PROJECTILE_HIT_EVENT;
  /** 投射物 ID */
  readonly projectileId: string;
  /** 发射者引用 */
  readonly source: ActorRef;
  /** 命中目标引用 */
  readonly target: ActorRef;
  /** 命中位置 */
  readonly hitPosition: Vector3;
  /** 伤害值（可选） */
  readonly damage?: number;
  /** 伤害类型（可选） */
  readonly damageType?: string;
  /** 是否暴击（可选） */
  readonly isCritical?: boolean;
  /** 是否致死（可选） */
  readonly isKill?: boolean;
  /** 飞行时间（毫秒） */
  readonly flyTime: number;
  /** 飞行距离 */
  readonly flyDistance: number;
}

/**
 * 投射物未命中事件
 *
 * 当投射物未命中目标时触发（超时、无目标等）
 */
export interface ProjectileMissEvent extends GameEventBase {
  readonly kind: typeof PROJECTILE_MISS_EVENT;
  /** 投射物 ID */
  readonly projectileId: string;
  /** 发射者引用 */
  readonly source: ActorRef;
  /** 原目标引用（可选） */
  readonly target?: ActorRef;
  /** 未命中原因 */
  readonly reason: string;
  /** 最终位置 */
  readonly finalPosition: Vector3;
  /** 飞行时间（毫秒） */
  readonly flyTime: number;
}

/**
 * 投射物消失事件
 *
 * 当投射物被销毁时触发
 */
export interface ProjectileDespawnEvent extends GameEventBase {
  readonly kind: typeof PROJECTILE_DESPAWN_EVENT;
  /** 投射物 ID */
  readonly projectileId: string;
  /** 发射者引用 */
  readonly source: ActorRef;
  /** 消失原因 */
  readonly reason: 'hit' | 'miss' | 'timeout' | 'manual';
}

/**
 * 投射物穿透事件
 *
 * 当穿透弹命中目标但继续飞行时触发
 */
export interface ProjectilePierceEvent extends GameEventBase {
  readonly kind: typeof PROJECTILE_PIERCE_EVENT;
  /** 投射物 ID */
  readonly projectileId: string;
  /** 发射者引用 */
  readonly source: ActorRef;
  /** 被穿透的目标 */
  readonly target: ActorRef;
  /** 穿透位置 */
  readonly piercePosition: Vector3;
  /** 当前穿透次数 */
  readonly pierceCount: number;
  /** 伤害值（可选） */
  readonly damage?: number;
}

// ========== 联合类型 ==========

/**
 * 所有投射物事件的联合类型
 */
export type ProjectileEvent =
  | ProjectileLaunchedEvent
  | ProjectileHitEvent
  | ProjectileMissEvent
  | ProjectileDespawnEvent
  | ProjectilePierceEvent;

// ========== 工厂函数 ==========

/**
 * 创建投射物发射事件
 */
export function createProjectileLaunchedEvent(
  projectileId: string,
  source: ActorRef,
  startPosition: Vector3,
  projectileType: string,
  speed: number,
  target?: ActorRef,
  targetPosition?: Vector3
): ProjectileLaunchedEvent {
  return {
    kind: PROJECTILE_LAUNCHED_EVENT,
    projectileId,
    source,
    target,
    startPosition,
    targetPosition,
    projectileType,
    speed,
  };
}

/**
 * 创建投射物命中事件
 */
export function createProjectileHitEvent(
  projectileId: string,
  source: ActorRef,
  target: ActorRef,
  hitPosition: Vector3,
  flyTime: number,
  flyDistance: number,
  options?: {
    damage?: number;
    damageType?: string;
    isCritical?: boolean;
    isKill?: boolean;
  }
): ProjectileHitEvent {
  return {
    kind: PROJECTILE_HIT_EVENT,
    projectileId,
    source,
    target,
    hitPosition,
    flyTime,
    flyDistance,
    ...options,
  };
}

/**
 * 创建投射物未命中事件
 */
export function createProjectileMissEvent(
  projectileId: string,
  source: ActorRef,
  reason: string,
  finalPosition: Vector3,
  flyTime: number,
  target?: ActorRef
): ProjectileMissEvent {
  return {
    kind: PROJECTILE_MISS_EVENT,
    projectileId,
    source,
    target,
    reason,
    finalPosition,
    flyTime,
  };
}

/**
 * 创建投射物消失事件
 */
export function createProjectileDespawnEvent(
  projectileId: string,
  source: ActorRef,
  reason: 'hit' | 'miss' | 'timeout' | 'manual'
): ProjectileDespawnEvent {
  return {
    kind: PROJECTILE_DESPAWN_EVENT,
    projectileId,
    source,
    reason,
  };
}

/**
 * 创建投射物穿透事件
 */
export function createProjectilePierceEvent(
  projectileId: string,
  source: ActorRef,
  target: ActorRef,
  piercePosition: Vector3,
  pierceCount: number,
  damage?: number
): ProjectilePierceEvent {
  return {
    kind: PROJECTILE_PIERCE_EVENT,
    projectileId,
    source,
    target,
    piercePosition,
    pierceCount,
    damage,
  };
}

// ========== 类型守卫 ==========

/**
 * 检查是否为投射物发射事件
 */
export function isProjectileLaunchedEvent(
  event: GameEventBase
): event is ProjectileLaunchedEvent {
  return event.kind === PROJECTILE_LAUNCHED_EVENT;
}

/**
 * 检查是否为投射物命中事件
 */
export function isProjectileHitEvent(
  event: GameEventBase
): event is ProjectileHitEvent {
  return event.kind === PROJECTILE_HIT_EVENT;
}

/**
 * 检查是否为投射物未命中事件
 */
export function isProjectileMissEvent(
  event: GameEventBase
): event is ProjectileMissEvent {
  return event.kind === PROJECTILE_MISS_EVENT;
}

/**
 * 检查是否为投射物消失事件
 */
export function isProjectileDespawnEvent(
  event: GameEventBase
): event is ProjectileDespawnEvent {
  return event.kind === PROJECTILE_DESPAWN_EVENT;
}

/**
 * 检查是否为投射物穿透事件
 */
export function isProjectilePierceEvent(
  event: GameEventBase
): event is ProjectilePierceEvent {
  return event.kind === PROJECTILE_PIERCE_EVENT;
}
