// 统一事件类型
export {
  type GameEventBase,
  type GameEvent,
  type EventKindOf,
  type ExtractEvent,
  // 标准 Ability 激活事件
  ABILITY_ACTIVATE_EVENT,
  type AbilityActivateEvent,
  createAbilityActivateEvent,
  isAbilityActivateEvent,
} from './GameEvent.js';

// 事件收集器
export { EventCollector } from './EventCollector.js';

// 事件阶段与追踪（Pre/Post 双阶段处理）
export {
  type EventPhase,
  type EventModification,
  type PreEventIntent,
  type TraceLevel,
  type IntentRecord,
  type FieldModificationRecord,
  type EventProcessingTrace,
  type MutableEvent,
  type PreEventHandler,
  type PreEventHandlerContext,
  // 工厂函数
  passIntent,
  cancelIntent,
  modifyIntent,
  createTraceId,
} from './EventPhase.js';

// 可变事件
export {
  MutableEventImpl,
  createMutableEvent,
  type ComputationStep,
  type FieldComputationRecord,
} from './MutableEvent.js';

// 事件处理器
export {
  EventProcessor,
  createEventProcessor,
  type EventProcessorConfig,
  type PreHandlerRegistration,
} from './EventProcessor.js';

// 投射物事件
export {
  PROJECTILE_LAUNCHED_EVENT,
  PROJECTILE_HIT_EVENT,
  PROJECTILE_MISS_EVENT,
  PROJECTILE_DESPAWN_EVENT,
  PROJECTILE_PIERCE_EVENT,
  type ProjectileLaunchedEvent,
  type ProjectileHitEvent,
  type ProjectileMissEvent,
  type ProjectileDespawnEvent,
  type ProjectilePierceEvent,
  type ProjectileEvent,
  createProjectileLaunchedEvent,
  createProjectileHitEvent,
  createProjectileMissEvent,
  createProjectileDespawnEvent,
  createProjectilePierceEvent,
  isProjectileLaunchedEvent,
  isProjectileHitEvent,
  isProjectileMissEvent,
  isProjectileDespawnEvent,
  isProjectilePierceEvent,
} from './ProjectileEvents.js';
