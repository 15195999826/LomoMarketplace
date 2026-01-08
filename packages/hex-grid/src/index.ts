/**
 * @lomo/hex-grid - 六边形网格系统
 *
 * 纯逻辑层，事件驱动更新
 * 渲染层订阅事件更新视图
 */

// 重新导出 Vector3（从 @lomo/core）
export { Vector3 } from '@lomo/core';

// 坐标系统
export {
  type AxialCoord,
  type CubeCoord,
  type PixelCoord,
  type HexOrientation,
  type OrientationMatrix,
  type WorldCoordConfig,
  axial,
  cube,
  axialToCube,
  cubeToAxial,
  cubeRound,
  hexToPixel,
  pixelToHex,
  hexToWorld,
  hexToWorldV3,
  worldToHex,
  getAdjacentHexDistance,
  getOrientationMatrix,
  FLAT_MATRIX,
  POINTY_MATRIX,
  hexEquals,
  hexKey,
  parseHexKey,
  hexAdd,
  hexSubtract,
  hexScale,
} from './HexCoord.js';

// 六边形算法工具
export {
  CUBE_DIRECTIONS,
  AXIAL_DIRECTIONS,
  CUBE_DIAGONALS,
  hexDistance,
  cubeDistance,
  hexNeighbor,
  hexNeighbors,
  hexDiagonalNeighbor,
  hexRange,
  hexRing,
  hexSpiral,
  hexLineDraw,
  hexRotateRight,
  hexRotateLeft,
  hexRotateAroundRight,
  hexRotateAroundLeft,
  hexReflectQ,
  hexReflectR,
  hexReflectS,
} from './HexUtils.js';

// 网格模型
export {
  EventEmitter,
  type EventListener,
  type TerrainType,
  type TileData,
  type OccupantRef,
  type TileUpdateEvent,
  type OccupantUpdateEvent,
  type OccupantMoveEvent,
  type DrawMode,
  type HexMapConfig,
  type HexGridConfig,
  HexGridModel,
} from './HexGridModel.js';

// 寻路模块
export {
  // 类型
  type IGraph,
  type IPathFilter,
  type PathInfo,
  type SearchNode,
  type FloodResult,
  type GraphAStarOptions,
  type HexPathFilterOptions,
  PathfindingResult,
  // 核心类
  MinHeap,
  GraphAStar,
  // 六边形网格集成
  HexGridGraph,
  HexPathFilter,
} from './pathfinding/index.js';
