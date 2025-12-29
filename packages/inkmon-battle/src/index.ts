/**
 * @inkmon/battle - InkMon Battle System
 *
 * 六边形网格 ATB 战斗系统
 */

// ATB 系统
export { ATBSystem, type ATBConfig, type IATBUnit } from './atb/index.js';

// 战斗单位
export {
  InkMonUnit,
  createInkMonUnit,
  resetUnitIdCounter,
  type InkMonUnitConfig,
} from './InkMonUnit.js';

// 战斗实例
export {
  HexBattleInstance,
  type HexBattleConfig,
  type BattleResult,
  type ActionType,
  type ActionResult,
} from './HexBattleInstance.js';

// AI
export {
  SimpleAI,
  type AIDecision,
} from './SimpleAI.js';

// 重新导出常用类型
export type { AxialCoord } from '@lomo/hex-grid';
export { hexDistance, hexNeighbors, axial } from '@lomo/hex-grid';
