/**
 * HexGridModel - 六边形网格逻辑层模型
 *
 * 参考 UE GridMapModel 设计：
 * - 纯数据模型，不依赖渲染
 * - 通过事件通知变化，Renderer 订阅事件更新视图
 * - Model 不知道 Renderer 的存在（单向依赖）
 */

import {
  type AxialCoord,
  hexKey,
  hexEquals,
} from './HexCoord.js';
import { hexNeighbors, hexDistance } from './HexUtils.js';

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
 * 网格配置
 */
export type HexGridConfig = {
  /** 网格宽度（列数） */
  width: number;
  /** 网格高度（行数） */
  height: number;
  /** 默认地形 */
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
 */
export class HexGridModel<T = unknown> {
  /** 格子存储 */
  private tiles: Map<string, TileData<T>> = new Map();

  /** 占用者存储 */
  private occupants: Map<string, OccupantRef> = new Map();

  /** 占用者位置索引 */
  private occupantPositions: Map<string, AxialCoord> = new Map();

  /** 网格宽度 */
  readonly width: number;

  /** 网格高度 */
  readonly height: number;

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
    this.width = config.width;
    this.height = config.height;

    // 初始化所有格子
    this.buildTiles(config.defaultTerrain ?? 'normal');
  }

  /**
   * 构建格子数据
   */
  private buildTiles(defaultTerrain: TerrainType): void {
    // 使用 offset 坐标转 axial 来生成矩形网格
    // 这里使用 "odd-q" 布局（flat-top，奇数列下移）
    for (let col = 0; col < this.width; col++) {
      for (let row = 0; row < this.height; row++) {
        // odd-q offset to axial 转换
        const q = col;
        const r = row - Math.floor(col / 2);
        const coord: AxialCoord = { q, r };

        this.tiles.set(hexKey(coord), {
          coord,
          terrain: defaultTerrain,
          moveCost: 1,
          height: 0,
        });
      }
    }

    this.onBuildComplete.emit();
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

    // 执行移动
    this.occupants.delete(fromKey);
    this.occupants.set(toKey, occupant);
    this.occupantPositions.set(occupant.id, to);

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

  // ========== 清理 ==========

  /**
   * 清理所有事件监听器
   */
  destroy(): void {
    this.onTileUpdate.clear();
    this.onOccupantUpdate.clear();
    this.onOccupantMove.clear();
    this.onBuildComplete.clear();
  }

  // ========== 序列化 ==========

  /**
   * 序列化为普通对象
   */
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
