/**
 * GameEventComponent - 事件驱动的 Action 执行组件
 *
 * 根据 GameEvent 执行 Action 链的能力组件。
 * 这是框架中**唯一**触发 Action 执行的组件。
 *
 * ## 核心设计思想：统一事件模型
 *
 * 在本框架中，**所有 Action 执行都是事件驱动的**：
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    GameEvent（统一入口）                     │
 * ├─────────────────────────────────────────────────────────────┤
 * │  主动技能：InputActionEvent                                 │
 * │    - 玩家选择技能和目标                                     │
 * │    - 战斗系统创建 { kind: 'inputAction', abilityId, ... }   │
 * │    - 广播事件，技能的 GameEventComponent 匹配并执行         │
 * ├─────────────────────────────────────────────────────────────┤
 * │  被动技能：DamageEvent / DeathEvent / TurnStartEvent ...    │
 * │    - 游戏逻辑产生事件                                       │
 * │    - 广播事件，被动技能的 GameEventComponent 匹配并执行     │
 * └─────────────────────────────────────────────────────────────┘
 *                              ↓
 *                    GameEventComponent
 *                              ↓
 *                      执行 Action 链
 * ```
 *
 * ## 使用示例
 *
 * ```typescript
 * // 被动技能：受到伤害时反伤
 * new GameEventComponent({
 *   triggers: [
 *     { eventKind: 'damage', filter: (e, ctx) => e.target.id === ctx.owner.id },
 *   ],
 *   actions: [new ReflectDamageAction()],
 * });
 *
 * // 多触发条件（任意一个满足）
 * new GameEventComponent({
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
 * GameEventComponent 配置
 */
export type GameEventComponentConfig = {
  /** 触发器列表 */
  readonly triggers: EventTrigger[];
  /** 触发模式，默认 'any' */
  readonly triggerMode?: TriggerMode;
  /** 要执行的 Action 链 */
  readonly actions: IAction[];
};

// ========== GameEventComponent ==========

/**
 * GameEventComponent - 事件驱动的 Action 执行器
 *
 * 监听 GameEvent，匹配条件后执行 Action 链。
 * 是框架中唯一触发 Action 执行的组件。
 */
export class GameEventComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.TRIGGER;

  private readonly triggers: EventTrigger[];
  private readonly triggerMode: TriggerMode;
  private readonly actions: IAction[];

  constructor(config: GameEventComponentConfig) {
    super();
    this.triggers = config.triggers;
    this.triggerMode = config.triggerMode ?? 'any';
    this.actions = config.actions;
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
        getLogger().error(`GameEventComponent action error: ${action.type}`, {
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
      triggerEvent: event,
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
