/**
 * ActiveSkillComponent - 主动技能组件示例
 *
 * 展示如何为游戏实现主动技能组件。
 * 不同游戏的资源类型、CD 机制、激活条件各不相同，因此框架不提供内置实现。
 *
 * ## 设计思路
 *
 * 主动技能激活是一个完整的原子流程：
 * ```
 * 收到 InputActionEvent
 *     → 匹配 abilityId
 *     → 检查 CD
 *     → 检查资源
 *     → 扣除资源
 *     → 开始 CD
 *     → 执行 Action 链
 * ```
 *
 * ## 使用示例
 *
 * ```typescript
 * const fireball = new Ability({
 *   configId: 'skill_fireball',
 *   tags: ['active', 'fire'],
 *   components: [
 *     new ActiveSkillComponent({
 *       cooldown: 3000,
 *       cost: { mp: 20 },
 *       actions: [new DamageAction({ damage: 50 })],
 *     }),
 *   ],
 * }, caster.toRef());
 * ```
 */

import {
  BaseAbilityComponent,
  ComponentTypes,
  type ComponentLifecycleContext,
} from '../../src/core/abilities/AbilityComponent.js';
import type { GameEventBase } from '../../src/core/events/GameEvent.js';
import type { IAction } from '../../src/core/actions/Action.js';
import type { ExecutionContext } from '../../src/core/actions/ExecutionContext.js';
import { EventCollector } from '../../src/core/events/EventCollector.js';
import { getLogger } from '../../src/core/utils/Logger.js';

// ========== 类型定义 ==========

/**
 * 输入行动事件（游戏自定义）
 */
export type InputActionEvent = GameEventBase & {
  readonly kind: 'inputAction';
  readonly actor: { id: string };
  readonly abilityId: string;
  readonly targets: { id: string }[];
};

/**
 * 资源消耗配置（示例：MP 系统）
 *
 * 不同游戏应该定义自己的资源类型
 */
export type ResourceCost = {
  mp?: number;
  hp?: number;
  energy?: number;
  rage?: number;
  // 游戏可以扩展更多资源类型
  [key: string]: number | undefined;
};

/**
 * 主动技能配置
 */
export type ActiveSkillConfig = {
  /** CD 时间（毫秒） */
  cooldown: number;
  /** 资源消耗 */
  cost?: ResourceCost;
  /** 额外激活条件 */
  canActivate?: (context: ComponentLifecycleContext) => boolean;
  /** 技能效果 Action 链 */
  actions: IAction[];
};

// ========== ActiveSkillComponent ==========

/**
 * ActiveSkillComponent - 主动技能组件（示例）
 *
 * 处理主动技能的完整激活流程：
 * 1. 监听 InputActionEvent
 * 2. 检查 CD 和资源
 * 3. 扣除资源、开始 CD
 * 4. 执行 Action 链
 */
