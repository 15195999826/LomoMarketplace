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

// GameEvent - Ability 系统内部事件
export {
  GameEvent,
  GameEventKind,
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
  // Helpers
  isEventRelatedToActor,
  getEventRelatedActors,
  // Factories
  createDamageEvent,
  createHealEvent,
  createTurnStartEvent,
  createTurnEndEvent,
  createDeathEvent,
} from './GameEvent.js';
