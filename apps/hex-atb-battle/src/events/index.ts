/**
 * Events Module - 事件定义
 */

export {
  // 类型
  type DamageType,
  type DamageEvent,
  type HealEvent,
  type MoveEvent,
  type DeathEvent,
  // 工厂函数
  createDamageEvent,
  createHealEvent,
  createMoveEvent,
  createDeathEvent,
  // 类型守卫
  isDamageEvent,
  isHealEvent,
  isMoveEvent,
  isDeathEvent,
} from './ReplayEvents.js';
