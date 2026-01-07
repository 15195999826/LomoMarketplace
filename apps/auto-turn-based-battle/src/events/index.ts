/**
 * Events 模块导出
 *
 * 战斗事件系统，提供：
 * - 事件类型定义
 * - 事件工厂函数
 * - 事件总线
 */

// 事件类型和工厂函数
export {
  // 事件类型常量
  BATTLE_START_EVENT,
  BATTLE_END_EVENT,
  ROUND_START_EVENT,
  ROUND_END_EVENT,
  TURN_START_EVENT,
  TURN_END_EVENT,
  DAMAGE_EVENT,
  HEAL_EVENT,
  DEATH_EVENT,
  MOVE_EVENT,
  SKILL_USE_EVENT,
  COOLDOWN_EVENT,
  SKIP_TURN_EVENT,
  // 事件接口
  type BattleStartEvent,
  type BattleEndEvent,
  type RoundStartEvent,
  type RoundEndEvent,
  type TurnStartEvent,
  type TurnEndEvent,
  type SkipTurnEvent,
  type DamageEvent,
  type HealEvent,
  type DeathEvent,
  type MoveEvent,
  type SkillUseEvent,
  type CooldownEvent,
  // 联合类型
  type BattleEvent,
  type BattleEventKind,
  // 工厂函数
  createBattleStartEvent,
  createBattleEndEvent,
  createRoundStartEvent,
  createRoundEndEvent,
  createTurnStartEvent,
  createTurnEndEvent,
  createSkipTurnEvent,
  createDamageEvent,
  createHealEvent,
  createDeathEvent,
  createMoveEvent,
  createSkillUseEvent,
  createCooldownEvent,
} from "./BattleEvents.js";

// 事件总线
export {
  BattleEventBus,
  createBattleEventBus,
  type BattleEventListener,
} from "./BattleEventBus.js";
