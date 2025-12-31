/**
 * ActionComponent - 事件响应组件
 *
 * 响应 GameEvent 执行链式 Action。
 * 用于实现被动技能、触发效果等业务逻辑。
 *
 * ## 使用场景
 * - 荆棘护甲：受到伤害时反弹伤害
 * - 击杀回复：击杀敌人时恢复生命
 * - 回合开始效果：每回合开始时触发效果
 *
 * @example
 * ```typescript
 * const thornArmor = new Ability({
 *   configId: 'passive_thorn',
 *   components: [
 *     onDamaged([
 *       new DamageAction({
 *         target: { ref: 'trigger' },
 *         damage: { type: 'flat', value: 10 },
 *       }),
 *     ]),
 *   ],
 * }, heroRef);
 * ```
 */

import {
  BaseAbilityComponent,
  ComponentTypes,
  type ComponentLifecycleContext,
} from '../../core/abilities/AbilityComponent.js';
import type {
  GameEvent,
  GameEventKind,
  DamageGameEvent,
  HealGameEvent,
  TurnStartGameEvent,
  TurnEndGameEvent,
  DeathGameEvent,
} from '../../core/events/GameEvent.js';
import type { IAction } from '../../core/actions/Action.js';
import type { ExecutionContext } from '../../core/actions/ExecutionContext.js';
import type { ActorRef } from '../../core/types/common.js';
import { EventCollector } from '../../core/events/EventCollector.js';
import { getLogger } from '../../core/utils/Logger.js';

/**
 * 触发条件配置
 */
export type ActionTrigger = {
  /** 监听的事件类型 */
  readonly eventKind: GameEventKind;
  /** 条件过滤器（可选） */
  readonly filter?: (event: GameEvent, context: ComponentLifecycleContext) => boolean;
  /** 要执行的 Action 链 */
  readonly actions: IAction[];
};

/**
 * ActionComponent
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
  onEvent(event: GameEvent, context: ComponentLifecycleContext): void {
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
    event: GameEvent,
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
   */
  private buildExecutionContext(
    event: GameEvent,
    context: ComponentLifecycleContext
  ): ExecutionContext {
    // 从事件中提取相关 Actor
    const { source, primaryTarget, triggerSource } = this.extractActorsFromEvent(event, context);

    return {
      // 注意：battle 为 null，ActionComponent 的 Action 应避免依赖 battle
      battle: null as unknown as ExecutionContext['battle'],
      source,
      primaryTarget,
      ability: {
        id: context.ability.id,
        configId: context.ability.configId,
        owner: context.owner,
        source: context.owner, // 默认使用 owner
      },
      logicTime: event.logicTime,
      eventCollector: new EventCollector(), // 临时收集器
      affectedTargets: [],
      triggerSource,
      customData: { gameEvent: event },
      callbackDepth: 0,
    };
  }

  /**
   * 从事件中提取相关 Actor
   */
  private extractActorsFromEvent(
    event: GameEvent,
    context: ComponentLifecycleContext
  ): {
    source: ActorRef;
    primaryTarget: ActorRef;
    triggerSource?: ActorRef;
  } {
    switch (event.kind) {
      case 'damage': {
        const dmgEvent = event as DamageGameEvent;
        // 如果我是被攻击者，source 是我，trigger 是攻击者
        if (dmgEvent.target.id === context.owner.id) {
          return {
            source: context.owner,
            primaryTarget: dmgEvent.source, // 攻击者作为主目标（用于反击）
            triggerSource: dmgEvent.source,
          };
        }
        // 如果我是攻击者
        return {
          source: context.owner,
          primaryTarget: dmgEvent.target,
          triggerSource: dmgEvent.target,
        };
      }
      case 'heal': {
        const healEvent = event as HealGameEvent;
        return {
          source: context.owner,
          primaryTarget: healEvent.target,
        };
      }
      case 'turnStart': {
        const turnStartEvent = event as TurnStartGameEvent;
        return {
          source: context.owner,
          primaryTarget: turnStartEvent.activeUnit,
        };
      }
      case 'turnEnd': {
        const turnEndEvent = event as TurnEndGameEvent;
        return {
          source: context.owner,
          primaryTarget: turnEndEvent.unit,
        };
      }
      case 'death': {
        const deathEvent = event as DeathGameEvent;
        return {
          source: context.owner,
          primaryTarget: deathEvent.target,
          triggerSource: deathEvent.killer,
        };
      }
      default:
        return {
          source: context.owner,
          primaryTarget: context.owner,
        };
    }
  }

  serialize(): object {
    return {
      triggersCount: this.triggers.length,
    };
  }
}

// ========== 便捷工厂函数 ==========

/**
 * 受到伤害时触发
 */
export function onDamaged(actions: IAction[]): ActionComponent {
  return new ActionComponent([
    {
      eventKind: 'damage',
      filter: (event, ctx) => {
        const dmgEvent = event as DamageGameEvent;
        return dmgEvent.target.id === ctx.owner.id;
      },
      actions,
    },
  ]);
}

/**
 * 造成伤害时触发
 */
export function onDealDamage(actions: IAction[]): ActionComponent {
  return new ActionComponent([
    {
      eventKind: 'damage',
      filter: (event, ctx) => {
        const dmgEvent = event as DamageGameEvent;
        return dmgEvent.source.id === ctx.owner.id;
      },
      actions,
    },
  ]);
}

/**
 * 击杀敌人时触发
 */
export function onKill(actions: IAction[]): ActionComponent {
  return new ActionComponent([
    {
      eventKind: 'damage',
      filter: (event, ctx) => {
        const dmgEvent = event as DamageGameEvent;
        return dmgEvent.source.id === ctx.owner.id && dmgEvent.isKill;
      },
      actions,
    },
  ]);
}

/**
 * 回合开始时触发
 */
export function onTurnStart(actions: IAction[]): ActionComponent {
  return new ActionComponent([
    {
      eventKind: 'turnStart',
      filter: (event, ctx) => {
        const turnEvent = event as TurnStartGameEvent;
        return turnEvent.activeUnit.id === ctx.owner.id;
      },
      actions,
    },
  ]);
}

/**
 * 回合结束时触发
 */
export function onTurnEnd(actions: IAction[]): ActionComponent {
  return new ActionComponent([
    {
      eventKind: 'turnEnd',
      filter: (event, ctx) => {
        const turnEvent = event as TurnEndGameEvent;
        return turnEvent.unit.id === ctx.owner.id;
      },
      actions,
    },
  ]);
}

/**
 * 死亡时触发
 */
export function onDeath(actions: IAction[]): ActionComponent {
  return new ActionComponent([
    {
      eventKind: 'death',
      filter: (event, ctx) => {
        const deathEvent = event as DeathGameEvent;
        return deathEvent.target.id === ctx.owner.id;
      },
      actions,
    },
  ]);
}

/**
 * 自定义触发器
 */
export function onEvent(
  eventKind: GameEventKind,
  filter: (event: GameEvent, ctx: ComponentLifecycleContext) => boolean,
  actions: IAction[]
): ActionComponent {
  return new ActionComponent([{ eventKind, filter, actions }]);
}
