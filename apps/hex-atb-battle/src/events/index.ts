/**
 * Events Module - 事件定义
 */

export {
  // 类型
  type DamageType,
  type DamageEvent,
  type HealEvent,
  type MoveEvent,
  type MoveStartEvent,
  type MoveCompleteEvent,
  type DeathEvent,
  // 工厂函数
  createDamageEvent,
  createHealEvent,
  createMoveEvent,
  createMoveStartEvent,
  createMoveCompleteEvent,
  createDeathEvent,
  // 类型守卫
  isDamageEvent,
  isHealEvent,
  isMoveEvent,
  isMoveStartEvent,
  isMoveCompleteEvent,
  isDeathEvent,
} from './ReplayEvents.js';
