/**
 * 战斗事件
 *
 * 逻辑层输出的事件信封结构
 * 表演层消费这些事件来播放动画/特效
 */

import type { ActorRef } from '../types/common.js';

/**
 * 战斗事件基础类型
 * 使用泛型 T 定义 payload 类型，确保类型安全
 */
export type BattleEvent<T = unknown> = {
  /** 事件类型 */
  readonly type: string;

  /** 逻辑时间戳（毫秒） */
  readonly logicTime: number;

  /** 事件负载 */
  readonly payload: T;

  /** 事件 ID（便于追踪） */
  readonly id?: string;
};

/**
 * 创建战斗事件的辅助函数
 */
export function createBattleEvent<T>(
  type: string,
  logicTime: number,
  payload: T,
  id?: string
): BattleEvent<T> {
  return { type, logicTime, payload, id };
}

// ========== 标准事件 Payload 类型 ==========

/**
 * 伤害事件 Payload
 */
export type DamageEventPayload = {
  readonly source: ActorRef;
  readonly target: ActorRef;
  readonly damage: number;
  readonly damageType?: string;
  readonly isCritical: boolean;
  readonly isKill: boolean;
};

/**
 * 治疗事件 Payload
 */
export type HealEventPayload = {
  readonly source: ActorRef;
  readonly target: ActorRef;
  readonly healAmount: number;
  readonly overheal?: number;
};

/**
 * Buff 应用事件 Payload
 */
export type BuffAppliedEventPayload = {
  readonly source: ActorRef;
  readonly target: ActorRef;
  readonly buffId: string;
  readonly buffName?: string;
  readonly stacks: number;
  readonly duration?: number;
  readonly isRefresh: boolean;
};

/**
 * Buff 移除事件 Payload
 */
export type BuffRemovedEventPayload = {
  readonly target: ActorRef;
  readonly buffId: string;
  readonly reason: 'expired' | 'dispelled' | 'replaced' | 'manual';
};

/**
 * 死亡事件 Payload
 */
export type DeathEventPayload = {
  readonly target: ActorRef;
  readonly killer?: ActorRef;
  readonly damageSource?: string;
};

/**
 * 移动事件 Payload
 */
export type MoveEventPayload = {
  readonly unit: ActorRef;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
};

/**
 * 技能使用事件 Payload
 */
export type AbilityUsedEventPayload = {
  readonly source: ActorRef;
  readonly abilityId: string;
  readonly abilityName?: string;
  readonly targets: ActorRef[];
};

/**
 * 回合开始事件 Payload
 */
export type TurnStartEventPayload = {
  readonly roundNumber: number;
  readonly activeUnit: ActorRef;
};

/**
 * 回合结束事件 Payload
 */
export type TurnEndEventPayload = {
  readonly roundNumber: number;
  readonly unit: ActorRef;
};

/**
 * 战斗开始事件 Payload
 */
export type BattleStartEventPayload = {
  readonly battleId: string;
  readonly participants: ActorRef[];
};

/**
 * 战斗结束事件 Payload
 */
export type BattleEndEventPayload = {
  readonly battleId: string;
  readonly winner?: 'teamA' | 'teamB' | 'draw';
  readonly survivors: ActorRef[];
};

/**
 * 错误事件 Payload
 */
export type ErrorEventPayload = {
  readonly errorType: 'action_failed' | 'component_error' | 'config_invalid';
  readonly message: string;
  readonly context?: Record<string, unknown>;
};

// ========== 事件类型常量 ==========

export const EventTypes = {
  // 战斗流程
  BATTLE_START: 'battle_start',
  BATTLE_END: 'battle_end',
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',

  // 行动
  ABILITY_USED: 'ability_used',
  DAMAGE: 'damage',
  HEAL: 'heal',
  DEATH: 'death',
  MOVE: 'move',

  // Buff
  BUFF_APPLIED: 'buff_applied',
  BUFF_REMOVED: 'buff_removed',
  BUFF_STACKED: 'buff_stacked',

  // 系统
  ERROR: 'error',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

// ========== 类型安全的事件类型 ==========

export type DamageEvent = BattleEvent<DamageEventPayload>;
export type HealEvent = BattleEvent<HealEventPayload>;
export type BuffAppliedEvent = BattleEvent<BuffAppliedEventPayload>;
export type BuffRemovedEvent = BattleEvent<BuffRemovedEventPayload>;
export type DeathEvent = BattleEvent<DeathEventPayload>;
export type MoveEvent = BattleEvent<MoveEventPayload>;
export type AbilityUsedEvent = BattleEvent<AbilityUsedEventPayload>;
export type TurnStartEvent = BattleEvent<TurnStartEventPayload>;
export type TurnEndEvent = BattleEvent<TurnEndEventPayload>;
export type BattleStartEvent = BattleEvent<BattleStartEventPayload>;
export type BattleEndEvent = BattleEvent<BattleEndEventPayload>;
export type ErrorEvent = BattleEvent<ErrorEventPayload>;
