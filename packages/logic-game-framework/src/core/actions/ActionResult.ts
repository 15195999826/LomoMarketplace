/**
 * Action 执行结果
 */

import type { GameEventBase } from '../events/GameEvent.js';

/**
 * Action 执行结果
 *
 * 简化设计：
 * - events 包含所有产生的事件，每个事件有完整的 target/source 信息
 * - 不再需要 affectedTargets（冗余，从 events 可得）
 * - 不再需要 callbackTriggers（从事件字段判断，如 isCritical）
 */
export type ActionResult = {
  /** 是否执行成功 */
  readonly success: boolean;

  /** 产生的事件列表 */
  readonly events: GameEventBase[];

  /** 失败原因（当 success 为 false 时） */
  readonly failureReason?: string;

  /** 额外数据（用于传递给后续处理） */
  readonly data?: Record<string, unknown>;
};

/**
 * 创建成功结果
 */
export function createSuccessResult(
  events: GameEventBase[],
  data?: Record<string, unknown>
): ActionResult {
  return {
    success: true,
    events,
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
    failureReason: reason,
  };
}

/**
 * 合并多个结果
 */
export function mergeResults(results: ActionResult[]): ActionResult {
  const allEvents: GameEventBase[] = [];
  const allData: Record<string, unknown> = {};

  let allSuccess = true;
  let firstFailureReason: string | undefined;

  for (const result of results) {
    allEvents.push(...result.events);

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

  return {
    success: allSuccess,
    events: allEvents,
    failureReason: firstFailureReason,
    data: Object.keys(allData).length > 0 ? allData : undefined,
  };
}
