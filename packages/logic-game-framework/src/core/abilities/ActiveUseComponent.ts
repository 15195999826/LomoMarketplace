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
 * | 默认触发器 | ❌ 必须指定 | ✅ 可选，默认监听 AbilityActivateEvent |
 * | 用途 | 周期效果、被动触发 | 主动技能入口 |
 *
 * ## 执行流程与事件顺序
 *
 * ### 完整执行流程
 *
 * ```
 * 1. AbilityActivateEvent 触发
 *    └─ ActiveUseComponent.onEvent() 被调用
 *
 * 2. 检查触发器 (checkTriggers)
 *    └─ 验证事件类型和匹配规则
 *
 * 3. 获取 AbilitySet (getAbilitySet)
 *    └─ 从 gameplayState 获取 AbilitySet 引用
 *
 * 4. 检查释放条件 (checkConditions)
 *    ├─ 遍历所有 conditions
 *    └─ 任何条件不满足则返回 false
 *
 * 5. 检查消耗是否可支付 (checkCosts)
 *    ├─ 遍历所有 costs
 *    └─ 任何消耗不足则返回 false
 *
 * 6. 支付消耗 (payCosts)  ← 关键点
 *    ├─ 调用每个 Cost.pay()
 *    └─ 可能触发 tagChanged 事件（如冷却）
 *       例如：cooldown:ability_18 (0 → 1)
 *
 * 7. 激活执行实例 (activateWithoutChecks)
 *    ├─ 调用父类 ActivateInstanceComponent.onEvent()
 *    └─ 创建 AbilityExecutionInstance
 *       └─ 触发 abilityTriggered 事件
 * ```
 *
 * ### 录像事件顺序
 *
 * **重要**：由于执行流程中先支付消耗（步骤 6），再激活实例（步骤 7），
 * 录像记录的事件顺序会是：
 *
 * ```json
 * {
 *   "frame": 8,
 *   "events": [
 *     {
 *       "kind": "tagChanged",           // ← 先记录：冷却添加
 *       "actorId": "Character_16",
 *       "tag": "cooldown:ability_18",
 *       "oldCount": 0,
 *       "newCount": 1
 *     },
 *     {
 *       "kind": "abilityTriggered",     // ← 后记录：技能触发
 *       "actorId": "Character_16",
 *       "abilityInstanceId": "ability_18",
 *       "abilityConfigId": "skill_swift_strike",
 *       "triggerEventKind": "abilityActivate"
 *     }
 *   ]
 * }
 * ```
 *
 * 这个顺序虽然看起来不符合"先触发技能，再产生副作用"的认知，
 * 但它准确反映了代码的实际执行顺序，因此被保留。
 *
 * ### 顺序的影响
 *
 * - **回放系统**：需要正确处理 `tagChanged` 先于 `abilityTriggered` 的情况
 * - **日志分析**：在分析录像时，应注意这个顺序特点
 * - **未来优化**：如果需要调整顺序，可以在事件记录层实现优先级机制
 *
 * ## 使用示例
 *
 * ```typescript
 * // 最简配置：不需要填 triggers，默认监听 AbilityActivateEvent
 * new ActiveUseComponent({
 *   conditions: [new CooldownReadyCondition()],
 *   costs: [new CooldownCost(5000)],
 *   timelineId: 'skill_fireball',
 *   tagActions: {
 *     hit: [new DamageAction({ ... })],
 *   },
 * });
 *
 * // 自定义触发器（如需监听其他事件类型）
 * new ActiveUseComponent({
 *   triggers: [{ eventKind: 'customEvent', filter: ... }],
 *   conditions: [...],
 *   costs: [...],
 *   timelineId: 'skill_fireball',
 *   tagActions: { ... },
 * });
 * ```
 *
 * ## 多段连招技能实现思路
 *
 * 通过 Tag + Duration 数据驱动连招，无需修改 Ability 核心类：
 *
 * ```typescript
 * // 三段连招技能示例（使用默认触发器，无需填 triggers）
 * const comboSkill: AbilityConfig = {
 *   configId: 'skill_combo',
 *   activeUseComponents: [
 *     // 第一段：无连招状态时触发
 *     new ActiveUseComponent({
 *       conditions: [new NoTagCondition('combo_stage_1')],  // 没有连招标记
 *       costs: [new CooldownCost(5000)],                    // 进入冷却
 *       timelineId: 'combo_stage_1',
 *       tagActions: {
 *         hit: [new DamageAction({ ... })],
 *         // 技能结束时添加连招窗口 Tag（AutoDuration，1秒后自动过期）
 *         end: [new ApplyTagAction({ tag: 'combo_stage_1', duration: 1000 })],
 *       },
 *     }),
 *
 *     // 第二段：在连招窗口内触发
 *     new ActiveUseComponent({
 *       conditions: [new HasTagCondition('combo_stage_1')], // 需要有第一段标记
 *       timelineId: 'combo_stage_2',
 *       tagActions: {
 *         hit: [new DamageAction({ ... })],
 *         end: [
 *           new RemoveTagAction({ tag: 'combo_stage_1' }),  // 移除第一段标记
 *           new ApplyTagAction({ tag: 'combo_stage_2', duration: 1000 }),
 *         ],
 *       },
 *     }),
 *
 *     // 第三段（终结技）：消耗第二段标记
 *     new ActiveUseComponent({
 *       conditions: [new HasTagCondition('combo_stage_2')],
 *       timelineId: 'combo_stage_3_finisher',
 *       tagActions: {
 *         hit: [new DamageAction({ ... })],  // 终结技伤害更高
 *         end: [new RemoveTagAction({ tag: 'combo_stage_2' })],
 *       },
 *     }),
 *   ],
 * };
 * ```
 *
 * ### 关键设计
 *
 * 1. **单一 Ability 多个 ActiveUseComponent**：每段是一个独立的激活入口
 * 2. **Tag 作为状态机**：combo_stage_1 → combo_stage_2 → 结束
 * 3. **AutoDuration 自动超时**：连招窗口过期后 Tag 自动消失，回到初始状态
 * 4. **分支连招**：可配置不同的 Tag 检查实现 A→B 或 A→C 的分支
 * 5. **冷却控制**：只有第一段进入冷却，连招阶段不重复计算冷却
 */

