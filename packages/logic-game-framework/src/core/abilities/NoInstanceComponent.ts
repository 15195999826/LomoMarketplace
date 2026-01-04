/**
 * NoInstanceComponent - 无实例触发器组件
 *
 * 根据 GameEvent 直接执行 Action 链，不创建 ExecutionInstance。
 * 适用于**瞬发效果**，如反伤、触发治疗等。
 *
 * ## 与 ActivateInstanceComponent 的区别
 *
 * | 特性 | NoInstanceComponent | ActivateInstanceComponent |
 * |------|---------------------|---------------------------|
 * | ExecutionInstance | ❌ 不创建 | ✅ 创建 |
 * | Timeline 驱动 | ❌ | ✅ |
 * | 事件收集 | ❌ 丢弃 | ✅ 可 flush |
 * | 适用场景 | 瞬发效果 | 有时间轴的技能 |
 *
 * ## ⚠️ 事件收集说明
 *
 * **重要**：NoInstanceComponent 执行 Action 后**不收集产生的事件**。
 * 每次执行都会创建临时的 EventCollector，执行完后丢弃。
 *
 * 如需收集事件（用于表演层展示），请使用 **ActivateInstanceComponent**。
 *
 * ## 使用示例
 *
 * ```typescript
 * // 被动技能：受到伤害时反伤（瞬发，不需要事件收集）
 * new NoInstanceComponent({
 *   triggers: [
 *     { eventKind: 'damage', filter: (e, ctx) => e.target.id === ctx.owner.id },
 *   ],
 *   actions: [new ReflectDamageAction()],
 * });
 *
 * // 多触发条件（任意一个满足）
 * new NoInstanceComponent({
 *   triggers: [
 *     { eventKind: 'turnStart' },
 *     { eventKind: 'onHit' },
 *   ],
 *   triggerMode: 'any',
 *   actions: [new HealAction()],
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
import type { ExecutionContext } from '../actions/ExecutionContext.js';
import { createExecutionContext } from '../actions/ExecutionContext.js';
import { EventCollector } from '../events/EventCollector.js';
import { getLogger } from '../utils/Logger.js';
import type { MutableEvent, PreEventIntent, PreEventHandlerContext } from '../events/EventPhase.js';

// ========== 类型定义 ==========

/**
 * 事件触发器配置
 *
 * 定义：监听什么事件 + 满足什么条件
 */
export type EventTrigger<TEvent extends GameEventBase = GameEventBase> = {
  /** 监听的事件类型（kind 字符串） */
  readonly eventKind: string;
  /** 条件过滤器（可选） */
  readonly filter?: (event: TEvent, context: ComponentLifecycleContext) => boolean;
};

/**
 * 触发模式
 * - 'any': 任意一个触发器匹配即执行（OR）
 * - 'all': 所有触发器都匹配才执行（AND）
 */
export type TriggerMode = 'any' | 'all';

/**
 * Pre 阶段处理器类型
 *
 * 用于 Pre 阶段事件（如 pre_damage），可以修改或取消事件。
 *
 * @param event 可变事件（可以读取当前值，但通过返回 Intent 来修改）
 * @param context 组件生命周期上下文
 * @returns 处理意图（pass/cancel/modify）
 */
export type PreEventHandlerFn = (
  event: MutableEvent,
  context: ComponentLifecycleContext
) => PreEventIntent;

/**
 * NoInstanceComponent 配置
 */
export type NoInstanceComponentConfig = {
  /** 触发器列表 */
  readonly triggers: EventTrigger[];
  /** 触发模式，默认 'any' */
  readonly triggerMode?: TriggerMode;
  /** 要执行的 Action 链（Post 阶段使用） */
  readonly actions: IAction[];

  /**
   * Pre 阶段处理器（可选）
   *
   * 用于处理 Pre 阶段事件（如 pre_damage），可以：
   * - 返回 { type: 'pass' } - 不做任何操作
   * - 返回 { type: 'cancel', reason, handlerId } - 取消事件
   * - 返回 { type: 'modify', modifications, handlerId } - 修改事件字段
   *
   * 如果配置了 preHandler，actions 将在 Post 阶段执行。
   * 如果没有配置 preHandler，actions 将在事件触发时直接执行（向后兼容）。
   *
   * @example
   * ```typescript
   * // 50% 概率免疫伤害
   * new NoInstanceComponent({
   *   triggers: [{ eventKind: 'pre_damage', filter: (e, ctx) => e.target.id === ctx.owner.id }],
   *   actions: [],
   *   preHandler: (event, ctx) => {
   *     if (Math.random() < 0.5) {
   *       return { type: 'cancel', reason: '免疫', handlerId: ctx.ability.id };
   *     }
   *     return { type: 'pass' };
   *   },
   * });
   * ```
   */
  readonly preHandler?: PreEventHandlerFn;
};

