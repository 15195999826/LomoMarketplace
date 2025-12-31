/**
 * BattleGameEvents - 战斗游戏事件示例
 *
 * 这是一个示例文件，展示如何为回合制/ATB 战斗游戏定义事件类型。
 * 游戏应该根据自己的需求定义事件，而不是直接使用这些类型。
 *
 * @example
 * ```typescript
 * // 在你的游戏中定义自己的事件
 * import type { GameEventBase } from '@lomo/logic-game-framework';
 *
 * type MyDamageEvent = GameEventBase & {
 *   kind: 'damage';
 *   source: ActorRef;
 *   target: ActorRef;
 *   damage: number;
 *   element?: 'fire' | 'ice' | 'lightning'; // 游戏特有字段
 * };
 * ```
 */

import type { ActorRef } from '../../src/core/types/common.js';
import type { GameEventBase } from '../../src/core/events/GameEvent.js';

// ========== 具体事件类型示例 ==========

/**
 * 伤害事件
 */
export type DamageGameEvent = GameEventBase & {
  readonly kind: 'damage';
  readonly source: ActorRef;
  readonly target: ActorRef;
  readonly damage: number;
  readonly damageType?: string;
  readonly isCritical: boolean;
  readonly isKill: boolean;
};

/**
 * 治疗事件
 */
export type HealGameEvent = GameEventBase & {
  readonly kind: 'heal';
  readonly source: ActorRef;
  readonly target: ActorRef;
  readonly healAmount: number;
  readonly overheal?: number;
};

/**
 * 回合开始事件
 */
export type TurnStartGameEvent = GameEventBase & {
  readonly kind: 'turnStart';
  readonly roundNumber: number;
  readonly activeUnit: ActorRef;
};

/**
 * 回合结束事件
 */
export type TurnEndGameEvent = GameEventBase & {
  readonly kind: 'turnEnd';
  readonly roundNumber: number;
  readonly unit: ActorRef;
};

/**
 * 输入操作事件
 */
export type InputActionGameEvent = GameEventBase & {
  readonly kind: 'inputAction';
  readonly actor: ActorRef;
  readonly abilityId: string;
  readonly targets: ActorRef[];
};

/**
 * 死亡事件
 */
export type DeathGameEvent = GameEventBase & {
  readonly kind: 'death';
  readonly target: ActorRef;
  readonly killer?: ActorRef;
};

/**
 * 移动事件
 */
export type MoveGameEvent = GameEventBase & {
  readonly kind: 'move';
  readonly unit: ActorRef;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
};

/**
 * 战斗开始事件
 */
export type BattleStartGameEvent = GameEventBase & {
  readonly kind: 'battleStart';
  readonly battleId: string;
  readonly participants: ActorRef[];
};

/**
 * 战斗结束事件
 */
export type BattleEndGameEvent = GameEventBase & {
  readonly kind: 'battleEnd';
  readonly battleId: string;
  readonly winner?: 'teamA' | 'teamB' | 'draw';
  readonly participants?: ActorRef[];
};

/**
 * Buff 应用事件
 */
export type BuffAppliedGameEvent = GameEventBase & {
  readonly kind: 'buffApplied';
  readonly source: ActorRef;
  readonly target: ActorRef;
  readonly buffId: string;
  readonly buffName?: string;
  readonly stacks: number;
};

/**
 * Buff 移除事件
 */
export type BuffRemovedGameEvent = GameEventBase & {
  readonly kind: 'buffRemoved';
  readonly target: ActorRef;
  readonly buffId: string;
  readonly reason: 'expired' | 'dispelled' | 'replaced' | 'manual';
};

// ========== 联合类型 ==========

/**
 * 战斗游戏事件联合类型（示例）
 */
export type BattleGameEvent =
  | DamageGameEvent
  | HealGameEvent
  | TurnStartGameEvent
  | TurnEndGameEvent
  | InputActionGameEvent
  | DeathGameEvent
  | MoveGameEvent
  | BattleStartGameEvent
  | BattleEndGameEvent
  | BuffAppliedGameEvent
  | BuffRemovedGameEvent;

/**
 * 事件类型字符串
 */
export type BattleGameEventKind = BattleGameEvent['kind'];

// ========== 辅助函数示例 ==========

/**
 * 检查事件是否与特定 Actor 相关（示例）
 */
export function isEventRelatedToActor(event: BattleGameEvent, actorRef: ActorRef): boolean {
  switch (event.kind) {
    case 'damage':
      return event.source.id === actorRef.id || event.target.id === actorRef.id;
    case 'heal':
      return event.source.id === actorRef.id || event.target.id === actorRef.id;
    case 'turnStart':
      return event.activeUnit.id === actorRef.id;
    case 'turnEnd':
      return event.unit.id === actorRef.id;
    case 'inputAction':
      return event.actor.id === actorRef.id || event.targets.some((t) => t.id === actorRef.id);
    case 'death':
      return event.target.id === actorRef.id || event.killer?.id === actorRef.id;
    case 'move':
      return event.unit.id === actorRef.id;
    case 'battleStart':
    case 'battleEnd':
      return event.participants?.some((p) => p.id === actorRef.id) ?? false;
    case 'buffApplied':
      return event.source.id === actorRef.id || event.target.id === actorRef.id;
    case 'buffRemoved':
      return event.target.id === actorRef.id;
    default:
      return false;
  }
}

// ========== 事件创建工厂示例 ==========

/**
 * 创建伤害事件
 */
export function createDamageEvent(
  logicTime: number,
  source: ActorRef,
  target: ActorRef,
  damage: number,
  options?: {
    damageType?: string;
    isCritical?: boolean;
    isKill?: boolean;
  }
): DamageGameEvent {
  return {
    kind: 'damage',
    logicTime,
    source,
    target,
    damage,
    damageType: options?.damageType,
    isCritical: options?.isCritical ?? false,
    isKill: options?.isKill ?? false,
  };
}

/**
 * 创建治疗事件
 */
export function createHealEvent(
  logicTime: number,
  source: ActorRef,
  target: ActorRef,
  healAmount: number,
  overheal?: number
): HealGameEvent {
  return {
    kind: 'heal',
    logicTime,
    source,
    target,
    healAmount,
    overheal,
  };
}

/**
 * 创建回合开始事件
 */
export function createTurnStartEvent(
  logicTime: number,
  roundNumber: number,
  activeUnit: ActorRef
): TurnStartGameEvent {
  return {
    kind: 'turnStart',
    logicTime,
    roundNumber,
    activeUnit,
  };
}

/**
 * 创建回合结束事件
 */
export function createTurnEndEvent(
  logicTime: number,
  roundNumber: number,
  unit: ActorRef
): TurnEndGameEvent {
  return {
    kind: 'turnEnd',
    logicTime,
    roundNumber,
    unit,
  };
}

/**
 * 创建死亡事件
 */
export function createDeathEvent(
  logicTime: number,
  target: ActorRef,
  killer?: ActorRef
): DeathGameEvent {
  return {
    kind: 'death',
    logicTime,
    target,
    killer,
  };
}
