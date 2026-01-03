/**
 * ActiveUseComponent - 主动使用组件
 *
 * 继承 ActivateInstanceComponent，额外包含释放条件和消耗。
 * 用于主动技能的激活入口。
 *
 * ## 与 ActivateInstanceComponent 的区别
 *
 * | 特性 | ActivateInstanceComponent | ActiveUseComponent |
 * |------|---------------------------|-------------------|
 * | 条件检查 | ❌ | ✅ conditions |
 * | 消耗扣除 | ❌ | ✅ costs |
 * | 用途 | 周期效果、被动触发 | 主动技能入口 |
 *
 * ## 使用示例
 *
 * ```typescript
 * new ActiveUseComponent({
 *   triggers: [{ eventKind: 'actionUse', filter: ... }],
 *
 *   // 释放条件
 *   conditions: [
 *     new CooldownReadyCondition(),
 *     new HasTagCondition('combo_window'),
 *   ],
 *
 *   // 释放消耗
 *   costs: [
 *     new CooldownCost(5000),
 *     new ConsumeTagCost('combo_window'),
 *   ],
 *
 *   timelineId: 'skill_fireball',
 *   tagActions: {
 *     hit: [new DamageAction({ damage: 100 })],
 *   },
 * });
 * ```
 */

import {
  ActivateInstanceComponent,
  type ActivateInstanceComponentConfig,
} from './ActivateInstanceComponent.js';
import type { ComponentLifecycleContext } from './AbilityComponent.js';
import type { GameEventBase } from '../events/GameEvent.js';
import type { Condition, ConditionContext } from './Condition.js';
import type { Cost, CostContext } from './Cost.js';
import { isAbilitySetProvider, type AbilitySet } from './AbilitySet.js';
import { debugLog } from '../utils/Logger.js';

/**
 * ActiveUseComponent 配置
 */
export type ActiveUseComponentConfig = ActivateInstanceComponentConfig & {
  /** 释放条件（全部满足才能激活） */
  readonly conditions?: Condition[];
  /** 释放消耗（激活时扣除） */
  readonly costs?: Cost[];
};

/**
 * 扩展的上下文，包含 AbilitySet 引用
 */
export type ActiveUseContext = ComponentLifecycleContext & {
  abilitySet: AbilitySet;
  logicTime: number;
};

/**
 * ActiveUseComponent - 主动使用组件
 *
 * 继承 ActivateInstanceComponent，在激活前检查条件并扣除消耗。
 */
export class ActiveUseComponent extends ActivateInstanceComponent {
  private readonly conditions: Condition[];
  private readonly costs: Cost[];

  constructor(config: ActiveUseComponentConfig) {
    super(config);
    this.conditions = config.conditions ?? [];
    this.costs = config.costs ?? [];
  }

  /**
   * 重写事件响应，添加条件检查和消耗扣除
   */
  override onEvent(
    event: GameEventBase,
    context: ComponentLifecycleContext,
    gameplayState: unknown
  ): void {
    // 尝试获取 AbilitySet（需要从 gameplayState 中获取）
    const abilitySet = this.getAbilitySet(context, gameplayState);
    if (!abilitySet) {
      // 无法获取 AbilitySet，回退到父类行为
      super.onEvent(event, context, gameplayState);
      return;
    }

    const logicTime = this.getLogicTime(event, gameplayState);

    // 构建条件检查上下文
    const conditionCtx: ConditionContext = {
      owner: context.owner,
      abilitySet,
      ability: context.ability,
      gameplayState,
    };

    // 检查所有条件
    if (!this.checkConditions(conditionCtx)) {
      return; // 条件不满足，不激活
    }

    // 构建消耗上下文
    const costCtx: CostContext = {
      owner: context.owner,
      abilitySet,
      ability: context.ability,
      gameplayState,
      logicTime,
    };

    // 检查所有消耗是否可支付
    if (!this.checkCosts(costCtx)) {
      return; // 消耗不足，不激活
    }

    // 支付所有消耗
    this.payCosts(costCtx);

    // 调用父类激活逻辑
    super.onEvent(event, context, gameplayState);
  }

  /**
   * 检查所有条件
   */
  private checkConditions(ctx: ConditionContext): boolean {
    for (const condition of this.conditions) {
      if (!condition.check(ctx)) {
        const reason = condition.getFailReason?.(ctx) ?? condition.type;
        debugLog('ability', `条件不满足: ${reason}`, {
          actorId: ctx.owner.id,
          abilityName: ctx.ability.displayName ?? ctx.ability.configId,
        });
        return false;
      }
    }
    return true;
  }

  /**
   * 检查所有消耗是否可支付
   */
  private checkCosts(ctx: CostContext): boolean {
    for (const cost of this.costs) {
      if (!cost.canPay(ctx)) {
        const reason = cost.getFailReason?.(ctx) ?? cost.type;
        debugLog('ability', `消耗不足: ${reason}`, {
          actorId: ctx.owner.id,
          abilityName: ctx.ability.displayName ?? ctx.ability.configId,
        });
        return false;
      }
    }
    return true;
  }

  /**
   * 支付所有消耗
   */
  private payCosts(ctx: CostContext): void {
    for (const cost of this.costs) {
      cost.pay(ctx);
    }
  }

  /**
   * 从上下文获取 AbilitySet
   *
   * 默认实现：尝试从 gameplayState 获取（需实现 IAbilitySetProvider 接口）
   * 子类可以重写此方法以适应不同的项目结构
   */
  protected getAbilitySet(
    context: ComponentLifecycleContext,
    gameplayState: unknown
  ): AbilitySet | undefined {
    // 使用 IAbilitySetProvider 接口
    if (isAbilitySetProvider(gameplayState)) {
      return gameplayState.getAbilitySetForActor(context.owner.id);
    }

    return undefined;
  }

  /**
   * 从事件或游戏状态获取逻辑时间
   */
  protected getLogicTime(event: GameEventBase, gameplayState: unknown): number {
    // 优先从事件获取
    if ('logicTime' in event && typeof event.logicTime === 'number') {
      return event.logicTime;
    }

    // 尝试从 gameplayState 获取
    if (
      gameplayState &&
      typeof gameplayState === 'object' &&
      'logicTime' in gameplayState
    ) {
      return (gameplayState as { logicTime: number }).logicTime;
    }

    return Date.now();
  }

  override serialize(): object {
    return {
      ...super.serialize(),
      conditionsCount: this.conditions.length,
      costsCount: this.costs.length,
    };
  }
}