export class ActiveSkillComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.TRIGGER;

  private readonly config: ActiveSkillConfig;

  /** CD 剩余时间（毫秒） */
  private cooldownRemaining: number = 0;

  constructor(config: ActiveSkillConfig) {
    super();
    this.config = config;
  }

  // ========== 内部 Hook ==========

  /**
   * Tick：更新 CD
   */
  onTick(dt: number): void {
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt);
    }
  }

  /**
   * 响应事件
   */
  onEvent(event: GameEventBase, context: ComponentLifecycleContext, gameplayState: unknown): void {
    // 只处理 inputAction 事件
    if (event.kind !== 'inputAction') {
      return;
    }

    const inputEvent = event as InputActionEvent;

    // 检查是否是自己的技能
    if (inputEvent.abilityId !== context.ability.configId) {
      return;
    }

    // 检查是否是 owner 在使用
    if (inputEvent.actor.id !== context.owner.id) {
      return;
    }

    // 执行激活流程
    this.tryActivate(inputEvent, context, gameplayState);
  }

  // ========== 激活流程 ==========

  /**
   * 尝试激活技能
   */
  private tryActivate(
    event: InputActionEvent,
    context: ComponentLifecycleContext,
    gameplayState: unknown
  ): void {
    // 1. 检查 CD
    if (!this.checkCooldown()) {
      getLogger().debug(`Skill on cooldown: ${context.ability.configId}`);
      return;
    }

    // 2. 检查资源
    if (!this.checkCost(context)) {
      getLogger().debug(`Insufficient resources: ${context.ability.configId}`);
      return;
    }

    // 3. 检查额外条件
    if (this.config.canActivate && !this.config.canActivate(context)) {
      getLogger().debug(`Activation condition not met: ${context.ability.configId}`);
      return;
    }

    // 4. 扣除资源
    this.consumeCost(context);

    // 5. 开始 CD
    this.startCooldown();

    // 6. 执行 Action 链
    this.executeActions(event, context, gameplayState);
  }

  /**
   * 检查 CD
   */
  private checkCooldown(): boolean {
    return this.cooldownRemaining <= 0;
  }

  /**
   * 检查资源
   *
   * 注意：这里需要根据游戏的资源系统实现
   * 示例中假设 context.attributes 有对应的资源属性
   */
  private checkCost(context: ComponentLifecycleContext): boolean {
    const cost = this.config.cost;
    if (!cost) return true;

    const attrs = context.attributes;

    for (const [resource, amount] of Object.entries(cost)) {
      if (amount === undefined || amount <= 0) continue;

      // 尝试读取资源属性
      const currentValue = (attrs as Record<string, unknown>)[resource];
      if (typeof currentValue !== 'number' || currentValue < amount) {
        return false;
      }
    }

    return true;
  }

  /**
   * 扣除资源
   */
  private consumeCost(context: ComponentLifecycleContext): void {
    const cost = this.config.cost;
    if (!cost) return;

    const attrs = context.attributes;

    for (const [resource, amount] of Object.entries(cost)) {
      if (amount === undefined || amount <= 0) continue;

      // 这里需要根据游戏的 AttributeSet 实现来扣除资源
      // 示例中使用 modifyBase（如果可用）
      const modifyFn = (attrs as Record<string, unknown>)['modifyBase'];
      if (typeof modifyFn === 'function') {
        modifyFn.call(attrs, resource, -amount);
      }
    }
  }

  /**
   * 开始 CD
   */
  private startCooldown(): void {
    this.cooldownRemaining = this.config.cooldown;
  }

  /**
   * 执行 Action 链
   */
  private executeActions(
    event: InputActionEvent,
    context: ComponentLifecycleContext,
    gameplayState: unknown
  ): void {
    const execContext = this.buildExecutionContext(event, context, gameplayState);

    for (const action of this.config.actions) {
      try {
        action.execute(execContext);
      } catch (error) {
        getLogger().error(`ActiveSkillComponent action error: ${action.type}`, {
          error,
          skill: context.ability.configId,
        });
      }
    }
  }

  /**
   * 构建执行上下文
   */
  private buildExecutionContext(
    event: InputActionEvent,
    context: ComponentLifecycleContext,
    gameplayState: unknown
  ): ExecutionContext {
    return {
      gameplayState,
      source: context.owner,
      primaryTarget: event.targets[0] ?? context.owner,
      ability: {
        id: context.ability.id,
        configId: context.ability.configId,
        owner: context.owner,
        source: context.owner,
      },
      logicTime: event.logicTime,
      eventCollector: new EventCollector(),
      affectedTargets: event.targets,
      customData: { gameEvent: event },
      callbackDepth: 0,
    };
  }

  // ========== 查询接口 ==========

  /**
   * 获取 CD 剩余时间
   */
  getCooldownRemaining(): number {
    return this.cooldownRemaining;
  }

  /**
   * 检查技能是否可用
   */
  isReady(context: ComponentLifecycleContext): boolean {
    return (
      this.checkCooldown() &&
      this.checkCost(context) &&
      (!this.config.canActivate || this.config.canActivate(context))
    );
  }

  serialize(): object {
    return {
      cooldownRemaining: this.cooldownRemaining,
      cooldownTotal: this.config.cooldown,
    };
  }
}

// ========== 工厂函数 ==========

/**
 * 创建主动技能组件
 */
export function activeSkill(config: ActiveSkillConfig): ActiveSkillComponent {
  return new ActiveSkillComponent(config);
}
