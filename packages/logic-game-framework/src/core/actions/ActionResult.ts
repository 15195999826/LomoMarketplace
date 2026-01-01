/**
 * Action 执行结果
 */

import type { ActorRef } from '../types/common.js';
import type { GameEventBase } from '../events/GameEvent.js';

/**
 * Action 执行结果
 */
export type ActionResult = {
  /** 是否执行成功 */
  readonly success: boolean;

  /** 产生的事件列表 */
  readonly events: GameEventBase[];

  /** 触发的回调标识列表 */
  readonly callbackTriggers: string[];

  /** 被影响的目标列表 */
  readonly affectedTargets: ActorRef[];

  /** 失败原因（当 success 为 false 时） */
  readonly failureReason?: string;

  /** 额外数据（用于传递给后续处理） */
  readonly data?: Record<string, unknown>;
};

/**
 * 回调触发器常量
 */
export const CallbackTriggers = {
  /** 命中时 */
  ON_HIT: 'onHit',
  /** 暴击时 */
  ON_CRITICAL: 'onCritical',
  /** 击杀时 */
  ON_KILL: 'onKill',
  /** 治疗时 */
  ON_HEAL: 'onHeal',
  /** 过量治疗时 */
  ON_OVERHEAL: 'onOverheal',
  /** Buff 应用时 */
  ON_BUFF_APPLIED: 'onBuffApplied',
  /** Buff 刷新时 */
  ON_BUFF_REFRESHED: 'onBuffRefreshed',
  /** Buff 叠加时 */
  ON_BUFF_STACKED: 'onBuffStacked',
} as const;

export type CallbackTrigger = (typeof CallbackTriggers)[keyof typeof CallbackTriggers];

/**
 * 创建成功结果
 */
export function createSuccessResult(
  events: GameEventBase[],
  affectedTargets: ActorRef[],
  callbackTriggers: string[] = [],
  data?: Record<string, unknown>
): ActionResult {
  return {
    success: true,
    events,
    callbackTriggers,
    affectedTargets,
    data,
  };
}

/**
 * 创建失败结果
 */
export function createFailureResult(
  reason: string,
  events: GameEventBase[] = []
): ActionResult {
  return {
    success: false,
    events,
    callbackTriggers: [],
    affectedTargets: [],
    failureReason: reason,
  };
}

/**
 * 合并多个结果
 */
export function mergeResults(results: ActionResult[]): ActionResult {
  const allEvents: GameEventBase[] = [];
  const allTriggers: string[] = [];
  const allTargets: ActorRef[] = [];
  const allData: Record<string, unknown> = {};

  let allSuccess = true;
  let firstFailureReason: string | undefined;

  for (const result of results) {
    allEvents.push(...result.events);
    allTriggers.push(...result.callbackTriggers);
    allTargets.push(...result.affectedTargets);

    if (result.data) {
      Object.assign(allData, result.data);
    }

    if (!result.success) {
      allSuccess = false;
      if (!firstFailureReason && result.failureReason) {
        firstFailureReason = result.failureReason;
      }
    }
  }

  // 去重目标
  const uniqueTargets = allTargets.filter(
    (target, index, self) => self.findIndex((t) => t.id === target.id) === index
  );

  // 去重触发器
  const uniqueTriggers = [...new Set(allTriggers)];

  return {
    success: allSuccess,
    events: allEvents,
    callbackTriggers: uniqueTriggers,
    affectedTargets: uniqueTargets,
    failureReason: firstFailureReason,
    data: Object.keys(allData).length > 0 ? allData : undefined,
  };
}
