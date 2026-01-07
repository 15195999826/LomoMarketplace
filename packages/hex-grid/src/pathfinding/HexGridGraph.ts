/**
 * HexGridGraph - HexGridModel 的 IGraph 适配器
 *
 * 将 HexGridModel 适配为寻路算法可用的图结构
 */

import type { AxialCoord } from '../HexCoord.js';
import { hexKey } from '../HexCoord.js';
import { hexNeighbors } from '../HexUtils.js';
import type { HexGridModel } from '../HexGridModel.js';
import type { IGraph } from './types.js';

/**
 * HexGridModel 的 IGraph 适配器
 *
 * @example
 * ```typescript
 * const graph = new HexGridGraph(hexGridModel);
 * const pathfinder = new GraphAStar(graph);
 * ```
 */
export class HexGridGraph implements IGraph<AxialCoord> {
  constructor(private readonly model: HexGridModel) {}

  /**
   * 检查坐标是否在网格范围内
   */
  isValidRef(coord: AxialCoord): boolean {
    return this.model.hasTile(coord);
  }

  /**
   * 获取坐标的唯一字符串标识
   */
  getKey(coord: AxialCoord): string {
    return hexKey(coord);
  }

  /**
   * 获取坐标的所有有效邻居
   *
   * 只返回存在于网格中的邻居坐标
   */
  getNeighbors(coord: AxialCoord): AxialCoord[] {
    const potential = hexNeighbors(coord);
    const valid: AxialCoord[] = [];

    for (const neighbor of potential) {
      if (this.model.hasTile(neighbor)) {
        valid.push(neighbor);
      }
    }

    return valid;
  }
}
