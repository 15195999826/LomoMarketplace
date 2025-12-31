/**
 * GameEventComponent - 事件驱动的 Action 执行组件
 *
 * 根据 GameEvent 执行链式 Action 的能力组件。
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
 * ## 这种设计的优势
 *
 * 1. **统一模型**：主动/被动技能都通过事件触发，Action 执行方式一致
 * 2. **解耦**：战斗系统只负责发事件，不关心技能具体怎么执行
 * 3. **可扩展**：可以实现"当有人使用技能时"的响应（如反制、打断）
 * 4. **可记录**：所有操作都是事件，方便回放/录像/网络同步
 *
 * ## 主动技能示例
 *
 * ```typescript
 * // 火球术：主动技能
 * const fireball = new Ability({
 *   configId: 'skill_fireball',
 *   tags: ['active', 'fire'],
 *   components: [
 *     new GameEventComponent([{
 *       eventKind: 'inputAction',
 *       filter: (event, ctx) => event.abilityId === ctx.ability.configId,
 *       actions: [new DamageAction({ damage: 50, element: 'fire' })],
 *     }]),
 *   ],
 * }, caster.toRef());
 *
 * // 玩家使用技能时，战斗系统广播事件
 * battle.broadcastEvent({
 *   kind: 'inputAction',
 *   logicTime: battle.logicTime,
 *   actor: caster.toRef(),
 *   abilityId: 'skill_fireball',
 *   targets: [enemy.toRef()],
 * });
 * ```
 *
 * ## 被动技能示例
 *
 * ```typescript
 * // 荆棘护甲：受到伤害时反弹
 * const thornArmor = new Ability({
 *   configId: 'passive_thorn',
 *   tags: ['passive'],
 *   components: [
 *     new GameEventComponent([{
 *       eventKind: 'damage',
 *       filter: (event, ctx) => event.target.id === ctx.owner.id,
 *       actions: [new ReflectDamageAction({ percent: 0.1 })],
 *     }]),
 *   ],
 * }, hero.toRef());
 * ```
 *
 * ## 设计原则
 *
 * - 框架不对事件结构做假设（不知道 source/target）
 * - Action 通过 `context.customData.gameEvent` 获取原始事件数据
 * - 游戏自定义事件类型，自己在 Action 中解析
 */

import {
  BaseAbilityComponent,
  ComponentTypes,
  type ComponentLifecycleContext,
} from '../../core/abilities/AbilityComponent.js';
import type { GameEventBase } from '../../core/events/GameEvent.js';
import type { IAction } from '../../core/actions/Action.js';
import type { ExecutionContext } from '../../core/actions/ExecutionContext.js';
import { EventCollector } from '../../core/events/EventCollector.js';
import { getLogger } from '../../core/utils/Logger.js';

// ========== 类型定义 ==========

/**
 * 事件触发器配置
 *
 * 定义：监听什么事件 + 满足什么条件 + 执行什么 Action
 */
export type EventTrigger<TEvent extends GameEventBase = GameEventBase> = {
  /** 监听的事件类型（kind 字符串） */
  readonly eventKind: string;
  /** 条件过滤器（可选） */
  readonly filter?: (event: TEvent, context: ComponentLifecycleContext) => boolean;
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

  constructor(triggers: EventTrigger[]) {
    super();
    this.triggers = triggers;
  }

  /**
   * 响应游戏事件
   *
   * 遍历所有触发器，匹配事件类型和条件后执行 Action 链
   */
  onEvent(event: GameEventBase, context: ComponentLifecycleContext): void {
    for (const trigger of this.triggers) {
      // 检查事件类型
      if (event.kind !== trigger.eventKind) {
        continue;
      }

      // 检查自定义条件
      if (trigger.filter && !trigger.filter(event, context)) {
        continue;
      }

      // 执行 Action 链
      this.executeActions(trigger.actions, event, context);
    }
  }

  /**
   * 执行 Action 链
   */
  private executeActions(
    actions: IAction[],
    event: GameEventBase,
    context: ComponentLifecycleContext
  ): void {
    const execContext = this.buildExecutionContext(event, context);

    for (const action of actions) {
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
   *
   * 只提供基础信息，Action 自己从 gameEvent 获取需要的数据
   */
  private buildExecutionContext(
    event: GameEventBase,
    context: ComponentLifecycleContext
  ): ExecutionContext {
    return {
      // battle 为 null，Action 应避免依赖 battle 实例
      battle: null as unknown as ExecutionContext['battle'],
      // source 和 primaryTarget 都是 owner，Action 自己从 event 取真正的目标
      source: context.owner,
      primaryTarget: context.owner,
      ability: {
        id: context.ability.id,
        configId: context.ability.configId,
        owner: context.owner,
        source: context.owner,
      },
      logicTime: event.logicTime,
      eventCollector: new EventCollector(),
      affectedTargets: [],
      // 事件原样传递，Action 自己解析
      customData: { gameEvent: event },
      callbackDepth: 0,
    };
  }

  serialize(): object {
    return {
      triggersCount: this.triggers.length,
    };
  }
}

// ========== 工厂函数 ==========

/**
 * 创建事件触发器（类型安全）
 *
 * @example
 * ```typescript
 * // 游戏定义自己的事件类型
 * type MyDamageEvent = GameEventBase & { kind: 'damage'; target: ActorRef; };
 *
 * const trigger = createEventTrigger<MyDamageEvent>('damage', {
 *   filter: (event, ctx) => event.target.id === ctx.owner.id,
 *   actions: [myAction],
 * });
 *
 * new GameEventComponent([trigger]);
 * ```
 */
export function createEventTrigger<TEvent extends GameEventBase>(
  eventKind: TEvent['kind'],
  config: {
    filter?: (event: TEvent, context: ComponentLifecycleContext) => boolean;
    actions: IAction[];
  }
): EventTrigger<TEvent> {
  return {
    eventKind,
    filter: config.filter,
    actions: config.actions,
  };
}

