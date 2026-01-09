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
  // Provider 接口
  IAbilitySetProvider,
  isAbilitySetProvider,
} from './AbilitySet.js';

export {
  NoInstanceComponent,
  NoInstanceComponentConfig,
  EventTrigger,
  TriggerMode,
  createEventTrigger,
} from './NoInstanceComponent.js';

export {
  PreEventComponent,
  PreEventComponentConfig,
  PreEventHandlerFn,
  PreEventFilterFn,
} from './PreEventComponent.js';

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
  // EventTrigger, TriggerMode, createEventTrigger 已从 NoInstanceComponent 统一导出
} from './ActivateInstanceComponent.js';

export {
  Condition,
  ConditionContext,
  HasTagCondition,
  NoTagCondition,
  TagStacksCondition,
  AllConditions,
  AnyCondition,
} from './Condition.js';

export {
  Cost,
  CostContext,
  ConsumeTagCost,
  RemoveTagCost,
  AddTagCost,
} from './Cost.js';

export {
  ActiveUseComponent,
  ActiveUseComponentConfig,
  ActiveUseContext,
} from './ActiveUseComponent.js';

export {
  TagComponent,
  TagComponentConfig,
} from './TagComponent.js';
