/**
 * AddBuffAction - 添加 Buff Action 示例
 *
 * 展示如何使用构造函数参数 + ParamResolver 模式创建 Action。
 */

import {
  BaseAction,
  type BaseActionParams,
  type ActionResult,
  type ExecutionContext,
  createSuccessResult,
  createFailureResult,
  getCurrentEvent,
  type ParamResolver,
  resolveParam,
  resolveOptionalParam,
} from '../../src/core/actions/index.js';
import type { ActorRef } from '../../src/core/types/common.js';

/**
 * Buff 刷新策略
 */
export type BuffRefreshPolicy = 'extend' | 'refresh' | 'stack' | 'ignore';

/**
 * AddBuffAction 参数
 */
export interface AddBuffActionParams extends BaseActionParams {
  /** Buff 配置 ID（必填） */
  buffId: ParamResolver<string>;
  /** Buff 显示名称（可选） */
  buffName?: ParamResolver<string>;
  /** 持续时间（毫秒，可选） */
  duration?: ParamResolver<number>;
  /** 初始层数（可选，默认 1） */
  stacks?: ParamResolver<number>;
  /** 最大层数（可选，默认 1） */
  maxStacks?: ParamResolver<number>;
  /** 刷新策略（可选，默认 'refresh'） */
  refreshPolicy?: ParamResolver<BuffRefreshPolicy>;
}

/**
 * AddBuffAction
 *
 * @example
 * ```typescript
 * // 基础用法
 * new AddBuffAction({
 *   buffId: 'buff_burning',
 *   duration: 5000,
 * })
 *
 * // 可叠加 Buff
 * new AddBuffAction({
 *   buffId: 'buff_poison',
 *   stacks: 1,
 *   maxStacks: 5,
 *   refreshPolicy: 'stack',
 * })
 * ```
 */
export class AddBuffAction extends BaseAction<AddBuffActionParams> {
  readonly type = 'addBuff';

  constructor(params: AddBuffActionParams) {
    super(params);
  }

  execute(ctx: Readonly<ExecutionContext>): ActionResult {
    // 获取目标
    const targets = this.getTargets(ctx);
    if (targets.length === 0) {
      return createFailureResult('No targets selected');
    }

    // 解析参数
    const buffId = resolveParam(this.params.buffId, ctx as ExecutionContext);
    const buffName = this.params.buffName
      ? resolveParam(this.params.buffName, ctx as ExecutionContext)
      : undefined;
    const duration = this.params.duration
      ? resolveParam(this.params.duration, ctx as ExecutionContext)
      : undefined;
    const stacks = resolveOptionalParam(this.params.stacks, 1, ctx as ExecutionContext);
    const _maxStacks = resolveOptionalParam(this.params.maxStacks, 1, ctx as ExecutionContext);
    const _refreshPolicy = resolveOptionalParam(this.params.refreshPolicy, 'refresh', ctx as ExecutionContext);

    if (!buffId) {
      return createFailureResult('Buff config ID is required');
    }

    // 获取来源
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner ?? (currentEvent as { source?: ActorRef }).source;

    // 对每个目标添加 Buff
    const allEvents: ReturnType<typeof ctx.eventCollector.emit>[] = [];

    for (const target of targets) {
      const isRefresh = false; // 简化实现

      const event = ctx.eventCollector.emit({
        kind: 'buffApplied',
        logicTime: currentEvent.logicTime,
        source,
        target,
        buffId,
        buffName,
        stacks,
        duration,
        isRefresh,
      });

      allEvents.push(event);
    }

    const result = createSuccessResult(allEvents, {
      buffId,
      stacks,
      duration,
      targetCount: targets.length,
    });

    return this.processCallbacks(result, ctx as ExecutionContext);
  }
}

/**
 * 创建 AddBuffAction 的便捷函数
 */
export function addBuff(params: AddBuffActionParams): AddBuffAction {
  return new AddBuffAction(params);
}