import {
  ActivateInstanceComponent,
  type ActivateInstanceComponentConfig,
  type EventTrigger,
} from './ActivateInstanceComponent.js';
import type { ComponentLifecycleContext } from './AbilityComponent.js';
import {
  type GameEventBase,
  type AbilityActivateEvent,
  ABILITY_ACTIVATE_EVENT,
} from '../events/GameEvent.js';
import type { Condition, ConditionContext } from './Condition.js';
import type { Cost, CostContext } from './Cost.js';
import { isAbilitySetProvider, type AbilitySet } from './AbilitySet.js';
import { debugLog } from '../utils/Logger.js';
import type { IGameplayStateProvider } from '../world/IGameplayStateProvider.js';

/**
 * ActiveUseComponent 配置
 *
 * triggers 为可选：
 * - 不填：默认监听 AbilityActivateEvent，自动匹配 abilityInstanceId
 * - 填写：使用自定义触发器
 */
export type ActiveUseComponentConfig = Omit<ActivateInstanceComponentConfig, 'triggers'> & {
  /** 触发器列表（可选，默认监听 AbilityActivateEvent） */
  readonly triggers?: EventTrigger[];
  /** 释放条件（全部满足才能激活） */
  readonly conditions?: Condition[];
  /** 释放消耗（激活时扣除） */
  readonly costs?: Cost[];
};

/**
 * 默认触发器：监听 AbilityActivateEvent，匹配 abilityInstanceId 和 sourceId
 */
function createDefaultTrigger(): EventTrigger {
  return {
    eventKind: ABILITY_ACTIVATE_EVENT,
    filter: (event: GameEventBase, ctx: ComponentLifecycleContext) => {
      const activateEvent = event as AbilityActivateEvent;
      // 同时检查：技能ID匹配 && 发起者是技能持有者
      return (
        activateEvent.abilityInstanceId === ctx.ability.id &&
        activateEvent.sourceId === ctx.owner.id
      );
    },
  };
}

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
 *
 * ## 默认行为
 *
 * 如果不指定 triggers，默认监听 `AbilityActivateEvent`，
 * 并自动匹配 `event.abilityInstanceId === ability.id`。
 */
export class ActiveUseComponent extends ActivateInstanceComponent {
  override readonly type = 'ActiveUseComponent';
  private readonly conditions: Condition[];
  private readonly costs: Cost[];

  constructor(config: ActiveUseComponentConfig) {
    // 如果没有提供 triggers，使用默认触发器
    const triggers = config.triggers ?? [createDefaultTrigger()];

    super({
      ...config,
      triggers,
    });

    this.conditions = config.conditions ?? [];
    this.costs = config.costs ?? [];
  }

  /**
   * 重写事件响应，添加条件检查和消耗扣除
   */
  override onEvent(
    event: GameEventBase,
    context: ComponentLifecycleContext,
    gameplayState: IGameplayStateProvider
  ): boolean {
    // 检查是否是使用Ability的事件
    if (!this.checkTriggers(event, context)) {
      return false;
    }

    // 尝试获取 AbilitySet（需要从 gameplayState 中获取）
    const abilitySet = this.getAbilitySet(context, gameplayState);
    if (!abilitySet) {
      // 无法获取 AbilitySet，直接激活（跳过条件/消耗检查）
      return this.activateWithoutChecks(event, context, gameplayState);
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
      return false; // 条件不满足，不激活
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
      return false; // 消耗不足，不激活
    }

    // 支付所有消耗
    this.payCosts(costCtx);

    // 激活执行实例（触发器已检查过，直接激活）
    return this.activateWithoutChecks(event, context, gameplayState);
  }

  /**
   * 跳过触发器检查直接激活（内部使用）
   */
  private activateWithoutChecks(
    event: GameEventBase,
    context: ComponentLifecycleContext,
    gameplayState: IGameplayStateProvider
  ): boolean {
    // 直接调用父类的激活逻辑，避免重复检查触发器
    this.activateExecution(event, context, gameplayState);
    return true;
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
    gameplayState: IGameplayStateProvider
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
  protected getLogicTime(event: GameEventBase, gameplayState: IGameplayStateProvider): number {
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
