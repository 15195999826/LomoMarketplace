/**
 * Actions - InkMon 战斗 Action 模块
 *
 * 提供 InkMon 战斗专用的 Action 实现，支持：
 * - 类型相克伤害计算
 * - STAB 加成
 * - 暴击系统
 * - Pre/Post 双阶段事件处理
 */

// DamageAction
export {
  DamageAction,
  createDamageAction,
  calculateTypeMultiplier,
  hasSTAB,
  type DamageActionParams,
  type PreDamageEvent,
} from './DamageAction.js';

// HealAction
export {
  HealAction,
  createHealAction,
  createPercentHealAction,
  type HealActionParams,
  type PreHealEvent,
} from './HealAction.js';

// MoveAction
export {
  MoveAction,
  createMoveAction,
  type MoveActionParams,
} from './MoveAction.js';
