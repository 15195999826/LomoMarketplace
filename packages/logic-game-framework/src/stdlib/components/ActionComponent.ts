/**
 * ActionComponent - 事件响应组件
 *
 * 响应 GameEvent 执行链式 Action。
 * 用于实现被动技能、触发效果等业务逻辑。
 *
 * ## 设计原则
 * - ActionComponent 只负责：事件匹配 + 过滤 + 执行 Action
 * - 不对事件结构做任何假设（不知道 source/target）
 * - Action 自己从 `context.customData.gameEvent` 获取需要的数据
 *
 * ## 使用场景
 * - 荆棘护甲：受到伤害时反弹伤害
 * - 击杀回复：击杀敌人时恢复生命
 * - 回合开始效果：每回合开始时触发效果
 *
 * @example
 * ```typescript
 * // 监听 damage 事件
 * const thornArmor = new ActionComponent([{
 *   eventKind: 'damage',
 *   filter: (event, ctx) => event.target.id === ctx.owner.id,
 *   actions: [myReflectDamageAction],
 * }]);
 *
 * // Action 内部获取事件数据
 * class ReflectDamageAction implements IAction {
 *   execute(ctx: ExecutionContext) {
 *     const event = ctx.customData.gameEvent as DamageEvent;
 *     const attacker = event.source;
 *     // ... 反弹伤害逻辑
 *   }
 * }
 * ```
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

/**
 * 触发条件配置
 */
export type ActionTrigger<TEvent extends GameEventBase = GameEventBase> = {
  /** 监听的事件类型（kind 字符串） */
  readonly eventKind: string;
  /** 条件过滤器（可选） */
  readonly filter?: (event: TEvent, context: ComponentLifecycleContext) => boolean;
  /** 要执行的 Action 链 */
  readonly actions: IAction[];
};

/**
 * ActionComponent - 事件驱动的 Action 执行器
 *
 * 框架级组件，不对事件结构做假设。
 * Action 通过 `context.customData.gameEvent` 获取原始事件。
 */
export class ActionComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.TRIGGER;

  private readonly triggers: ActionTrigger[];

  constructor(triggers: ActionTrigger[]) {
    super();
    this.triggers = triggers;
  }

  /**
   * 响应游戏事件
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
        getLogger().error(`ActionComponent action error: ${action.type}`, {
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
      // battle 为 null，ActionComponent 的 Action 应避免依赖 battle
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

// ========== 泛型辅助函数 ==========

/**
 * 创建事件触发器（类型安全）
 *
 * @example
 * ```typescript
 * // 游戏定义自己的事件类型
 * type MyDamageEvent = GameEventBase & { kind: 'damage'; target: ActorRef; };
 *
 * const trigger = createTrigger<MyDamageEvent>('damage', {
 *   filter: (event, ctx) => event.target.id === ctx.owner.id,
 *   actions: [myAction],
 * });
 * ```
 */
export function createTrigger<TEvent extends GameEventBase>(
  eventKind: TEvent['kind'],
  config: {
    filter?: (event: TEvent, context: ComponentLifecycleContext) => boolean;
    actions: IAction[];
  }
): ActionTrigger<TEvent> {
  return {
    eventKind,
    filter: config.filter,
    actions: config.actions,
  };
}
