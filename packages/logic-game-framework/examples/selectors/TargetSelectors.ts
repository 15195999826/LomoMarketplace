/**
 * 预定义目标选择器集合（示例）
 *
 * 这是示例性的选择器实现，假设了特定的事件结构。
 * 实际项目应根据自己的事件结构定义选择器。
 *
 * ## 使用示例
 *
 * ```typescript
 * import { TargetSelectors } from './selectors/TargetSelectors.js';
 *
 * new DamageAction()
 *     .setDamage(50)
 *     .setTargetSelector(TargetSelectors.currentTarget);
 * ```
 */

import type { ActorRef } from '../../src/core/types/common.js';
import type { ExecutionContext } from '../../src/core/actions/ExecutionContext.js';
import { getCurrentEvent, getOriginalEvent } from '../../src/core/actions/ExecutionContext.js';
import type { TargetSelector } from '../../src/core/actions/TargetSelector.js';

/**
 * 预定义目标选择器
 *
 * 假设事件结构包含 source/target/targets 字段。
 */
export const TargetSelectors = {
  /**
   * 从当前触发事件获取 source
   * 常用于：反伤（目标是攻击我的人）
   */
  currentSource: ((ctx: ExecutionContext): ActorRef[] => {
    const event = getCurrentEvent(ctx) as { source?: ActorRef };
    return event.source ? [event.source] : [];
  }) as TargetSelector,

  /**
   * 从当前触发事件获取 target
   * 常用于：回调中对被命中目标施加效果
   */
  currentTarget: ((ctx: ExecutionContext): ActorRef[] => {
    const event = getCurrentEvent(ctx) as { target?: ActorRef };
    return event.target ? [event.target] : [];
  }) as TargetSelector,

  /**
   * 从当前触发事件获取 targets 数组
   * 常用于：AOE 技能
   */
  currentTargets: ((ctx: ExecutionContext): ActorRef[] => {
    const event = getCurrentEvent(ctx) as { targets?: ActorRef[] };
    return event.targets ?? [];
  }) as TargetSelector,

  /**
   * 从原始触发事件获取 target
   * 常用于：主动技能（玩家选择的目标）
   */
  originalTarget: ((ctx: ExecutionContext): ActorRef[] => {
    const event = getOriginalEvent(ctx) as { target?: ActorRef };
    return event.target ? [event.target] : [];
  }) as TargetSelector,

  /**
   * 从原始触发事件获取 targets 数组
   */
  originalTargets: ((ctx: ExecutionContext): ActorRef[] => {
    const event = getOriginalEvent(ctx) as { targets?: ActorRef[] };
    return event.targets ?? [];
  }) as TargetSelector,

  /**
   * 能力持有者（Ability owner）
   * 常用于：自我增益 Buff
   */
  abilityOwner: ((ctx: ExecutionContext): ActorRef[] => {
    return ctx.ability ? [ctx.ability.owner] : [];
  }) as TargetSelector,

  /**
   * 能力来源（Ability source，通常与 owner 相同）
   */
  abilitySource: ((ctx: ExecutionContext): ActorRef[] => {
    return ctx.ability ? [ctx.ability.source] : [];
  }) as TargetSelector,

  /**
   * 空选择器（不选择任何目标）
   */
  none: ((_ctx: ExecutionContext): ActorRef[] => {
    return [];
  }) as TargetSelector,

  /**
   * 组合多个选择器（并集）
   */
  combine: (...selectors: TargetSelector[]): TargetSelector => {
    return (ctx: ExecutionContext): ActorRef[] => {
      const results = selectors.flatMap((s) => s(ctx));
      // 去重
      const seen = new Set<string>();
      return results.filter((ref) => {
        if (seen.has(ref.id)) return false;
        seen.add(ref.id);
        return true;
      });
    };
  },

  /**
   * 创建自定义选择器（类型辅助）
   */
  custom: <TEvent = unknown>(
    selector: (ctx: ExecutionContext, event: TEvent) => ActorRef[]
  ): TargetSelector => {
    return (ctx: ExecutionContext): ActorRef[] => {
      return selector(ctx, getCurrentEvent(ctx) as TEvent);
    };
  },
};
