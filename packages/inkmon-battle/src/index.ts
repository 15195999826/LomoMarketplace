/**
 * @inkmon/battle - InkMon Battle System
 *
 * 六边形网格 ATB 战斗系统，支持：
 * - Battle Replay Protocol v2 录像
 * - 14 种属性类型相克
 * - STAB 加成系统
 * - 暴击系统
 */

// ========== 类型定义 ==========
export * from "./types/index.js";

// ========== 事件 ==========
export * from "./events/index.js";

// ========== Actions ==========
export * from "./actions/index.js";

// ========== Actors ==========
export {
  InkMonActor,
  createInkMonActor,
  INKMON_ATTRIBUTES,
  type InkMonActorConfig,
} from "./actors/index.js";

// ========== Abilities ==========
export {
  InkMonAbilitySet,
  createInkMonAbilitySet,
  getCooldownTag,
  COOLDOWN_TAG_PREFIX,
} from "./abilities/index.js";

// ========== 系统 ==========
export { TypeSystem } from "./systems/TypeSystem.js";

// ========== 日志 ==========
export {
  BattleLogger,
  type LogLevel,
  type LogEntry,
} from "./logger/BattleLogger.js";

// ========== ATB 系统 ==========
export { ATBSystem, type ATBConfig, type IATBUnit } from "./atb/index.js";

// ========== 战斗实例（新版） ==========
export {
  InkMonBattle,
  createInkMonBattle,
  type InkMonBattleConfig,
  type BattleResult,
  type ActionResult,
  type DamageCalcResult,
} from "./InkMonBattle.js";

// ========== 旧版兼容（将逐步废弃） ==========
export {
  InkMonUnit,
  createInkMonUnit,
  type InkMonUnitConfig,
} from "./InkMonUnit.js";
export {
  HexBattleInstance,
  type HexBattleConfig,
} from "./HexBattleInstance.js";
export { SimpleAI, type AIDecision } from "./SimpleAI.js";

// ========== 重新导出常用类型 ==========
export type { AxialCoord } from "@lomo/hex-grid";
export { hexDistance, hexNeighbors, axial } from "@lomo/hex-grid";

// ========== Replay 相关（从框架重新导出） ==========
export type {
  IBattleRecord,
  IBattleMeta,
  IFrameData,
  IActorInitData,
  IAbilityInitData,
} from "@lomo/logic-game-framework/stdlib";

export {
  BattleRecorder,
  ReplayLogPrinter,
} from "@lomo/logic-game-framework/stdlib";

// ========== 框架事件（从框架核心层重新导出） ==========
export type {
  GameEventBase,
  AttributeChangedEvent,
  AbilityGrantedEvent,
  AbilityRemovedEvent,
  AbilityActivatedEvent,
  TagChangedEvent,
  ActorSpawnedEvent,
  ActorDestroyedEvent,
} from "@lomo/logic-game-framework";

export {
  isAttributeChangedEvent,
  isAbilityGrantedEvent,
  isAbilityRemovedEvent,
  isAbilityActivatedEvent,
  isTagChangedEvent,
  isActorSpawnedEvent,
  isActorDestroyedEvent,
} from "@lomo/logic-game-framework";
