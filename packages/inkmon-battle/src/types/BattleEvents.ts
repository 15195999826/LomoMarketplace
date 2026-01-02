/**
 * BattleEvents - 战斗事件类型定义
 */

import type { GameEventBase, ActorRef } from '@lomo/logic-game-framework';
import type { AxialCoord } from '@lomo/hex-grid';
import type { Element } from '@inkmon/core';
import type { EffectivenessLevel } from './TypeEffectiveness.js';

// ========== 战斗流程事件 ==========

/**
 * 战斗开始事件
 */
export interface BattleStartEvent extends GameEventBase {
  readonly kind: 'battle_start';
  readonly teamA: ActorRef[];
  readonly teamB: ActorRef[];
}

/**
 * 战斗结束事件
 */
export interface BattleEndEvent extends GameEventBase {
  readonly kind: 'battle_end';
  readonly result: 'teamA_win' | 'teamB_win' | 'draw';
  readonly turnCount: number;
  readonly survivors: ActorRef[];
}

/**
 * 回合开始事件
 */
export interface TurnStartEvent extends GameEventBase {
  readonly kind: 'turn_start';
  readonly turnNumber: number;
  readonly unit: ActorRef;
  readonly unitName: string;
  readonly hp: number;
  readonly maxHp: number;
}

// ========== 行动事件 ==========

/**
 * 移动事件
 */
export interface MoveEvent extends GameEventBase {
  readonly kind: 'move';
  readonly unit: ActorRef;
  readonly unitName: string;
  readonly from: AxialCoord;
  readonly to: AxialCoord;
}

/**
 * 攻击事件
 */
export interface AttackEvent extends GameEventBase {
  readonly kind: 'attack';
  readonly attacker: ActorRef;
  readonly attackerName: string;
  readonly target: ActorRef;
  readonly targetName: string;
  readonly skillName: string;
  readonly element: Element;
}

/**
 * 伤害事件
 */
export interface DamageEvent extends GameEventBase {
  readonly kind: 'damage';
  readonly source: ActorRef;
  readonly sourceName: string;
  readonly target: ActorRef;
  readonly targetName: string;
  readonly damage: number;
  readonly element: Element;
  readonly effectiveness: EffectivenessLevel;
  readonly isCritical: boolean;
  readonly isSTAB: boolean;
  readonly remainingHp: number;
  readonly maxHp: number;
}

/**
 * 死亡事件
 */
export interface DeathEvent extends GameEventBase {
  readonly kind: 'death';
  readonly unit: ActorRef;
  readonly unitName: string;
  readonly killer: ActorRef;
  readonly killerName: string;
  readonly position: AxialCoord;
}

/**
 * 跳过行动事件
 */
export interface SkipEvent extends GameEventBase {
  readonly kind: 'skip';
  readonly unit: ActorRef;
  readonly unitName: string;
}

// ========== 联合类型 ==========

/**
 * 所有战斗事件类型
 */
export type InkMonBattleEvent =
  | BattleStartEvent
  | BattleEndEvent
  | TurnStartEvent
  | MoveEvent
  | AttackEvent
  | DamageEvent
  | DeathEvent
  | SkipEvent;

/**
 * 战斗事件种类
 */
export type InkMonBattleEventKind = InkMonBattleEvent['kind'];
