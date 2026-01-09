/**
 * ActivateInstanceComponent - Timeline 执行实例激活组件
 *
 * 响应事件触发，创建 AbilityExecutionInstance 来执行 Timeline。
 * 继承 GameEventComponent 的触发器机制，但重写执行逻辑。
 *
 * ## 核心功能
 * - 监听事件（如 inputAction）
 * - 匹配条件后创建 ExecutionInstance
 * - ExecutionInstance 按 Timeline 推进，在 Tag 时间点执行 Action
 *
 * ## 使用场景
 * - 主动技能：释放后按动画 Timeline 执行
 * - DoT：周期触发的持续效果
 * - 脱手技能：多个实例并行执行
 *
 * ## 事件定义
 *
 * 触发器监听的事件必须继承 GameEventBase：
 *
 * ```typescript
 * // 1. 定义事件类型（继承 GameEventBase）
 * type InputActionEvent = GameEventBase & {
 *   kind: 'inputAction';
 *   abilityId: string;
 *   sourceId: string;
 *   targetId?: string;
 * };
 *
 * // 2. 创建事件的工厂函数
 * function createInputActionEvent(
 *   logicTime: number,
 *   abilityId: string,
 *   sourceId: string
 * ): InputActionEvent {
 *   return { kind: 'inputAction', logicTime, abilityId, sourceId };
 * }
 *
 * // 3. 战斗系统广播事件
 * abilitySystem.broadcastEvent(
 *   createInputActionEvent(logicTime, 'fireball', actor.id),
 *   actors,
 *   gameplayState
 * );
 * ```
 *
 * @example
 * ```typescript
 * new ActivateInstanceComponent({
 *   triggers: [{ eventKind: 'inputAction' }],
 *   timelineId: 'anim_fireball',
 *   tagActions: {
 *     'cast': [new PlayAnimationAction()],
 *     'hit': [new DamageAction({ damage: 100 })],
 *   },
 * });
 * ```
 */

import {
  BaseAbilityComponent,
  ComponentTypes,
  type ComponentLifecycleContext,
} from './AbilityComponent.js';
import type { GameEventBase } from '../events/GameEvent.js';
import type { IAction } from '../actions/Action.js';
import { getLogger, debugLog } from '../utils/Logger.js';
// 复用 NoInstanceComponent 的类型定义
import type { EventTrigger, TriggerMode } from './NoInstanceComponent.js';
import { createEventTrigger } from './NoInstanceComponent.js';

// 重新导出以保持 API 兼容
export type { EventTrigger, TriggerMode };
export { createEventTrigger };

/**
 * Tag Action 映射
 */
export type TagActionsConfig = Record<string, IAction[]>;

/**
 * ActivateInstanceComponent 配置
 */
export type ActivateInstanceComponentConfig = {
  /** 触发器列表 */
  readonly triggers: EventTrigger[];
  /** 触发模式，默认 'any' */
  readonly triggerMode?: TriggerMode;
  /** Timeline ID */
  readonly timelineId: string;
  /** Tag -> Actions 映射 */
  readonly tagActions: TagActionsConfig;
};

// ========== ActivateInstanceComponent ==========

/**
 * Timeline 执行实例激活组件
 *
 * 响应事件触发，创建 ExecutionInstance 来执行 Timeline。
 */
export class ActivateInstanceComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.TIMELINE_EXECUTION;

  private readonly triggers: EventTrigger[];
  private readonly triggerMode: TriggerMode;
  private readonly timelineId: string;
  private readonly tagActions: TagActionsConfig;

  constructor(config: ActivateInstanceComponentConfig) {
    super();
    this.triggers = config.triggers;
    this.triggerMode = config.triggerMode ?? 'any';
    this.timelineId = config.timelineId;
    this.tagActions = config.tagActions;
  }

  /**
   * 响应游戏事件
   *
   * 匹配条件后创建 ExecutionInstance
   */
  onEvent(event: GameEventBase, context: ComponentLifecycleContext, gameplayState: unknown): boolean {
    const shouldActivate = this.checkTriggers(event, context);

    if (shouldActivate) {
      this.activateExecution(event, context, gameplayState);
      return true;
    }

    return false;
  }

  /**
   * 检查触发器是否匹配
   */
  protected checkTriggers(event: GameEventBase, context: ComponentLifecycleContext): boolean {
    if (this.triggers.length === 0) {
      return false;
    }

    if (this.triggerMode === 'any') {
      return this.triggers.some((trigger) => this.matchTrigger(trigger, event, context));
    } else {
      return this.triggers.every((trigger) => this.matchTrigger(trigger, event, context));
    }
  }

  /**
   * 检查单个触发器是否匹配
   */
  private matchTrigger(
    trigger: EventTrigger,
    event: GameEventBase,
    context: ComponentLifecycleContext
  ): boolean {
    // 检查事件类型
    if (event.kind !== trigger.eventKind) {
      return false;
    }

    // 检查自定义条件
    if (trigger.filter && !trigger.filter(event, context)) {
      return false;
    }

    return true;
  }

  /**
   * 激活执行实例
   */
  protected activateExecution(
    event: GameEventBase,
    context: ComponentLifecycleContext,
    gameplayState: unknown
  ): void {
    const ability = context.ability;

    try {
      const instance = ability.activateNewExecutionInstance({
        timelineId: this.timelineId,
        tagActions: this.tagActions,
        eventChain: [event],
        gameplayState,
      });

      debugLog('execution', `开始执行`, {
        executionId: instance.id,
        abilityName: ability.displayName ?? ability.configId,
        configId: ability.configId,
      });
    } catch (error) {
      getLogger().error(`Failed to activate ExecutionInstance`, {
        error,
        abilityId: ability.id,
        timelineId: this.timelineId,
      });
    }
  }

  serialize(): object {
    return {
      triggersCount: this.triggers.length,
      triggerMode: this.triggerMode,
      timelineId: this.timelineId,
      tagActionsCount: Object.keys(this.tagActions).length,
    };
  }
}