// ========== NoInstanceComponent ==========

/**
 * NoInstanceComponent - 无实例触发器组件
 *
 * 监听 GameEvent，匹配条件后直接执行 Action 链，不创建 ExecutionInstance。
 */
export class NoInstanceComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.TRIGGER;

  private readonly triggers: EventTrigger[];
  private readonly triggerMode: TriggerMode;
  private readonly actions: IAction[];
  private readonly _preHandler?: PreEventHandlerFn;

  constructor(config: NoInstanceComponentConfig) {
    super();
    this.triggers = config.triggers;
    this.triggerMode = config.triggerMode ?? 'any';
    this.actions = config.actions;
    this._preHandler = config.preHandler;
  }

  /**
   * 获取 Pre 阶段处理器
   *
   * 如果配置了 preHandler，可供 EventProcessor 使用。
   */
  get preHandler(): PreEventHandlerFn | undefined {
    return this._preHandler;
  }

  /**
   * 是否有 Pre 阶段处理器
   */
  get hasPreHandler(): boolean {
    return this._preHandler !== undefined;
  }

  /**
   * 获取触发器列表
   */
  getTriggers(): readonly EventTrigger[] {
    return this.triggers;
  }

  /**
   * 检查事件是否匹配触发器（供外部使用）
   */
  matchesEvent(event: GameEventBase, context: ComponentLifecycleContext): boolean {
    return this.checkTriggers(event, context);
  }

  /**
   * 响应游戏事件
   *
   * 根据 triggerMode 检查触发器，匹配后执行 Action 链
   */
  onEvent(event: GameEventBase, context: ComponentLifecycleContext, gameplayState: unknown): void {
    const shouldExecute = this.checkTriggers(event, context);

    if (shouldExecute) {
      this.executeActions(event, context, gameplayState);
    }
  }

  /**
   * 检查触发器是否匹配
   */
  private checkTriggers(event: GameEventBase, context: ComponentLifecycleContext): boolean {
    if (this.triggers.length === 0) {
      return false;
    }

    if (this.triggerMode === 'any') {
      // 任意一个匹配即可
      return this.triggers.some((trigger) => this.matchTrigger(trigger, event, context));
    } else {
      // 所有都匹配
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
   * 执行 Action 链
   */
  private executeActions(
    event: GameEventBase,
    context: ComponentLifecycleContext,
    gameplayState: unknown
  ): void {
    const execContext = this.buildExecutionContext(event, context, gameplayState);

    for (const action of this.actions) {
      try {
        action.execute(execContext);
      } catch (error) {
        getLogger().error(`NoInstanceComponent action error: ${action.type}`, {
          error,
          event: event.kind,
        });
      }
    }
  }

  /**
   * 构建 Action 执行上下文
   */
  private buildExecutionContext(
    event: GameEventBase,
    context: ComponentLifecycleContext,
    gameplayState: unknown
  ): ExecutionContext {
    return createExecutionContext({
      eventChain: [event],
      gameplayState,
      eventCollector: new EventCollector(),
      ability: {
        id: context.ability.id,
        configId: context.ability.configId,
        owner: context.owner,
        source: context.owner,
      },
    });
  }

  serialize(): object {
    return {
      triggersCount: this.triggers.length,
      triggerMode: this.triggerMode,
      actionsCount: this.actions.length,
    };
  }
}

// ========== 工厂函数 ==========

/**
 * 创建事件触发器（类型安全）
 *
 * @example
 * ```typescript
 * type MyDamageEvent = GameEventBase & { kind: 'damage'; target: ActorRef; };
 *
 * const trigger = createEventTrigger<MyDamageEvent>('damage', {
 *   filter: (event, ctx) => event.target.id === ctx.owner.id,
 * });
 * ```
 */
export function createEventTrigger<TEvent extends GameEventBase>(
  eventKind: TEvent['kind'],
  config?: {
    filter?: (event: TEvent, context: ComponentLifecycleContext) => boolean;
  }
): EventTrigger<TEvent> {
  return {
    eventKind,
    filter: config?.filter,
  };
}
