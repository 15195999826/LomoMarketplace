export {
  IAbilityComponent,
  BaseAbilityComponent,
  IAbilityForComponent,
  IAbilityExecutionInstance,
  ActivateExecutionConfig,
  ComponentState,
  ComponentTypes,
  ComponentType,
  ComponentLifecycleContext,
} from './AbilityComponent.js';

export {
  Ability,
  AbilityConfig,
  AbilityState,
  ComponentConstructor,
} from './Ability.js';

export {
  AbilitySet,
  AbilitySetConfig,
  AbilityRevokeReason,
  AbilityGrantedCallback,
  AbilityRevokedCallback,
  createAbilitySet,
  hasAbilitySet,
} from './AbilitySet.js';

export {
  GameEventComponent,
  GameEventComponentConfig,
  EventTrigger,
  TriggerMode,
  createEventTrigger,
} from './GameEventComponent.js';

export {
  AbilityExecutionInstance,
  ExecutionState,
  TagActionsMap,
  ExecutionInstanceConfig,
} from './AbilityExecutionInstance.js';

export {
  ActivateInstanceComponent,
  ActivateInstanceComponentConfig,
  TagActionsConfig,
  // EventTrigger, TriggerMode, createEventTrigger 已从 GameEventComponent 统一导出
} from './ActivateInstanceComponent.js';
