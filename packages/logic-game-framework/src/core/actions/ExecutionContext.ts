/**
 * 执行上下文
 *
 * Action 执行时的上下文信息。
 * 仅存在于 Action 链执行流程中。
 */

import type { ActorRef } from '../types/common.js';
import type { EventCollector } from '../events/EventCollector.js';
import type { GameEventBase } from '../events/GameEvent.js';

// 前向声明（避免循环依赖）
export interface IAbility {
  readonly id: string;
  readonly configId: string;
  readonly owner: ActorRef;
  readonly source: ActorRef;
}

/**
 * 执行上下文
 *
 * Action 执行时可访问的所有信息，按职责分组：
 * 1. 触发信息 - 什么事件触发了这次执行
 * 2. 参与者 - 谁在执行、目标是谁
 * 3. 输出通道 - 如何产生副作用
 * 4. 执行状态 - 回调机制相关
 */
export type ExecutionContext = {
  // ========== 触发信息 ==========

  /**
   * 触发事件
   *
   * 触发此 Action 链执行的 GameEvent。
   * Action 可从中获取事件相关数据（如伤害值、来源等）。
   *
   * @example
   * ```typescript
   * const event = ctx.triggerEvent as DamageGameEvent;
   * const damage = event.damage;
   * ```
   */
  readonly triggerEvent: GameEventBase;

  /**
   * 游戏状态
   *
   * 框架层不对类型做假设，由项目层定义具体类型。
   * 项目可以传入：
   * - 游戏实例引用（实时数据）
   * - 状态快照（事件发生时的数据）
   *
   * @example
   * ```typescript
   * const battle = ctx.gameplayState as MyBattleState;
   * const actor = battle.getActor(targetId);
   * ```
   */
  readonly gameplayState: unknown;

  // ========== 参与者 ==========

  /** 效果来源（技能释放者） */
  readonly source: ActorRef;

  /** 主目标 */
  readonly primaryTarget: ActorRef;

  /** 触发此 Action 的能力 */
  readonly ability?: IAbility;

  // ========== 输出通道 ==========

  /** 事件收集器（收集产生的事件） */
  readonly eventCollector: EventCollector;

  // ========== 执行状态 ==========

  /** 被影响的目标列表（用于回调中的 affected 引用） */
  affectedTargets: ActorRef[];

  /** 回调深度（用于防止无限递归） */
  callbackDepth: number;
};

/**
 * 创建执行上下文
 */
export function createExecutionContext(params: {
  triggerEvent: GameEventBase;
  gameplayState: unknown;
  source: ActorRef;
  primaryTarget: ActorRef;
  eventCollector: EventCollector;
  ability?: IAbility;
}): ExecutionContext {
  return {
    // 触发信息
    triggerEvent: params.triggerEvent,
    gameplayState: params.gameplayState,
    // 参与者
    source: params.source,
    primaryTarget: params.primaryTarget,
    ability: params.ability,
    // 输出通道
    eventCollector: params.eventCollector,
    // 执行状态
    affectedTargets: [],
    callbackDepth: 0,
  };
}

/**
 * 克隆执行上下文（用于回调 Action）
 *
 * 保持引用共享（triggerEvent, gameplayState, eventCollector），
 * 但允许修改参与者和执行状态。
 */
export function cloneContext(
  ctx: ExecutionContext,
  overrides?: Partial<Pick<ExecutionContext, 'source' | 'primaryTarget'>>
): ExecutionContext {
  return {
    ...ctx,
    ...overrides,
    affectedTargets: [...ctx.affectedTargets],
  };
}
