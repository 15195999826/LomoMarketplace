/**
 * TimelineSkillComponent - Timeline 技能组件示例
 *
 * 展示如何实现带 Timeline 的主动技能：
 * - CD 和资源检查
 * - 创建 ExecutionInstance
 * - 按 Timeline Tag 执行 Action
 *
 * ## 与 ActiveSkillComponent 的区别
 *
 * | 特性 | ActiveSkillComponent | TimelineSkillComponent |
 * |------|---------------------|------------------------|
 * | Action 执行 | 立即执行所有 | 按 Timeline Tag 执行 |
 * | 多实例 | 不支持 | 支持（脱手技能） |
 * | 适用场景 | 瞬发技能 | 动画技能、DoT |
 *
 * ## 使用示例
 *
 * ```typescript
 * const fireball = new Ability({
 *   configId: 'skill_fireball',
 *   components: [
 *     new TimelineSkillComponent({
 *       cooldown: 3000,
 *       cost: { mp: 20 },
 *       timelineId: 'anim_fireball',
 *       tagActions: {
 *         'cast': [new PlayAnimationAction()],
 *         'hit': [new DamageAction({ damage: 100 })],
 *       },
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
 * 资源消耗配置
 */
export type ResourceCost = {
  mp?: number;
  hp?: number;
  energy?: number;
  [key: string]: number | undefined;
};

/**
 * Tag Action 映射
 */
export type TagActionsConfig = Record<string, IAction[]>;

/**
 * Timeline 技能配置
 */
export type TimelineSkillConfig = {
  /** CD 时间（毫秒） */
  cooldown: number;
  /** 资源消耗 */
  cost?: ResourceCost;
  /** 额外激活条件 */
  canActivate?: (context: ComponentLifecycleContext) => boolean;
  /** Timeline ID */
  timelineId: string;
  /** Tag -> Actions 映射 */
  tagActions: TagActionsConfig;
  /** 是否允许多实例（脱手技能） */
  allowMultipleInstances?: boolean;
};

// ========== TimelineSkillComponent ==========

/**
 * TimelineSkillComponent - Timeline 技能组件（示例）
 *
 * 结合 CD/资源检查 + ExecutionInstance 的完整主动技能实现。
 */
export class TimelineSkillComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.TIMELINE_EXECUTION;

  private readonly config: TimelineSkillConfig;

  /** CD 剩余时间（毫秒） */
  private cooldownRemaining: number = 0;

  constructor(config: TimelineSkillConfig) {
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
    // 1. 检查是否允许多实例
    if (!this.config.allowMultipleInstances) {
      const executingInstances = context.ability.getExecutingInstances();
      if (executingInstances.length > 0) {
        getLogger().debug(`Skill already executing: ${context.ability.configId}`);
        return;
      }
    }

    // 2. 检查 CD
    if (!this.checkCooldown()) {
      getLogger().debug(`Skill on cooldown: ${context.ability.configId}`);
      return;
    }

    // 3. 检查资源
    if (!this.checkCost(context)) {
      getLogger().debug(`Insufficient resources: ${context.ability.configId}`);
      return;
    }

    // 4. 检查额外条件
    if (this.config.canActivate && !this.config.canActivate(context)) {
      getLogger().debug(`Activation condition not met: ${context.ability.configId}`);
      return;
    }

    // 5. 扣除资源
    this.consumeCost(context);

    // 6. 开始 CD
    this.startCooldown();

    // 7. 创建执行实例
    this.activateExecution(event, context, gameplayState);
  }

  /**
   * 检查 CD
   */
  private checkCooldown(): boolean {
    return this.cooldownRemaining <= 0;
  }

  /**
   * 检查资源
   */
  private checkCost(context: ComponentLifecycleContext): boolean {
    const cost = this.config.cost;
    if (!cost) return true;

    const attrs = context.attributes;

    for (const [resource, amount] of Object.entries(cost)) {
      if (amount === undefined || amount <= 0) continue;

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
   * 创建执行实例
   */
  private activateExecution(
    event: InputActionEvent,
    context: ComponentLifecycleContext,
    gameplayState: unknown
  ): void {
    try {
      const instance = context.ability.activateNewExecutionInstance({
        timelineId: this.config.timelineId,
        tagActions: this.config.tagActions,
        eventChain: [event],
        gameplayState,
      });

      getLogger().debug(`Timeline skill activated: ${context.ability.configId}`, {
        executionId: instance.id,
        timelineId: this.config.timelineId,
      });
    } catch (error) {
      getLogger().error(`Failed to activate timeline skill: ${context.ability.configId}`, {
        error,
      });
    }
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
    // 检查多实例
    if (!this.config.allowMultipleInstances) {
      const executingInstances = context.ability.getExecutingInstances();
      if (executingInstances.length > 0) {
        return false;
      }
    }

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
      timelineId: this.config.timelineId,
      allowMultipleInstances: this.config.allowMultipleInstances ?? false,
    };
  }
}

// ========== 工厂函数 ==========

/**
 * 创建 Timeline 技能组件
 */
export function timelineSkill(config: TimelineSkillConfig): TimelineSkillComponent {
  return new TimelineSkillComponent(config);
}
