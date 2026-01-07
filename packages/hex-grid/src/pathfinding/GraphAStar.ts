/**
 * GraphAStar - 泛型 A* 寻路器
 *
 * 参考: UE GraphAStar.h FGraphAStar
 */

import { MinHeap } from './MinHeap.js';
import type {
  IGraph,
  IPathFilter,
  PathInfo,
  SearchNode,
  FloodResult,
  GraphAStarOptions,
} from './types.js';
import { PathfindingResult } from './types.js';

/** 最小代价阈值，防止零代价导致无限循环 */
const MIN_COST_EPSILON = 0.001;

/** 默认最大搜索节点数 */
const DEFAULT_MAX_SEARCH_NODES = 10000;

/**
 * 泛型 A* 寻路器
 *
 * @typeParam TNodeRef - 节点引用类型
 *
 * @example
 * ```typescript
 * const pathfinder = new GraphAStar(hexGridGraph);
 * const result = pathfinder.findPath(startCoord, endCoord, pathFilter);
 * ```
 */
export class GraphAStar<TNodeRef> {
  private readonly graph: IGraph<TNodeRef>;
  private readonly options: GraphAStarOptions<TNodeRef>;
  private nodePool: Map<string, SearchNode<TNodeRef>> = new Map();
  private openList: MinHeap<SearchNode<TNodeRef>>;

  constructor(graph: IGraph<TNodeRef>, options?: GraphAStarOptions<TNodeRef>) {
    this.graph = graph;
    this.options = options || {};
    this.openList = new MinHeap((a, b) => a.totalCost - b.totalCost);
  }

