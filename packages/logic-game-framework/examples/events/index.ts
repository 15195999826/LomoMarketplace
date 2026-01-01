/**
 * Events - 战斗游戏事件示例
 *
 * 包含事件类型定义和事件触发器工厂函数示例。
 * 这些是示例代码，游戏应根据自己的需求定义事件。
 */

// 事件类型
export type {
  DamageGameEvent,
  HealGameEvent,
  TurnStartGameEvent,
  TurnEndGameEvent,
  InputActionGameEvent,
  DeathGameEvent,
  MoveGameEvent,
  BattleStartGameEvent,
  BattleEndGameEvent,
  BuffAppliedGameEvent,
  BuffRemovedGameEvent,
  BattleGameEvent,
  BattleGameEventKind,
} from './BattleGameEvents.js';

// 事件工厂函数
export {
  isEventRelatedToActor,
  createDamageEvent,
  createHealEvent,
  createTurnStartEvent,
  createTurnEndEvent,
  createDeathEvent,
} from './BattleGameEvents.js';

// 事件触发器工厂函数
export {
  onDamaged,
  onDealDamage,
  onKill,
  onTurnStart,
  onTurnEnd,
  onDeath,
  onEvent,
} from './ActionTriggerFactories.js';
