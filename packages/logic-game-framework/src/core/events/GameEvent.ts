/**
 * GameEvent - 游戏事件类型系统
 *
 * 用于 AbilitySet 内部事件分发，触发 ActionComponent 响应。
 * 与 BattleEvent 的区别：
 * - BattleEvent: 逻辑层 → 表演层，用于动画/特效
 * - GameEvent: Ability 系统内部，用于触发被动技能
 *
 * 使用 Discriminated Union 实现异构事件数据，
 * 通过 `kind` 字段区分事件类型，获得类型安全的事件处理。
 */

import type { ActorRef } from '../types/common.js';

// ========== 事件基础接口 ==========

/**
 * 事件基础接口
 */
interface GameEventBase {
  /** 逻辑时间戳（毫秒） */
  readonly logicTime: number;
}

// ========== 具体事件类型 ==========

/**
 * 伤害事件 - 角色A对角色B造成X伤害
 */
export type DamageGameEvent = GameEventBase & {
  readonly kind: 'damage';
  /** 伤害来源 */
  readonly source: ActorRef;
  /** 伤害目标 */
  readonly target: ActorRef;
  /** 伤害数值 */
  readonly damage: number;
  /** 伤害类型（物理/魔法/真实等） */
  readonly damageType?: string;
  /** 是否暴击 */
  readonly isCritical: boolean;
  /** 是否击杀 */
  readonly isKill: boolean;
};

/**
 * 治疗事件
 */
export type HealGameEvent = GameEventBase & {
  readonly kind: 'heal';
  /** 治疗来源 */
  readonly source: ActorRef;
  /** 治疗目标 */
  readonly target: ActorRef;
  /** 治疗量 */
  readonly healAmount: number;
  /** 过量治疗（溢出部分） */
  readonly overheal?: number;
};

/**
 * 回合开始事件
 */
export type TurnStartGameEvent = GameEventBase & {
  readonly kind: 'turnStart';
  /** 回合数 */
  readonly roundNumber: number;
  /** 当前行动单位 */
  readonly activeUnit: ActorRef;
};

/**
 * 回合结束事件
 */
export type TurnEndGameEvent = GameEventBase & {
  readonly kind: 'turnEnd';
  /** 回合数 */
  readonly roundNumber: number;
  /** 回合结束的单位 */
  readonly unit: ActorRef;
};

/**
 * 输入操作事件 - 角色执行技能
 */
export type InputActionGameEvent = GameEventBase & {
  readonly kind: 'inputAction';
  /** 行动者 */
  readonly actor: ActorRef;
  /** 使用的技能 ID */
  readonly abilityId: string;
  /** 技能目标 */
  readonly targets: ActorRef[];
};

/**
 * 死亡事件
 */
export type DeathGameEvent = GameEventBase & {
  readonly kind: 'death';
  /** 死亡单位 */
  readonly target: ActorRef;
  /** 击杀者（可选） */
  readonly killer?: ActorRef;
};

/**
 * 移动事件
 */
export type MoveGameEvent = GameEventBase & {
  readonly kind: 'move';
  /** 移动单位 */
  readonly unit: ActorRef;
  /** 起始位置 */
  readonly fromX: number;
  readonly fromY: number;
  /** 目标位置 */
  readonly toX: number;
  readonly toY: number;
};

/**
 * 战斗开始事件
 */
export type BattleStartGameEvent = GameEventBase & {
  readonly kind: 'battleStart';
  /** 战斗 ID */
  readonly battleId: string;
  /** 参与者列表 */
  readonly participants: ActorRef[];
};

/**
 * 战斗结束事件
 */
export type BattleEndGameEvent = GameEventBase & {
  readonly kind: 'battleEnd';
  /** 战斗 ID */
  readonly battleId: string;
  /** 获胜方 */
  readonly winner?: 'teamA' | 'teamB' | 'draw';
  /** 参与者列表 */
  readonly participants?: ActorRef[];
};

/**
 * Buff 应用事件
 */
export type BuffAppliedGameEvent = GameEventBase & {
  readonly kind: 'buffApplied';
  /** Buff 来源 */
  readonly source: ActorRef;
  /** Buff 目标 */
  readonly target: ActorRef;
  /** Buff ID */
  readonly buffId: string;
  /** Buff 名称 */
  readonly buffName?: string;
  /** 层数 */
  readonly stacks: number;
};

/**
 * Buff 移除事件
 */
export type BuffRemovedGameEvent = GameEventBase & {
  readonly kind: 'buffRemoved';
  /** Buff 目标 */
  readonly target: ActorRef;
  /** Buff ID */
  readonly buffId: string;
  /** 移除原因 */
  readonly reason: 'expired' | 'dispelled' | 'replaced' | 'manual';
};

// ========== 联合类型 ==========

/**
 * 所有游戏事件的联合类型
 */
export type GameEvent =
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
export type GameEventKind = GameEvent['kind'];

// ========== 辅助函数 ==========

/**
 * 类型守卫：检查事件是否与特定 Actor 相关
 */
export function isEventRelatedToActor(event: GameEvent, actorRef: ActorRef): boolean {
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

/**
 * 获取事件的相关 Actor 列表
 */
export function getEventRelatedActors(event: GameEvent): ActorRef[] {
  switch (event.kind) {
    case 'damage':
      return [event.source, event.target];
    case 'heal':
      return [event.source, event.target];
    case 'turnStart':
      return [event.activeUnit];
    case 'turnEnd':
      return [event.unit];
    case 'inputAction':
      return [event.actor, ...event.targets];
    case 'death':
      return event.killer ? [event.target, event.killer] : [event.target];
    case 'move':
      return [event.unit];
    case 'battleStart':
    case 'battleEnd':
      return event.participants ?? [];
    case 'buffApplied':
      return [event.source, event.target];
    case 'buffRemoved':
      return [event.target];
    default:
      return [];
  }
}

// ========== 事件创建工厂 ==========

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
