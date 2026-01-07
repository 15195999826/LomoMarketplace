/**
 * HexPathFilter - 六边形网格默认寻路过滤器
 *
 * 提供可配置的寻路策略，支持：
 * - 启发式缩放
 * - 高度差惩罚
 * - 占用者阻挡
 * - 自定义惩罚和阻挡回调
 */

import type { AxialCoord } from '../HexCoord.js';
import { hexDistance } from '../HexUtils.js';
import type { HexGridModel } from '../HexGridModel.js';
import type { IPathFilter } from './types.js';

/** 最小代价阈值 */
const MIN_COST = 0.001;

/**
 * HexPathFilter 配置选项
 */
export interface HexPathFilterOptions {
  /**
   * 启发式缩放因子（默认 1.0）
   *
   * - 1.0: 标准 A*
   * - >1.0: 更贪婪，倾向直奔目标（可能非最优）
   * - <1.0: 更保守，接近 Dijkstra（保证最优）
   * - 0.0: 纯 Dijkstra
   */
  heuristicScale?: number;

  /**
   * 高度差惩罚系数
   *
   * 实际惩罚 = |目标高度 - 起点高度| × heightPenalty
   */
  heightPenalty?: number;

  /**
   * 是否阻挡被占据的格子（默认 true）
   */
  blockOccupied?: boolean;

  /**
   * 是否返回部分解（默认 true）
   *
   * 当无法到达目标时，返回最接近目标的路径
   */
  wantsPartialSolution?: boolean;

  /**
   * 最大搜索节点数
   */
  maxSearchNodes?: number;

  /**
   * 最大代价限制（用于移动范围计算）
   */
  costLimit?: number;

  /**
   * 是否忽略已关闭节点（默认 true）
   */
  shouldIgnoreClosedNodes?: boolean;

  /**
   * 路径是否包含起点（默认 false）
   */
  shouldIncludeStartNodeInPath?: boolean;

  /**
   * 自定义惩罚计算回调
   *
   * 返回额外的移动代价（会加到基础代价上）
   */
  customPenalty?: (from: AxialCoord, to: AxialCoord, model: HexGridModel) => number;

  /**
   * 自定义阻挡检查回调
   *
   * 返回 false 表示禁止通行
   * 注意：此回调在默认检查（地形、占用者）之后调用
   */
  customBlockCheck?: (from: AxialCoord, to: AxialCoord, model: HexGridModel) => boolean;
}

/**
 * 六边形网格默认寻路过滤器
 *
 * @example
 * ```typescript
 * const filter = new HexPathFilter(hexGridModel, {
 *   heuristicScale: 1.2,
 *   heightPenalty: 2.0,
 *   costLimit: 10,
 * });
 *
 * const result = pathfinder.findPath(start, end, filter);
 * ```
 */
export class HexPathFilter implements IPathFilter<AxialCoord> {
  constructor(
    private readonly model: HexGridModel,
    private readonly options: HexPathFilterOptions = {}
  ) {}

  /**
   * 启发式代价缩放因子
   */
  getHeuristicScale(): number {
    return this.options.heuristicScale ?? 1.0;
  }

  /**
   * 启发式代价（六边形距离）
   */
  getHeuristicCost(start: AxialCoord, end: AxialCoord): number {
    return hexDistance(start, end);
  }

  /**
   * 遍历代价
   *
   * 考虑：地形移动消耗、高度差惩罚、自定义惩罚
   */
  getTraversalCost(start: AxialCoord, end: AxialCoord): number {
    const tile = this.model.getTile(end);

    // 防御性编程：理论上 isTraversalAllowed 应该先拦截
    if (!tile) return 1.0;

    let cost = tile.moveCost;

    // 高度差惩罚
    if (this.options.heightPenalty) {
      const startTile = this.model.getTile(start);
      if (startTile) {
        const heightDiff = Math.abs(tile.height - startTile.height);
        cost += heightDiff * this.options.heightPenalty;
      }
    }

    // 自定义惩罚
    if (this.options.customPenalty) {
      cost += this.options.customPenalty(start, end, this.model);
    }

    // 强制最小代价，防止死循环
    return Math.max(cost, MIN_COST);
  }

  /**
   * 是否允许遍历
   *
   * 检查：地形阻挡、占用者阻挡、自定义阻挡
   */
  isTraversalAllowed(from: AxialCoord, to: AxialCoord): boolean {
    const tile = this.model.getTile(to);

    // 格子不存在
    if (!tile) return false;

    // 地形阻挡
    if (tile.terrain === 'blocked') return false;

    // 占用者阻挡
    if (this.options.blockOccupied !== false) {
      if (this.model.getOccupantAt(to)) return false;
    }

    // 自定义阻挡检查
    if (this.options.customBlockCheck) {
      return this.options.customBlockCheck(from, to, this.model);
    }

    return true;
  }

  /**
   * 是否接受部分解
   */
  wantsPartialSolution(): boolean {
    return this.options.wantsPartialSolution ?? true;
  }

  /**
   * 最大搜索节点数
   */
  getMaxSearchNodes(): number | undefined {
    return this.options.maxSearchNodes;
  }

  /**
   * 最大代价限制
   */
  getCostLimit(): number | undefined {
    return this.options.costLimit;
  }

  /**
   * 是否忽略已关闭节点
   */
  shouldIgnoreClosedNodes(): boolean {
    return this.options.shouldIgnoreClosedNodes ?? true;
  }

  /**
   * 路径是否包含起点
   */
  shouldIncludeStartNodeInPath(): boolean {
    return this.options.shouldIncludeStartNodeInPath ?? false;
  }
}
