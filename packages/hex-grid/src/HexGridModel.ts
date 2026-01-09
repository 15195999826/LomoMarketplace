/**
 * HexGridModel - 六边形网格逻辑层模型
 *
 * 参考 UE GridMapModel 设计：
 * - 纯数据模型，不依赖渲染
 * - 通过事件通知变化，Renderer 订阅事件更新视图
 * - Model 不知道 Renderer 的存在（单向依赖）
 */

import { Vector3 } from '@lomo/core';
import {
  type AxialCoord,
  type PixelCoord,
  type HexOrientation,
  type WorldCoordConfig,
  hexKey,
  hexEquals,
  hexToWorld,
  hexToWorldV3,
  worldToHex,
  getAdjacentHexDistance,
  axial,
} from './HexCoord.js';
import { hexNeighbors, hexDistance, hexRange } from './HexUtils.js';

// ========== 事件系统 ==========

/**
 * 事件监听器类型
 */
export type EventListener<T> = (data: T) => void;

/**
 * 简单的事件发射器
 */
export class EventEmitter<T> {
  private listeners: Set<EventListener<T>> = new Set();

  subscribe(listener: EventListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(data: T): void {
    for (const listener of this.listeners) {
      listener(data);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

// ========== 类型定义 ==========

/**
 * 地形类型
 */
export type TerrainType = 'normal' | 'blocked' | 'water' | 'forest' | 'mountain';

/**
 * 格子数据
 */
export type TileData<T = unknown> = {
  /** 坐标 */
  readonly coord: AxialCoord;
  /** 地形类型 */
  terrain: TerrainType;
  /** 移动消耗倍率（默认 1） */
  moveCost: number;
  /** 高度 */
  height: number;
  /** 自定义数据 */
  customData?: T;
};

/**
 * 占用者引用（泛型，由使用方定义）
 */
export type OccupantRef = {
  readonly id: string;
};

/**
 * 格子环境更新事件
 */
export type TileUpdateEvent = {
  coord: AxialCoord;
  oldTile: TileData;
  newTile: TileData;
};

/**
 * 占用者更新事件
 */
export type OccupantUpdateEvent = {
  coord: AxialCoord;
  oldOccupant?: OccupantRef;
  newOccupant?: OccupantRef;
};

/**
 * 占用者移动事件
 */
export type OccupantMoveEvent = {
  occupant: OccupantRef;
  from: AxialCoord;
  to: AxialCoord;
};

/**
 * 绘制模式
 * - baseOnRowColumn: 基于行列数的矩形网格
 * - baseOnRadius: 基于半径的六边形区域
 */
export type DrawMode = 'baseOnRowColumn' | 'baseOnRadius';

/**
 * 六边形地图配置（用于序列化/回放）
 *
 * 包含重建地图所需的最小信息
 */
export type HexMapConfig = {
  /** 地图类型标识 */
  type: "hex";
  /** 行数 */
  rows: number;
  /** 列数 */
  columns: number;
  /** 六边形尺寸 */
  hexSize: number;
  /** 六边形方向 */
  orientation: HexOrientation;
};

/**
 * 网格配置
 */
export type HexGridConfig = {
  /**
   * 绘制模式（默认 'baseOnRowColumn'）
   */
  drawMode?: DrawMode;

  // ========== baseOnRowColumn 模式参数 ==========
  /**
   * 行数（用于 baseOnRowColumn 模式）
   * 别名: height
   */
  rows?: number;
  /**
   * 列数（用于 baseOnRowColumn 模式）
   * 别名: width
   */
  columns?: number;
  /**
   * 网格宽度（列数）- 兼容旧 API，等同于 columns
   * @deprecated 使用 columns 代替
   */
  width?: number;
  /**
   * 网格高度（行数）- 兼容旧 API，等同于 rows
   * @deprecated 使用 rows 代替
   */
  height?: number;

  // ========== baseOnRadius 模式参数 ==========
  /**
   * 半径（用于 baseOnRadius 模式）
   */
  radius?: number;

  // ========== 通用配置 ==========
  /**
   * 六边形尺寸（中心到顶点距离，默认 1）
   */
  hexSize?: number;
  /**
   * 地图中心的世界坐标（默认 {x: 0, y: 0}）
   */
  mapCenter?: PixelCoord;
  /**
   * 六边形方向（默认 'flat'）
   */
  orientation?: HexOrientation;
  /**
   * 默认地形
   */
  defaultTerrain?: TerrainType;
};

// ========== HexGridModel ==========

/**
 * HexGridModel - 六边形网格逻辑模型
 *
 * 职责：
 * - 管理格子数据
 * - 管理占用者
 * - 提供坐标转换和邻居查询
 * - 通过事件通知数据变化
 *
 * 支持两种绘制模式：
 * - baseOnRowColumn: 基于行列数的矩形网格（以 0,0 为中心）
 * - baseOnRadius: 基于半径的六边形区域
 */
export class HexGridModel<T = unknown> {
  /** 格子存储 */
  private tiles: Map<string, TileData<T>> = new Map();

  /** 占用者存储 */
  private occupants: Map<string, OccupantRef> = new Map();

  /** 占用者位置索引 */
  private occupantPositions: Map<string, AxialCoord> = new Map();

  /** 格子预订状态（坐标 key -> 占用者 ID） */
  private reservations: Map<string, string> = new Map();

  /** 完整配置 */
  readonly config: Required<
    Pick<HexGridConfig, 'drawMode' | 'hexSize' | 'mapCenter' | 'orientation' | 'defaultTerrain'>
  > & {
    rows: number;
    columns: number;
    radius: number;
  };

  /** 网格宽度（列数）- 兼容旧 API */
  readonly width: number;

  /** 网格高度（行数）- 兼容旧 API */
  readonly height: number;

  // ========== 边界缓存（baseOnRowColumn 模式）==========

  /** 行起始（包含） */
  readonly rowStart: number;
  /** 行结束（不包含） */
  readonly rowEnd: number;
  /** 列起始（包含） */
  readonly colStart: number;
  /** 列结束（不包含） */
  readonly colEnd: number;

  // ========== 事件 ==========

  /** 格子更新事件 */
  readonly onTileUpdate = new EventEmitter<TileUpdateEvent>();

  /** 占用者更新事件 */
  readonly onOccupantUpdate = new EventEmitter<OccupantUpdateEvent>();

  /** 占用者移动事件 */
  readonly onOccupantMove = new EventEmitter<OccupantMoveEvent>();

  /** 构建完成事件 */
  readonly onBuildComplete = new EventEmitter<void>();

  constructor(config: HexGridConfig) {
    // 解析配置（兼容旧 API）
    const drawMode = config.drawMode ?? 'baseOnRowColumn';
    const rows = config.rows ?? config.height ?? 9;
    const columns = config.columns ?? config.width ?? 9;
    const radius = config.radius ?? 4;
    const hexSize = config.hexSize ?? 1;
    const mapCenter = config.mapCenter ?? { x: 0, y: 0 };
    const orientation = config.orientation ?? 'flat';
    const defaultTerrain = config.defaultTerrain ?? 'normal';

    this.config = {
      drawMode,
      rows,
      columns,
      radius,
      hexSize,
      mapCenter,
      orientation,
      defaultTerrain,
    };

    // 兼容旧 API
    this.width = columns;
    this.height = rows;

    // 计算边界（中心对称）
    this.rowStart = -Math.floor(rows / 2);
    this.rowEnd = Math.ceil(rows / 2);
    this.colStart = -Math.floor(columns / 2);
    this.colEnd = Math.ceil(columns / 2);

    // 初始化所有格子
    this.buildTiles(defaultTerrain);
  }

  /**
   * 构建格子数据
   */
  private buildTiles(defaultTerrain: TerrainType): void {
    if (this.config.drawMode === 'baseOnRadius') {
      this.buildTilesBaseOnRadius(defaultTerrain);
    } else {
      this.buildTilesBaseOnRowColumn(defaultTerrain);
    }

    this.onBuildComplete.emit();
  }

  /**
   * 基于行列数构建格子（中心对称）
   *
   * 9x9 地图: row/col 范围 [-4, 5)
   * 8x9 地图: row [-4, 4), col [-4, 5)
   */
  private buildTilesBaseOnRowColumn(defaultTerrain: TerrainType): void {
    const { orientation } = this.config;

    // 遍历中心对称的行列范围
    for (let col = this.colStart; col < this.colEnd; col++) {
      for (let row = this.rowStart; row < this.rowEnd; row++) {
        let coord: AxialCoord;

        if (orientation === 'flat') {
          // Flat-top: odd-q offset to axial
          // q = col, r = row - (col - (col & 1)) / 2
          const q = col;
          const r = row - Math.floor((col - (col & 1)) / 2);
          coord = { q, r };
        } else {
          // Pointy-top: odd-r offset to axial
          // q = col - (row - (row & 1)) / 2, r = row
          const q = col - Math.floor((row - (row & 1)) / 2);
          const r = row;
          coord = { q, r };
        }

        this.tiles.set(hexKey(coord), {
          coord,
          terrain: defaultTerrain,
          moveCost: 1,
          height: 0,
        });
      }
    }
  }

  /**
   * 基于半径构建格子（六边形区域）
   */
  private buildTilesBaseOnRadius(defaultTerrain: TerrainType): void {
    const { radius } = this.config;
    const origin = axial(0, 0);

    // 使用 hexRange 获取半径内的所有格子
    const coords = hexRange(origin, radius);

    for (const coord of coords) {
      this.tiles.set(hexKey(coord), {
        coord,
        terrain: defaultTerrain,
        moveCost: 1,
        height: 0,
      });
    }
  }

  // ========== 格子操作 ==========

  /**
   * 获取格子
   */
  getTile(coord: AxialCoord): TileData<T> | undefined {
    return this.tiles.get(hexKey(coord));
  }

  /**
   * 更新格子（触发事件）
   */
  updateTile(coord: AxialCoord, updates: Partial<Omit<TileData<T>, 'coord'>>): boolean {
    const tile = this.tiles.get(hexKey(coord));
    if (!tile) return false;

    const oldTile = { ...tile };

    // 应用更新
    if (updates.terrain !== undefined) tile.terrain = updates.terrain;
    if (updates.moveCost !== undefined) tile.moveCost = updates.moveCost;
    if (updates.height !== undefined) tile.height = updates.height;
    if (updates.customData !== undefined) tile.customData = updates.customData;

    // 触发事件
    this.onTileUpdate.emit({ coord, oldTile, newTile: tile });

    return true;
  }

  /**
   * 检查格子是否存在
   */
  hasTile(coord: AxialCoord): boolean {
    return this.tiles.has(hexKey(coord));
  }

  /**
   * 检查格子是否可通行
   */
  isPassable(coord: AxialCoord): boolean {
    const tile = this.getTile(coord);
    if (!tile) return false;
    if (tile.terrain === 'blocked') return false;
    if (this.getOccupantAt(coord)) return false;
    return true;
  }

  /**
   * 检查格子是否被占据
   */
  isOccupied(coord: AxialCoord): boolean {
    return this.occupants.has(hexKey(coord));
  }

  // ========== 占用者管理 ==========

  /**
   * 放置占用者
   */
  placeOccupant(coord: AxialCoord, occupant: OccupantRef): boolean {
    const tile = this.getTile(coord);
    if (!tile) return false;

    const key = hexKey(coord);
    const oldOccupant = this.occupants.get(key);

    // 如果该位置已有占用者
    if (oldOccupant) return false;

    this.occupants.set(key, occupant);
    this.occupantPositions.set(occupant.id, coord);

    // 触发事件
    this.onOccupantUpdate.emit({ coord, oldOccupant: undefined, newOccupant: occupant });

    return true;
  }

  /**
   * 移除占用者
   */
  removeOccupant(coord: AxialCoord): OccupantRef | undefined {
    const key = hexKey(coord);
    const occupant = this.occupants.get(key);

    if (!occupant) return undefined;

    this.occupants.delete(key);
    this.occupantPositions.delete(occupant.id);

    // 触发事件
    this.onOccupantUpdate.emit({ coord, oldOccupant: occupant, newOccupant: undefined });

    return occupant;
  }

  /**
   * 移动占用者
   */
  moveOccupant(from: AxialCoord, to: AxialCoord): boolean {
    const fromKey = hexKey(from);
    const toKey = hexKey(to);

    const occupant = this.occupants.get(fromKey);
    if (!occupant) return false;

    // 检查目标位置
    if (!this.hasTile(to)) return false;
    if (this.occupants.has(toKey)) return false;

    // 检查目标格子是否被其他人预订
    const reservation = this.reservations.get(toKey);
    if (reservation && reservation !== occupant.id) return false;

    // 执行移动
    this.occupants.delete(fromKey);
    this.occupants.set(toKey, occupant);
    this.occupantPositions.set(occupant.id, to);

    // 自动取消目标格子的预订（仅当预订是自己的）
    if (reservation === occupant.id) {
      this.reservations.delete(toKey);
    }

    // 触发事件
    this.onOccupantMove.emit({ occupant, from, to });

    return true;
  }

  /**
   * 获取格子上的占用者
   */
  getOccupantAt(coord: AxialCoord): OccupantRef | undefined {
    return this.occupants.get(hexKey(coord));
  }

  /**
   * 查找占用者的位置
   */
  findOccupantPosition(occupantId: string): AxialCoord | undefined {
    return this.occupantPositions.get(occupantId);
  }

  // ========== 格子预订机制 ==========

  /**
   * 预订目标格子
   *
   * 用于防止移动冲突：在移动开始时预订目标格子，在移动完成时取消预订。
   *
   * @param coord 目标坐标
   * @param occupantId 预订的占用者 ID
   * @returns 是否预订成功（如果格子已被其他单位预订或占用则失败）
   */
  reserveTile(coord: AxialCoord, occupantId: string): boolean {
    const key = hexKey(coord);

    // 检查格子是否存在
    if (!this.hasTile(coord)) {
      return false;
    }

    // 检查格子是否已被预订
    const existingReservation = this.reservations.get(key);
    if (existingReservation && existingReservation !== occupantId) {
      return false;
    }

    // 检查格子是否已被占用（排除自己）
    const occupant = this.occupants.get(key);
    if (occupant && occupant.id !== occupantId) {
      return false;
    }

    // 预订成功
    this.reservations.set(key, occupantId);
    return true;
  }

  /**
   * 取消格子预订
   *
   * @param coord 目标坐标
   */
  cancelReservation(coord: AxialCoord): void {
    this.reservations.delete(hexKey(coord));
  }

  /**
   * 获取格子的预订状态
   *
   * @param coord 目标坐标
   * @returns 预订该格子的占用者 ID，如果未被预订则返回 undefined
   */
  getReservation(coord: AxialCoord): string | undefined {
    return this.reservations.get(hexKey(coord));
  }

  /**
   * 检查格子是否已被预订
   *
   * @param coord 目标坐标
   * @returns 格子是否已被预订
   */
  isReserved(coord: AxialCoord): boolean {
    return this.reservations.has(hexKey(coord));
  }

  // ========== 范围查询 ==========

  /**
   * 获取可移动范围（BFS）
   */
  getMovableRange(from: AxialCoord, maxCost: number): AxialCoord[] {
    const result: AxialCoord[] = [];
    const visited = new Set<string>();
    const queue: Array<{ coord: AxialCoord; cost: number }> = [{ coord: from, cost: 0 }];

    visited.add(hexKey(from));

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.cost > 0) {
        result.push(current.coord);
      }

      if (current.cost >= maxCost) continue;

      for (const neighbor of hexNeighbors(current.coord)) {
        const key = hexKey(neighbor);
        if (visited.has(key)) continue;

        const tile = this.getTile(neighbor);
        if (!tile) continue;
        if (tile.terrain === 'blocked') continue;
        if (this.getOccupantAt(neighbor)) continue;

        const newCost = current.cost + tile.moveCost;
        if (newCost <= maxCost) {
          visited.add(key);
          queue.push({ coord: neighbor, cost: newCost });
        }
      }
    }

    return result;
  }

  /**
   * 获取攻击范围
   */
  getAttackRange(from: AxialCoord, range: number): AxialCoord[] {
    const result: AxialCoord[] = [];

    for (const [, tile] of this.tiles) {
      const dist = hexDistance(from, tile.coord);
      if (dist > 0 && dist <= range && this.hasTile(tile.coord)) {
        result.push(tile.coord);
      }
    }

    return result;
  }

  // ========== 遍历 ==========

  /**
   * 获取所有格子
   */
  getAllTiles(): IterableIterator<TileData<T>> {
    return this.tiles.values();
  }

  /**
   * 获取所有占用者位置
   */
  getAllOccupants(): Map<string, AxialCoord> {
    return new Map(this.occupantPositions);
  }

  /**
   * 遍历所有格子坐标
   */
  forEachCoord(fn: (coord: AxialCoord, row: number, col: number) => void): void {
    if (this.config.drawMode === 'baseOnRadius') {
      // 半径模式：row/col 没有意义，都传 0
      for (const tile of this.tiles.values()) {
        fn(tile.coord, 0, 0);
      }
    } else {
      // 行列模式：提供 row/col 信息
      for (let col = this.colStart; col < this.colEnd; col++) {
        for (let row = this.rowStart; row < this.rowEnd; row++) {
          const tile = this.getTileByRowCol(row, col);
          if (tile) {
            fn(tile.coord, row, col);
          }
        }
      }
    }
  }

  /**
   * 根据 row/col 获取格子（仅 baseOnRowColumn 模式有效）
   */
  getTileByRowCol(row: number, col: number): TileData<T> | undefined {
    if (this.config.drawMode !== 'baseOnRowColumn') {
      return undefined;
    }

    const { orientation } = this.config;
    let coord: AxialCoord;

    if (orientation === 'flat') {
      const q = col;
      const r = row - Math.floor((col - (col & 1)) / 2);
      coord = { q, r };
    } else {
      const q = col - Math.floor((row - (row & 1)) / 2);
      const r = row;
      coord = { q, r };
    }

    return this.getTile(coord);
  }

  // ========== 坐标转换 ==========

  /**
   * 获取世界坐标转换配置
   */
  getWorldCoordConfig(): WorldCoordConfig {
    return {
      hexSize: this.config.hexSize,
      mapCenter: this.config.mapCenter,
      orientation: this.config.orientation,
    };
  }

  /**
   * 六边形坐标转世界坐标
   */
  coordToWorld(coord: AxialCoord): PixelCoord {
    return hexToWorld(coord, this.getWorldCoordConfig());
  }

  /**
   * 六边形坐标转世界坐标（返回 Vector3）
   *
   * z 轴始终为 0
   */
  coordToWorldV3(coord: AxialCoord): Vector3 {
    return hexToWorldV3(coord, this.getWorldCoordConfig());
  }

  /**
   * 世界坐标转六边形坐标
   */
  worldToCoord(pixel: PixelCoord): AxialCoord {
    return worldToHex(pixel, this.getWorldCoordConfig());
  }

  /**
   * 检查坐标是否在地图范围内
   */
  isCoordInMapArea(coord: AxialCoord): boolean {
    return this.hasTile(coord);
  }

  /**
   * 获取相邻六边形的世界距离
   */
  getAdjacentWorldDistance(): number {
    return getAdjacentHexDistance(this.config.hexSize, this.config.orientation);
  }

  // ========== 清理 ==========

  /**
   * 清理所有事件监听器
   */
  destroy(): void {
    this.reservations.clear();
    this.onTileUpdate.clear();
    this.onOccupantUpdate.clear();
    this.onOccupantMove.clear();
    this.onBuildComplete.clear();
  }

  // ========== 序列化 ==========

  /**
   * 导出地图配置（用于序列化/回放）
   *
   * 返回重建地图所需的最小配置
   */
  toMapConfig(): HexMapConfig {
    return {
      type: "hex",
      rows: this.config.rows,
      columns: this.config.columns,
      hexSize: this.config.hexSize,
      orientation: this.config.orientation,
    };
  }

  serialize(): object {
    const tiles: Array<{
      coord: AxialCoord;
      terrain: TerrainType;
      moveCost: number;
      height: number;
      occupantId?: string;
      customData?: T;
    }> = [];

    for (const tile of this.tiles.values()) {
      const occupant = this.getOccupantAt(tile.coord);
      tiles.push({
        coord: tile.coord,
        terrain: tile.terrain,
        moveCost: tile.moveCost,
        height: tile.height,
        occupantId: occupant?.id,
        customData: tile.customData,
      });
    }

    return {
      width: this.width,
      height: this.height,
      tiles,
    };
  }
}
