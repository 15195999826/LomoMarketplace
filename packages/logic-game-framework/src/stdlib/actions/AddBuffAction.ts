/**
 * AddBuffAction - 添加 Buff Action
 *
 * 给目标添加 Buff（能力）
 */

import {
  BaseAction,
  type ActionResult,
  type ExecutionContext,
  createSuccessResult,
  createFailureResult,
  getCurrentEvent,
} from '../../core/actions/index.js';
import type { ActorRef } from '../../core/types/common.js';

/**
 * Buff 刷新策略
 */
export type BuffRefreshPolicy = 'extend' | 'refresh' | 'stack' | 'ignore';

/**
 * AddBuffAction
 */
export class AddBuffAction extends BaseAction {
  readonly type = 'addBuff';

  private buffConfigId: string = '';
  private buffName?: string;
  private duration?: number;
  private stacks: number = 1;
  private maxStacks: number = 1;
  private refreshPolicy: BuffRefreshPolicy = 'refresh';

  /**
   * 设置 Buff 配置 ID
   */
  setBuffId(id: string): this {
    this.buffConfigId = id;
    return this;
  }

  /**
   * 设置 Buff 显示名称
   */
  setBuffName(name: string): this {
    this.buffName = name;
    return this;
  }

  /**
   * 设置持续时间（毫秒）
   */
  setDuration(ms: number): this {
    this.duration = ms;
    return this;
  }

  /**
   * 设置初始层数
   */
  setStacks(count: number): this {
    this.stacks = count;
    return this;
  }

  /**
   * 设置最大层数
   */
  setMaxStacks(max: number): this {
    this.maxStacks = max;
    return this;
  }

  /**
   * 设置刷新策略
   */
  setRefreshPolicy(policy: BuffRefreshPolicy): this {
    this.refreshPolicy = policy;
    return this;
  }

  execute(ctx: Readonly<ExecutionContext>): ActionResult {
    // 使用 TargetSelector 获取目标
    const targets = this.getTargets(ctx);
    if (targets.length === 0) {
      return createFailureResult('No targets selected');
    }

    if (!this.buffConfigId) {
      return createFailureResult('Buff config ID is required');
    }

    // 获取来源（从 ability 或当前触发事件）
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner ?? (currentEvent as { source?: ActorRef }).source;

    // 对每个目标添加 Buff
    const allEvents: ReturnType<typeof ctx.eventCollector.emit>[] = [];

    for (const target of targets) {
      // 检查目标是否已有此 Buff（简化实现）
      const isRefresh = false; // 需要外部判断

      // 发出事件（事件包含完整信息：target, isRefresh, stacks）
      const event = ctx.eventCollector.emit({
        kind: 'buffApplied',
        logicTime: currentEvent.logicTime,
        source,
        target,
        buffId: this.buffConfigId,
        buffName: this.buffName,
        stacks: this.stacks,
        duration: this.duration,
        isRefresh,
      });

      allEvents.push(event);
    }

    const result = createSuccessResult(allEvents, {
      buffConfigId: this.buffConfigId,
      stacks: this.stacks,
      duration: this.duration,
      targetCount: targets.length,
    });

    return this.processCallbacks(result, ctx as ExecutionContext);
  }
}

/**
 * 创建 AddBuffAction 的便捷函数
 */
export function addBuff(configId?: string): AddBuffAction {
  const action = new AddBuffAction();
  if (configId) {
    action.setBuffId(configId);
  }
  return action;
}
