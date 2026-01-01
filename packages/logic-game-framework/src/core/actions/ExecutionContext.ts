/**
 * 执行上下文
 *
 * Action 执行时的上下文信息。
 * 仅存在于 Action 链执行流程中。
 *
 * ## 设计原则
 *
 * ExecutionContext 是"输入 + 输出通道"：
 * - 输入：triggerEvent, gameplayState, ability
 * - 输出：eventCollector
 *
 * 目标选择由 Action 自身的 TargetSelector 负责，从 triggerEvent 中提取。
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
 * Action 执行时可访问的所有信息：
 * 1. 触发信息 - 什么事件触发了这次执行
 * 2. 能力信息 - 哪个能力触发的
 * 3. 输出通道 - 如何产生副作用
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
   * const source = event.source;
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

  // ========== 能力信息 ==========

  /**
   * 触发此 Action 的能力（可选）
   *
   * 对于由 GameEventComponent 触发的 Action，这里是对应的 Ability。
   * 对于其他场景触发的 Action，可能为 undefined。
   */
  readonly ability?: IAbility;

  // ========== 输出通道 ==========

  /**
   * 事件收集器
   *
   * Action 通过 eventCollector.emit() 产生新的 GameEvent。
   */
  readonly eventCollector: EventCollector;
};

/**
 * 创建执行上下文
 */
export function createExecutionContext(params: {
  triggerEvent: GameEventBase;
  gameplayState: unknown;
  eventCollector: EventCollector;
  ability?: IAbility;
}): ExecutionContext {
  return {
    triggerEvent: params.triggerEvent,
    gameplayState: params.gameplayState,
    ability: params.ability,
    eventCollector: params.eventCollector,
  };
}
