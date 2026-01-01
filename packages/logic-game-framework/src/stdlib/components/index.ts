export {
  TimeDurationComponent,
  timeDuration,
  EXPIRE_REASON_TIME_DURATION,
} from './TimeDurationComponent.js';

export {
  StackComponent,
  StackOverflowPolicy,
  stack,
} from './StackComponent.js';

export {
  StatModifierComponent,
  StatModifierConfig,
  statModifier,
  addBaseStat,
  mulBaseStat,
  addFinalStat,
  mulFinalStat,
} from './StatModifierComponent.js';

// Re-export from core for backward compatibility
export {
  GameEventComponent,
  GameEventComponentConfig,
  EventTrigger,
  TriggerMode,
  createEventTrigger,
} from '../../core/abilities/GameEventComponent.js';
