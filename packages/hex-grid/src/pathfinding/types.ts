/**
 * Pathfinding Types - 寻路模块类型定义
 *
 * 参考: UE GraphAStar.h
 */

// ========== Graph 接口 ==========

/**
 * 图结构接口
 *
 * @typeParam TNodeRef - 节点引用类型（如 string, number, AxialCoord）
 */
export interface IGraph<TNodeRef> {
  /**
   * 检查节点引用是否有效（在地图范围内）
   */
  isValidRef(nodeRef: TNodeRef): boolean;

  /**
   * 获取节点的唯一字符串标识
   * 用于 NodePool 的键和去重
   */
  getKey(nodeRef: TNodeRef): string;

  /**
   * 获取节点的所有有效邻居
   *
   * 注意：实现应只返回存在的邻居节点，过滤掉 null/undefined
   */
  getNeighbors(nodeRef: TNodeRef): TNodeRef[];
}

// ========== PathFilter 接口 ==========

/**
 * 寻路过滤器接口
 *
 * @typeParam TNodeRef - 节点引用类型
 */
export interface IPathFilter<TNodeRef> {
  /**
   * 启发式代价缩放因子
   *
   * - 1.0: 标准 A*
   * - >1.0: 更贪婪，倾向直奔目标（可能非最优）
   * - <1.0: 更保守，接近 Dijkstra（保证最优）
   * - 0.0: 纯 Dijkstra
   */
  getHeuristicScale(): number;

  /**
   * 估算从 start 到 end 的启发式代价 (H)
   *
   * 必须满足"可接受性"：不能高估实际代价
   */
  getHeuristicCost(start: TNodeRef, end: TNodeRef): number;

  /**
   * 从 start 直接移动到相邻的 end 的实际代价 (G增量)
   *
   * 必须 > 0，实现中应进行断言或 Math.max(cost, epsilon) 处理
   */
  getTraversalCost(start: TNodeRef, end: TNodeRef): number;

  /**
   * 是否允许从 nodeA 遍历到 nodeB
   *
   * 用于阻挡判断：障碍物、敌人占据、不可通行地形等
   * 在 A* 展开邻居时调用
   */
  isTraversalAllowed(nodeA: TNodeRef, nodeB: TNodeRef): boolean;

  /**
   * 是否接受部分解（无法到达终点时返回最接近的路径）
   */
  wantsPartialSolution(): boolean;

  /**
   * 可选：最大搜索节点数限制
   * 返回 undefined 表示不限制
   */
  getMaxSearchNodes?(): number | undefined;

  /**
   * 可选：最大代价限制（用于寻找移动范围内的路径）
   * 返回 undefined 表示不限制
   */
  getCostLimit?(): number | undefined;

  /**
   * 可选：是否忽略已关闭节点
   *
   * - true (默认): 已关闭节点不会被重新访问，标准 A* 行为
   * - false: 允许重新访问已关闭节点（如果发现更优路径）
   *          某些特殊图结构可能需要，但会降低性能
   */
  shouldIgnoreClosedNodes?(): boolean;

  /**
   * 可选：返回的路径是否包含起点
   *
   * - false (默认): 路径从起点的下一个节点开始
   * - true: 路径包含起点本身
   */
  shouldIncludeStartNodeInPath?(): boolean;
}

// ========== 寻路结果 ==========

/**
 * 寻路结果枚举
 */
export enum PathfindingResult {
  /** 搜索失败（起点/终点无效） */
  SearchFail = 'SearchFail',
  /** 搜索成功 */
  SearchSuccess = 'SearchSuccess',
  /** 目标不可达（完全被阻挡） */
  GoalUnreachable = 'GoalUnreachable',
  /** 达到最大搜索步数（可能返回部分解） */
  InfiniteLoop = 'InfiniteLoop',
}

/**
 * 路径信息
 */
export interface PathInfo<TNodeRef> {
  /** 寻路结果 */
  result: PathfindingResult;
  /** 路径节点（从起点到终点） */
  path: TNodeRef[];
  /** 总代价 */
  totalCost: number;
  /** 搜索的节点数量（性能指标） */
  nodesSearched: number;
}

// ========== 搜索节点 ==========

/**
 * A* 搜索节点
 */
export interface SearchNode<TNodeRef> {
  /** 节点引用 */
  nodeRef: TNodeRef;
  /** 父节点的 key（用于回溯路径） */
  parentKey: string | null;
  /** 从起点到此节点的实际代价 (g) */
  traversalCost: number;
  /** 总代价 (f = g + h) */
  totalCost: number;
  /** 是否在 Open 集合中 */
  isOpened: boolean;
  /** 是否在 Closed 集合中 */
  isClosed: boolean;
}

// ========== FloodResult ==========

/**
 * 泛洪填充结果
 */
export interface FloodResult<TNodeRef> {
  /** 所有可达节点的搜索信息 */
  reachable: Map<string, SearchNode<TNodeRef>>;

  /**
   * 获取到指定目标的路径
   * 通过回溯 parentKey 构建
   *
   * @returns 路径数组，若目标不可达则返回空数组
   */
  getPathTo(target: TNodeRef): TNodeRef[];

  /**
   * 检查目标是否可达
   */
  isReachable(target: TNodeRef): boolean;

  /**
   * 获取到达目标的代价
   *
   * @returns 代价值，若不可达则返回 Infinity
   */
  getCostTo(target: TNodeRef): number;
}

// ========== GraphAStar 配置 ==========

/**
 * GraphAStar 配置选项
 */
export interface GraphAStarOptions<TNodeRef> {
  /** 调试回调：每访问一个节点时触发 */
  onNodeVisited?: (node: TNodeRef) => void;
}
