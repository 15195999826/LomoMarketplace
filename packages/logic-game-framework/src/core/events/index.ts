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