  /**
   * 执行 A* 寻路
   */
  findPath(start: TNodeRef, end: TNodeRef, filter: IPathFilter<TNodeRef>): PathInfo<TNodeRef> {
    // 1. 预检
    if (!this.graph.isValidRef(start)) {
      return this.createFailResult(PathfindingResult.SearchFail);
    }
    if (!this.graph.isValidRef(end)) {
      return this.createFailResult(PathfindingResult.SearchFail);
    }

    const startKey = this.graph.getKey(start);
    const endKey = this.graph.getKey(end);

    // 起点即终点
    if (startKey === endKey) {
      const includeStart = filter.shouldIncludeStartNodeInPath?.() ?? false;
      return {
        result: PathfindingResult.SearchSuccess,
        path: includeStart ? [start] : [],
        totalCost: 0,
        nodesSearched: 1,
      };
    }

    // 可选快速失败：检查终点是否可通行
    if (!filter.isTraversalAllowed(end, end)) {
      return this.createFailResult(PathfindingResult.GoalUnreachable);
    }

    // 2. 初始化
    this.reset();

    const heuristicScale = filter.getHeuristicScale();
    const maxSearchNodes = filter.getMaxSearchNodes?.() ?? DEFAULT_MAX_SEARCH_NODES;
    const costLimit = filter.getCostLimit?.() ?? Infinity;
    const shouldIgnoreClosed = filter.shouldIgnoreClosedNodes?.() ?? true;

    // 创建起点节点
    const startNode = this.createNode(start, startKey);
    startNode.traversalCost = 0;
    startNode.totalCost = filter.getHeuristicCost(start, end) * heuristicScale;
    startNode.isOpened = true;
    this.openList.push(startNode);

    // 记录最佳候选（用于部分解）
    let bestCandidateKey = startKey;
    let bestCandidateHeuristic = startNode.totalCost;

    let nodesSearched = 0;

    // 3. 主循环
    while (!this.openList.isEmpty()) {
      const current = this.openList.pop()!;
      current.isOpened = false;
      current.isClosed = true;
      nodesSearched++;

      // 调试回调
      this.options.onNodeVisited?.(current.nodeRef);

      const currentKey = this.graph.getKey(current.nodeRef);

      // 到达终点
      if (currentKey === endKey) {
        return this.buildPathResult(
          PathfindingResult.SearchSuccess,
          current,
          nodesSearched,
          filter
        );
      }

      // 检查搜索节点数限制
      if (nodesSearched >= maxSearchNodes) {
        if (filter.wantsPartialSolution()) {
          const bestNode = this.nodePool.get(bestCandidateKey);
          if (bestNode) {
            return this.buildPathResult(
              PathfindingResult.InfiniteLoop,
              bestNode,
              nodesSearched,
              filter
            );
          }
        }
        return {
          result: PathfindingResult.InfiniteLoop,
          path: [],
          totalCost: 0,
          nodesSearched,
        };
      }

      // 邻居遍历
      const neighbors = this.graph.getNeighbors(current.nodeRef);

      for (const neighborRef of neighbors) {
        const neighborKey = this.graph.getKey(neighborRef);

        // 获取或创建邻居节点
        let neighborNode = this.nodePool.get(neighborKey);

        // 检查已关闭节点
        if (neighborNode?.isClosed && shouldIgnoreClosed) {
          continue;
        }

        // 检查通行性
        if (!filter.isTraversalAllowed(current.nodeRef, neighborRef)) {
          continue;
        }

        // 计算新代价
        const traversalCost = filter.getTraversalCost(current.nodeRef, neighborRef);
        const newG = current.traversalCost + Math.max(traversalCost, MIN_COST_EPSILON);

        // 检查代价限制
        if (newG > costLimit) {
          continue;
        }

        // 创建新节点或检查是否更优
        if (!neighborNode) {
          neighborNode = this.createNode(neighborRef, neighborKey);
        } else if (newG >= neighborNode.traversalCost) {
          // 新路径不比已有路径更优
          continue;
        }

        // 计算启发式代价
        const heuristic = filter.getHeuristicCost(neighborRef, end) * heuristicScale;
        const newF = newG + heuristic;

        // 更新节点
        neighborNode.parentKey = currentKey;
        neighborNode.traversalCost = newG;
        neighborNode.totalCost = newF;

        // 如果不在关闭集且不在开放集，需要重新打开
        if (neighborNode.isClosed) {
          neighborNode.isClosed = false;
        }

        if (!neighborNode.isOpened) {
          neighborNode.isOpened = true;
          this.openList.push(neighborNode);
        } else {
          this.openList.update(neighborNode);
        }

        // 更新最佳候选
        if (heuristic < bestCandidateHeuristic) {
          bestCandidateHeuristic = heuristic;
          bestCandidateKey = neighborKey;
        }
      }
    }

    // 4. 收尾 - 未找到路径
    if (filter.wantsPartialSolution()) {
      const bestNode = this.nodePool.get(bestCandidateKey);
      if (bestNode && bestCandidateKey !== startKey) {
        return this.buildPathResult(
          PathfindingResult.GoalUnreachable,
          bestNode,
          nodesSearched,
          filter
        );
      }
    }

    return {
      result: PathfindingResult.GoalUnreachable,
      path: [],
      totalCost: 0,
      nodesSearched,
    };
  }

  /**
   * 泛洪填充 (Dijkstra)
   *
   * 用于计算移动范围、技能范围等
   */
  floodFrom(start: TNodeRef, filter: IPathFilter<TNodeRef>): FloodResult<TNodeRef> {
    const graph = this.graph;

    // 预检
    if (!graph.isValidRef(start)) {
      return this.createEmptyFloodResult();
    }

    // 初始化
    this.reset();

    const costLimit = filter.getCostLimit?.() ?? Infinity;
    const maxSearchNodes = filter.getMaxSearchNodes?.() ?? DEFAULT_MAX_SEARCH_NODES;
    const shouldIgnoreClosed = filter.shouldIgnoreClosedNodes?.() ?? true;

    const startKey = graph.getKey(start);
    const startNode = this.createNode(start, startKey);
    startNode.traversalCost = 0;
    startNode.totalCost = 0; // Dijkstra: H = 0
    startNode.isOpened = true;
    this.openList.push(startNode);

    let nodesSearched = 0;

    // 主循环 (Dijkstra - 无目标点)
    while (!this.openList.isEmpty()) {
      const current = this.openList.pop()!;
      current.isOpened = false;
      current.isClosed = true;
      nodesSearched++;

      this.options.onNodeVisited?.(current.nodeRef);

      if (nodesSearched >= maxSearchNodes) {
        break;
      }

      const currentKey = graph.getKey(current.nodeRef);
      const neighbors = graph.getNeighbors(current.nodeRef);

      for (const neighborRef of neighbors) {
        const neighborKey = graph.getKey(neighborRef);

        let neighborNode = this.nodePool.get(neighborKey);

        if (neighborNode?.isClosed && shouldIgnoreClosed) {
          continue;
        }

        if (!filter.isTraversalAllowed(current.nodeRef, neighborRef)) {
          continue;
        }

        const traversalCost = filter.getTraversalCost(current.nodeRef, neighborRef);
        const newG = current.traversalCost + Math.max(traversalCost, MIN_COST_EPSILON);

        if (newG > costLimit) {
          continue;
        }

        if (!neighborNode) {
          neighborNode = this.createNode(neighborRef, neighborKey);
        } else if (newG >= neighborNode.traversalCost) {
          continue;
        }

        neighborNode.parentKey = currentKey;
        neighborNode.traversalCost = newG;
        neighborNode.totalCost = newG; // Dijkstra: F = G

        if (neighborNode.isClosed) {
          neighborNode.isClosed = false;
        }

        if (!neighborNode.isOpened) {
          neighborNode.isOpened = true;
          this.openList.push(neighborNode);
        } else {
          this.openList.update(neighborNode);
        }
      }
    }

    return this.createFloodResult();
  }

