/**
 * Actions - InkMon 战斗 Action 模块
 *
 * 提供 InkMon 战斗专用的 Action 实现，支持：
 * - 类型相克伤害计算
 * - STAB 加成
 * - 暴击系统
 * - Pre/Post 双阶段事件处理
 * - 两阶段移动（预订 + 实际移动）
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

// StartMoveAction - 移动第一阶段（预订格子）
export {
  StartMoveAction,
  type StartMoveActionParams,
} from './StartMoveAction.js';

// ApplyMoveAction - 移动第二阶段（实际移动）
export {
  ApplyMoveAction,
  type ApplyMoveActionParams,
} from './ApplyMoveAction.js';
