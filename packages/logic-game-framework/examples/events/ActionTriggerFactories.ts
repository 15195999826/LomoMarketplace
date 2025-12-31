/**
 * EventTriggerFactories - 事件触发器工厂示例
 *
 * 展示如何为游戏创建便捷的触发器工厂函数。
 * 这些函数依赖于游戏自定义的事件类型，因此属于游戏层而非框架层。
 *
 * @example
 * ```typescript
 * // 在你的游戏中
 * import { GameEventComponent } from '@lomo/logic-game-framework/stdlib';
 * import type { DamageGameEvent } from './MyGameEvents';
 *
 * // 创建游戏特定的工厂
 * function onDamaged(actions: IAction[]) {
 *   return new GameEventComponent([{
 *     eventKind: 'damage',
 *     filter: (event, ctx) => (event as DamageGameEvent).target.id === ctx.owner.id,
 *     actions,
 *   }]);
 * }
 * ```
 */

import { GameEventComponent, createEventTrigger } from '../../src/stdlib/components/GameEventComponent.js';
import type { ComponentLifecycleContext } from '../../src/core/abilities/AbilityComponent.js';
import type { IAction } from '../../src/core/actions/Action.js';
import type {
  DamageGameEvent,
  TurnStartGameEvent,
  TurnEndGameEvent,
  DeathGameEvent,
  BattleGameEvent,
} from './BattleGameEvents.js';

// ========== 便捷工厂函数示例 ==========

/**
 * 受到伤害时触发（示例）
 */
export function onDamaged(actions: IAction[]): GameEventComponent {
  return new GameEventComponent([
    createEventTrigger<DamageGameEvent>('damage', {
      filter: (event, ctx) => event.target.id === ctx.owner.id,
      actions,
    }),
  ]);
}

/**
 * 造成伤害时触发（示例）
 */
export function onDealDamage(actions: IAction[]): GameEventComponent {
  return new GameEventComponent([
    createEventTrigger<DamageGameEvent>('damage', {
      filter: (event, ctx) => event.source.id === ctx.owner.id,
      actions,
    }),
  ]);
}

/**
 * 击杀敌人时触发（示例）
 */
export function onKill(actions: IAction[]): GameEventComponent {
  return new GameEventComponent([
    createEventTrigger<DamageGameEvent>('damage', {
      filter: (event, ctx) => event.source.id === ctx.owner.id && event.isKill,
      actions,
    }),
  ]);
}

/**
 * 回合开始时触发（示例）
 */
export function onTurnStart(actions: IAction[]): GameEventComponent {
  return new GameEventComponent([
    createEventTrigger<TurnStartGameEvent>('turnStart', {
      filter: (event, ctx) => event.activeUnit.id === ctx.owner.id,
      actions,
    }),
  ]);
}

/**
 * 回合结束时触发（示例）
 */
export function onTurnEnd(actions: IAction[]): GameEventComponent {
  return new GameEventComponent([
    createEventTrigger<TurnEndGameEvent>('turnEnd', {
      filter: (event, ctx) => event.unit.id === ctx.owner.id,
      actions,
    }),
  ]);
}

/**
 * 死亡时触发（示例）
 */
export function onDeath(actions: IAction[]): GameEventComponent {
  return new GameEventComponent([
    createEventTrigger<DeathGameEvent>('death', {
      filter: (event, ctx) => event.target.id === ctx.owner.id,
      actions,
    }),
  ]);
}

/**
 * 通用事件触发（示例）
 *
 * 允许游戏定义任意事件触发器
 */
export function onEvent<TEvent extends BattleGameEvent>(
  eventKind: TEvent['kind'],
  filter: (event: TEvent, ctx: ComponentLifecycleContext) => boolean,
  actions: IAction[]
): GameEventComponent {
  return new GameEventComponent([createEventTrigger<TEvent>(eventKind, { filter, actions })]);
}