  /**
   * 重置内部状态
   */
  reset(): void {
    this.nodePool.clear();
    this.openList.clear();
  }

  // ========== 私有方法 ==========

  private createNode(nodeRef: TNodeRef, key: string): SearchNode<TNodeRef> {
    const node: SearchNode<TNodeRef> = {
      nodeRef,
      parentKey: null,
      traversalCost: Infinity,
      totalCost: Infinity,
      isOpened: false,
      isClosed: false,
    };
    this.nodePool.set(key, node);
    return node;
  }

  private createFailResult(result: PathfindingResult): PathInfo<TNodeRef> {
    return {
      result,
      path: [],
      totalCost: 0,
      nodesSearched: 0,
    };
  }

  private buildPathResult(
    result: PathfindingResult,
    endNode: SearchNode<TNodeRef>,
    nodesSearched: number,
    filter: IPathFilter<TNodeRef>
  ): PathInfo<TNodeRef> {
    const path: TNodeRef[] = [];
    const includeStart = filter.shouldIncludeStartNodeInPath?.() ?? false;

    // 回溯路径
    let currentNode: SearchNode<TNodeRef> | undefined = endNode;
    while (currentNode) {
      path.push(currentNode.nodeRef);
      if (currentNode.parentKey === null) {
        // 到达起点
        if (!includeStart && path.length > 1) {
          path.pop(); // 移除起点
        }
        break;
      }
      currentNode = this.nodePool.get(currentNode.parentKey);
    }

    // 反转路径（回溯得到的是逆序）
    path.reverse();

    return {
      result,
      path,
      totalCost: endNode.traversalCost,
      nodesSearched,
    };
  }

  private createEmptyFloodResult(): FloodResult<TNodeRef> {
    const graph = this.graph;
    return {
      reachable: new Map(),
      getPathTo: () => [],
      isReachable: () => false,
      getCostTo: () => Infinity,
    };
  }

  private createFloodResult(): FloodResult<TNodeRef> {
    const graph = this.graph;
    const nodePool = this.nodePool;

    const getPathTo = (target: TNodeRef): TNodeRef[] => {
      const targetKey = graph.getKey(target);
      const targetNode = nodePool.get(targetKey);
      if (!targetNode || !targetNode.isClosed) {
        return [];
      }

      const path: TNodeRef[] = [];
      let current: SearchNode<TNodeRef> | undefined = targetNode;
      while (current) {
        path.push(current.nodeRef);
        if (current.parentKey === null) break;
        current = nodePool.get(current.parentKey);
      }
      path.reverse();
      return path;
    };

    const isReachable = (target: TNodeRef): boolean => {
      const targetKey = graph.getKey(target);
      const node = nodePool.get(targetKey);
      return node?.isClosed ?? false;
    };

    const getCostTo = (target: TNodeRef): number => {
      const targetKey = graph.getKey(target);
      const node = nodePool.get(targetKey);
      if (!node || !node.isClosed) return Infinity;
      return node.traversalCost;
    };

    return {
      reachable: new Map(nodePool),
      getPathTo,
      isReachable,
      getCostTo,
    };
  }
}
