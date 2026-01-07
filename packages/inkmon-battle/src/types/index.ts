/**
 * Types - 类型导出
 *
 * 注意：新的 Replay 事件类型已移至 `../events/ReplayEvents.ts`
 * 旧的 BattleEvents.ts 保留为 Legacy 类型（添加前缀避免冲突）
 */

// 类型相克系统（主要导出）
export * from "./TypeEffectiveness.js";

// Legacy 事件类型（添加前缀避免与新 ReplayEvents 冲突）
export type {
  BattleStartEvent as LegacyBattleStartEvent,
  BattleEndEvent as LegacyBattleEndEvent,
  TurnStartEvent as LegacyTurnStartEvent,
  MoveEvent as LegacyMoveEvent,
  AttackEvent as LegacyAttackEvent,
  DamageEvent as LegacyDamageEvent,
  DeathEvent as LegacyDeathEvent,
  SkipEvent as LegacySkipEvent,
  InkMonBattleEvent as LegacyInkMonBattleEvent,
  InkMonBattleEventKind as LegacyInkMonBattleEventKind,
} from "./BattleEvents.js";
