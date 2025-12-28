/**
 * 执行上下文
 *
 * Action 执行时的上下文信息
 * 使用引用传递，避免冗余复制
 */

import type { ActorRef, TargetRef } from '../types/common.js';
import type { EventCollector } from '../events/EventCollector.js';

// 前向声明（避免循环依赖）
export interface IGameplayInstance {
  readonly id: string;
  getActor(id: string): unknown;
}

export interface IAbility {
  readonly id: string;
  readonly configId: string;
  readonly owner: ActorRef;
  readonly source: ActorRef;
}

/**
 * 执行上下文
 * Action 执行时可访问的所有信息
 */
export interface ExecutionContext {
  /** 战斗实例引用 */
  readonly battle: IGameplayInstance;

  /** 技能释放者 */
  readonly source: ActorRef;

  /** 主目标 */
  readonly primaryTarget: ActorRef;

  /** 触发此 Action 的能力（可选） */
  readonly ability?: IAbility;

  /** 当前逻辑时间 */
  readonly logicTime: number;

  /** 事件收集器 */
  readonly eventCollector: EventCollector;

  /** 被影响的目标列表（用于回调中的 affected 引用） */
  affectedTargets: ActorRef[];

  /** 触发者（用于反击等场景） */
  triggerSource?: ActorRef;

  /** 自定义数据（用于在 Action 链中传递信息） */
  customData?: Record<string, unknown>;
}

/**
 * 创建执行上下文
 */
export function createExecutionContext(params: {
  battle: IGameplayInstance;
  source: ActorRef;
  primaryTarget: ActorRef;
  ability?: IAbility;
  logicTime: number;
  eventCollector: EventCollector;
  triggerSource?: ActorRef;
}): ExecutionContext {
  return {
    battle: params.battle,
    source: params.source,
    primaryTarget: params.primaryTarget,
    ability: params.ability,
    logicTime: params.logicTime,
    eventCollector: params.eventCollector,
    affectedTargets: [],
    triggerSource: params.triggerSource,
    customData: {},
  };
}

/**
 * 克隆执行上下文（用于回调 Action）
 * 保持引用共享，但允许修改部分字段
 */
export function cloneContext(
  ctx: ExecutionContext,
  overrides?: Partial<Pick<ExecutionContext, 'source' | 'primaryTarget' | 'triggerSource'>>
): ExecutionContext {
  return {
    ...ctx,
    ...overrides,
    affectedTargets: [...ctx.affectedTargets],
    customData: { ...ctx.customData },
  };
}
