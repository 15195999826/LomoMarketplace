/**
 * 执行上下文
 *
 * Action 执行时的上下文信息。
 * 仅存在于 Action 链执行流程中。
 *
 * ## 设计原则
 *
 * ExecutionContext 是"输入 + 输出通道"：
 * - 输入：eventChain, gameplayState, ability
 * - 输出：eventCollector
 *
 * ## 事件链
 *
 * eventChain 记录了完整的事件触发链路：
 * ```
 * [InputActionEvent] → 玩家使用技能
 * [InputActionEvent, DamageEvent(crit)] → 暴击回调
 * [InputActionEvent, DamageEvent(crit), DamageEvent(kill)] → 击杀回调
 * ```
 *
 * 当前触发事件是 eventChain 的最后一个元素。
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
 * 执行实例信息（可选）
 *
 * 当 Action 由 AbilityExecutionInstance 触发时存在。
 */
export type ExecutionInstanceInfo = {
  /** 执行实例 ID */
  readonly id: string;
  /** Timeline ID */
  readonly timelineId: string;
  /** 已执行时间（毫秒） */
  readonly elapsed: number;
  /** 当前触发的 Tag 名称 */
  readonly currentTag: string;
};

/**
 * 执行上下文
 *
 * Action 执行时可访问的所有信息：
 * 1. 事件链 - 完整的触发链路
 * 2. 能力信息 - 哪个能力触发的
 * 3. 游戏状态 - 当前游戏数据
 * 4. 输出通道 - 事件收集器
 * 5. 执行实例信息（可选）- Timeline 执行相关
 */
export type ExecutionContext = {
  // ========== 事件链 ==========

  /**
   * 事件链
   *
   * 记录了完整的事件触发链路。
   * - 第一个元素是原始触发事件（如玩家输入）
   * - 最后一个元素是当前触发事件（导致此 Action 执行的事件）
   * - 回调时会追加新事件到链尾
   *
   * @example
   * ```typescript
   * // 获取当前触发事件
   * const currentEvent = ctx.eventChain.at(-1)!;
   *
   * // 获取原始触发事件
   * const originalEvent = ctx.eventChain[0];
   *
   * // 检查是否是回调执行
   * const isCallback = ctx.eventChain.length > 1;
   * ```
   */
  readonly eventChain: readonly GameEventBase[];

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
   * Action 通过 eventCollector.push() 产生新的 GameEvent。
   * 整个技能执行（包括回调）共享同一个 eventCollector。
   */
  readonly eventCollector: EventCollector;

  // ========== 执行实例信息（可选）==========

  /**
   * 执行实例信息
   *
   * 当 Action 由 AbilityExecutionInstance 触发时存在。
   * 可用于获取 Timeline 执行进度等信息。
   *
   * @example
   * ```typescript
   * if (ctx.execution) {
   *   console.log(`Tag ${ctx.execution.currentTag} at ${ctx.execution.elapsed}ms`);
   * }
   * ```
   */
  readonly execution?: ExecutionInstanceInfo;
};

// ========== 辅助函数 ==========

/**
 * 获取当前触发事件
 *
 * 即 eventChain 的最后一个元素。
 */
export function getCurrentEvent(ctx: ExecutionContext): GameEventBase {
  return ctx.eventChain.at(-1)!;
}

/**
 * 获取原始触发事件
 *
 * 即 eventChain 的第一个元素。
 */
export function getOriginalEvent(ctx: ExecutionContext): GameEventBase {
  return ctx.eventChain[0];
}

/**
 * 创建执行上下文
 */
export function createExecutionContext(params: {
  eventChain: GameEventBase[];
  gameplayState: unknown;
  eventCollector: EventCollector;
  ability?: IAbility;
  execution?: ExecutionInstanceInfo;
}): ExecutionContext {
  return {
    eventChain: params.eventChain,
    gameplayState: params.gameplayState,
    ability: params.ability,
    eventCollector: params.eventCollector,
    execution: params.execution,
  };
}

/**
 * 创建回调执行上下文
 *
 * 在原有上下文基础上追加新事件到事件链。
 * 其他字段（gameplayState, eventCollector, ability）保持不变。
 */
export function createCallbackContext(
  ctx: ExecutionContext,
  callbackEvent: GameEventBase
): ExecutionContext {
  return {
    ...ctx,
    eventChain: [...ctx.eventChain, callbackEvent],
  };
}
