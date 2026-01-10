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
  // 框架层事件（用于战斗回放）
  type IAbilityInitDataForEvent,
  ACTOR_SPAWNED_EVENT,
  ACTOR_DESTROYED_EVENT,
  ATTRIBUTE_CHANGED_EVENT,
  ABILITY_GRANTED_EVENT,
  ABILITY_REMOVED_EVENT,
  ABILITY_ACTIVATED_EVENT,
  ABILITY_TRIGGERED_EVENT,
  TAG_CHANGED_EVENT,
  EXECUTION_ACTIVATED_EVENT,
  STAGE_CUE_EVENT,
  type ActorSpawnedEvent,
  type ActorDestroyedEvent,
  type AttributeChangedEvent,
  type AbilityGrantedEvent,
  type AbilityRemovedEvent,
  type AbilityActivatedEvent,
  type AbilityTriggeredEvent,
  type TagChangedEvent,
  type ExecutionActivatedEvent,
  type StageCueEvent,
  type FrameworkEvent,
  createActorSpawnedEvent,
  createActorDestroyedEvent,
  createAttributeChangedEvent,
  createAbilityGrantedEvent,
  createAbilityRemovedEvent,
  createAbilityActivatedEvent,
  createAbilityTriggeredEvent,
  createTagChangedEvent,
  createExecutionActivatedEvent,
  createStageCueEvent,
  // 框架事件 Type Guards
  isActorSpawnedEvent,
  isActorDestroyedEvent,
  isAttributeChangedEvent,
  isAbilityGrantedEvent,
  isAbilityRemovedEvent,
  isAbilityActivatedEvent,
  isAbilityTriggeredEvent,
  isTagChangedEvent,
  isExecutionActivatedEvent,
  isStageCueEvent,
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
