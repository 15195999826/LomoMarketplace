export {
  BattleEvent,
  createBattleEvent,
  EventTypes,
  EventType,
  // Payload types
  DamageEventPayload,
  HealEventPayload,
  BuffAppliedEventPayload,
  BuffRemovedEventPayload,
  DeathEventPayload,
  MoveEventPayload,
  AbilityUsedEventPayload,
  TurnStartEventPayload,
  TurnEndEventPayload,
  BattleStartEventPayload,
  BattleEndEventPayload,
  ErrorEventPayload,
  // Event types
  DamageEvent,
  HealEvent,
  BuffAppliedEvent,
  BuffRemovedEvent,
  DeathEvent,
  MoveEvent,
  AbilityUsedEvent,
  TurnStartEvent,
  TurnEndEvent,
  BattleStartEvent,
  BattleEndEvent,
  ErrorEvent,
} from './BattleEvent.js';

export { EventCollector } from './EventCollector.js';

// GameEvent - Ability 系统内部事件基础类型
// 具体事件类型由游戏自定义，参考 examples/events/BattleGameEvents.ts
export {
  type GameEventBase,
  type GameEvent,
  type EventKindOf,
  type ExtractEvent,
} from './GameEvent.js';
