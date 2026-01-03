/**
 * Tag 相关 Action
 *
 * 用于在技能执行过程中操作 Tag。
 *
 * ## Tag 来源规则
 *
 * - **ApplyTagAction**: 有 duration → AutoDurationTag，无 duration → LooseTag
 * - **RemoveTagAction**: 只移除 LooseTag
 * - **HasTagAction**: 联合查询所有来源
 *
 * ## 获取 AbilitySet
 *
 * TagAction 需要访问 AbilitySet 来操作 Tag。
 * 默认从 gameplayState 中获取，支持以下模式：
 *
 * 1. gameplayState.getAbilitySetForActor(actorId)
 * 2. gameplayState.abilitySet
 *
 * ## 使用示例
 *
 * ```typescript
 * // 技能结束时添加连招窗口（AutoDurationTag，自动过期）
 * tagActions: {
 *   end: [new ApplyTagAction({
 *     targetSelector: abilityOwnerSelector,
 *     tag: 'combo_window',
 *     duration: 1000,
 *   })],
 * }
 *
 * // 添加永久 Tag（LooseTag，需手动移除）
 * new ApplyTagAction({
 *   targetSelector: abilityOwnerSelector,
 *   tag: 'charging',
 *   stacks: 1,
 * })
 *
 * // 移除 LooseTag
 * new RemoveTagAction({
 *   targetSelector: abilityOwnerSelector,
 *   tag: 'combo_window',
 * })
 * ```
 */

import type { ActorRef } from '../types/common.js';
import type { ExecutionContext } from './ExecutionContext.js';
import type { ActionResult } from './ActionResult.js';
import type { BaseActionParams } from './Action.js';
import { BaseAction } from './Action.js';
import { isAbilitySetProvider, type AbilitySet } from '../abilities/AbilitySet.js';
import { debugLog } from '../utils/Logger.js';

/**
 * 从 ExecutionContext 获取目标的 AbilitySet
 *
 * 需要 gameplayState 实现 IAbilitySetProvider 接口
 */
function getAbilitySetForTarget(
  ctx: ExecutionContext,
  target: ActorRef
): AbilitySet | undefined {
  const state = ctx.gameplayState;

  // 使用 IAbilitySetProvider 接口
  if (isAbilitySetProvider(state)) {
    return state.getAbilitySetForActor(target.id);
  }

  return undefined;
}

/**
 * 获取当前逻辑时间
 */
function getLogicTime(ctx: ExecutionContext): number {
  const event = ctx.eventChain.at(-1);
  if (event && 'logicTime' in event && typeof event.logicTime === 'number') {
    return event.logicTime;
  }

  const state = ctx.gameplayState;
  if (state && typeof state === 'object' && 'logicTime' in state) {
    return (state as { logicTime: number }).logicTime;
  }

  return Date.now();
}

// ========== ApplyTagAction ==========

/**
 * ApplyTagAction 参数
 */
export interface ApplyTagActionParams extends BaseActionParams {
  /** Tag 名称 */
  tag: string;
  /** 持续时间（毫秒），不传 = 永久 */
  duration?: number;
  /** 层数，默认 1 */
  stacks?: number;
}

/**
 * 添加 Tag Action
 *
 * - 有 duration: 添加 AutoDurationTag（自动过期）
 * - 无 duration: 添加 LooseTag（需手动移除）
 */
export class ApplyTagAction extends BaseAction<ApplyTagActionParams> {
  readonly type = 'applyTag';

  constructor(params: ApplyTagActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const targets = this.getTargets(ctx);

    for (const target of targets) {
      const abilitySet = getAbilitySetForTarget(ctx, target);
      if (!abilitySet) {
        debugLog('ability', `ApplyTagAction: 无法获取 AbilitySet`, {
          actorId: target.id,
        });
        continue;
      }

      if (this.params.duration) {
        // 有 duration: AutoDurationTag
        abilitySet.addAutoDurationTag(this.params.tag, this.params.duration);
      } else {
        // 无 duration: LooseTag
        abilitySet.addLooseTag(this.params.tag, this.params.stacks ?? 1);
      }
    }

    return {
      success: true,
      events: [],
    };
  }
}

// ========== RemoveTagAction ==========

/**
 * RemoveTagAction 参数
 */
export interface RemoveTagActionParams extends BaseActionParams {
  /** Tag 名称 */
  tag: string;
  /** 移除的层数，不传 = 全部移除 */
  stacks?: number;
}

/**
 * 移除 LooseTag Action
 *
 * 只能移除 LooseTag，不能移除 ComponentTag 或 AutoDurationTag。
 */
export class RemoveTagAction extends BaseAction<RemoveTagActionParams> {
  readonly type = 'removeTag';

  constructor(params: RemoveTagActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const targets = this.getTargets(ctx);

    for (const target of targets) {
      const abilitySet = getAbilitySetForTarget(ctx, target);
      if (!abilitySet) {
        debugLog('ability', `RemoveTagAction: 无法获取 AbilitySet`, {
          actorId: target.id,
        });
        continue;
      }

      abilitySet.removeLooseTag(this.params.tag, this.params.stacks);
    }

    return {
      success: true,
      events: [],
    };
  }
}

// ========== HasTagAction ==========

/**
 * HasTagAction 参数
 */
export interface HasTagActionParams extends BaseActionParams {
  /** Tag 名称 */
  tag: string;
  /** 条件满足时执行的 Action */
  then: import('./Action.js').IAction[];
  /** 条件不满足时执行的 Action（可选） */
  else?: import('./Action.js').IAction[];
}

/**
 * 条件执行 Action - 检查是否有 Tag
 */
export class HasTagAction extends BaseAction<HasTagActionParams> {
  readonly type = 'hasTag';

  constructor(params: HasTagActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    // TODO: 当前实现有问题 - 对每个 target 都执行全部 then/else actions
    // 预期行为应该是：满足条件的 target 执行 then，不满足的执行 else
    // 而非当前的：每个 target 独立判断后各自执行一遍 then/else
    // 等真正需要使用此 Action 时再修复
    debugLog('ability', `⚠️ HasTagAction 实现有问题，多 target 时行为可能非预期，请检查`, {
      tagName: this.params.tag,
    });
    const targets = this.getTargets(ctx);
    const allEvents: import('../events/GameEvent.js').GameEventBase[] = [];

    for (const target of targets) {
      const abilitySet = getAbilitySetForTarget(ctx, target);
      if (!abilitySet) {
        continue;
      }

      const hasTag = abilitySet.hasTag(this.params.tag);
      const actionsToExecute = hasTag ? this.params.then : (this.params.else ?? []);

      for (const action of actionsToExecute) {
        const result = action.execute(ctx);
        allEvents.push(...result.events);
      }
    }

    return {
      success: true,
      events: allEvents,
    };
  }
}
