/**
 * Battle 模块导出
 */

// 战斗阶段定义
export {
  BattleStage,
  StageStatus,
  WaitSignal,
  BattleResult,
  type StageTransition,
  type StageEvent,
  type StageEventType,
} from './BattleStage.js';

// 战斗上下文
export {
  BattleContext,
  type CharacterRef,
  type BattleCommand,
  type ControlAreaEnterCache,
} from './BattleContext.js';

// 回合制战斗实例
export {
  TurnBasedBattle,
  type TurnBasedBattleConfig,
} from './TurnBasedBattle.js';
