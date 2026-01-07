# hex-grid 寻路功能设计方案

> 版本: v0.4
> 日期: 2026-01-07
> 参考: UE GraphAStar.h, GridPathFindingNavMesh
> 变更历史:
>   - v0.2 针对泛型键支持、堆性能优化、接口健壮性进行改进
>   - v0.3 添加 FloodResult 封装，优化 MinHeap.update 注释
>   - v0.4 添加 shouldIgnoreClosedNodes / shouldIncludeStartNodeInPath 可选方法

## 1. 概述

为 `@lomo/hex-grid` 实现 A* 寻路功能，参考 UE 的 `FGraphAStar` 泛型设计，提供灵活、高性能的六边形网格寻路能力。

### 1.1 设计目标

1. **泛型设计** - 支持不同的图结构和过滤策略，逻辑与坐标系统解耦
2. **高性能** - 使用带索引映射的优先队列优化 `Update` 操作
3. **可扩展** - 支持自定义启发函数、代价计算、遍历规则
4. **纯逻辑** - 不依赖任何渲染/引擎框架

### 1.2 核心概念

```
                    ┌─────────────────────────────────────┐
                    │           GraphAStar<G, F>          │
                    │                                     │
                    │  ┌─────────┐      ┌─────────────┐  │
                    │  │ Graph G │      │ Filter F    │  │
                    │  │         │      │             │  │
                    │  │ getKey  │      │ heuristic   │  │
                    │  │ neighbors  ───►│ isAllowed   │  │
                    │  └─────────┘      └─────────────┘  │
                    │                                     │
                    │  NodePool (Map<string, Node>)      │
                    │       ↕                             │
                    │  OpenList (IndexMinHeap)           │
                    │                                     │
                    └─────────────────────────────────────┘
```

## 2. 接口设计

### 2.1 Graph 接口

Graph 代表图结构，负责拓扑关系和唯一标识生成：

```typescript
/**
 * 图结构接口
 *
 * @typeParam TNodeRef - 节点引用类型（如 string, number, AxialCoord）
 */
interface IGraph<TNodeRef> {
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
```

### 2.2 PathFilter 接口

PathFilter 定义寻路策略，决定边的代价和可通行性：

```typescript
/**
 * 寻路过滤器接口
 *
 * @typeParam TNodeRef - 节点引用类型
 */
interface IPathFilter<TNodeRef> {
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
   */
  getMaxSearchNodes?(): number;

  /**
   * 可选：最大代价限制（用于寻找移动范围内的路径）
   */
  getCostLimit?(): number;

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
```

### 2.3 寻路结果

```typescript
/**
 * 寻路结果枚举
 */
enum PathfindingResult {
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
interface PathInfo<TNodeRef> {
  /** 寻路结果 */
  result: PathfindingResult;
  /** 路径节点（从起点到终点） */
  path: TNodeRef[];
  /** 总代价 */
  totalCost: number;
  /** 搜索的节点数量（性能指标） */
  nodesSearched: number;
}
```

## 3. 核心实现

### 3.1 搜索节点

```typescript
/**
 * A* 搜索节点
 */
interface SearchNode<TNodeRef> {
  /** 节点引用 */
  nodeRef: TNodeRef;
  /** 父节点引用（用于回溯路径） */
  parentRef: TNodeRef | null;
  /** 从起点到此节点的实际代价 (g) */
  traversalCost: number;
  /** 总代价 (f = g + h) */
  totalCost: number;
  /** 是否在 Open 集合中 */
  isOpened: boolean;
  /** 是否在 Closed 集合中 */
  isClosed: boolean;
}
```

### 3.2 GraphAStar 类

```typescript
interface GraphAStarOptions<TNodeRef> {
  /** 调试回调：每访问一个节点时触发 */
  onNodeVisited?: (node: TNodeRef) => void;
}

class GraphAStar<TNodeRef> {
  private readonly graph: IGraph<TNodeRef>;
  // 使用 graph.getKey() 生成的字符串作为键
  private nodePool: Map<string, SearchNode<TNodeRef>>;
  private openList: MinHeap<SearchNode<TNodeRef>>;
  private options: GraphAStarOptions<TNodeRef>;

  constructor(graph: IGraph<TNodeRef>, options?: GraphAStarOptions<TNodeRef>) {
    this.graph = graph;
    this.options = options || {};
    this.nodePool = new Map();
    // 比较器：总代价小的优先
    this.openList = new MinHeap((a, b) => a.totalCost - b.totalCost);
  }

  /**
   * 执行 A* 寻路
   */
  findPath(
    start: TNodeRef,
    end: TNodeRef,
    filter: IPathFilter<TNodeRef>
  ): PathInfo<TNodeRef>;

  /**
   * 泛洪填充 (Dijkstra)
   * 用于计算移动范围、技能范围等
   *
   * @returns FloodResult 包含可达节点和便捷查询方法
   */
  floodFrom(
    start: TNodeRef,
    filter: IPathFilter<TNodeRef>
  ): FloodResult<TNodeRef>;

  /**
   * 重置内部状态 (Pool, OpenList)
   * 建议复用实例以减少内存分配
   */
  reset(): void;
}
```

### 3.3 算法流程 (findPath)

1.  **预检**:
    *   验证起点是否有效 (`graph.isValidRef`).
    *   验证终点是否有效.
    *   (可选) 验证终点是否"自身"可通行 (`filter.isTraversalAllowed(end, end)`), 快速失败.

2.  **初始化**:
    *   清空 `nodePool` 和 `openList`.
    *   创建起点 `SearchNode`, G=0, H=`heuristic(start, end)`.
    *   加入 `openList` 和 `nodePool`.

3.  **主循环 (while openList not empty)**:
    *   Pop 代价最小节点 `current`.
    *   标记 `current.isClosed = true`.
    *   `current.isOpened = false`.
    *   若 `current == end`: 构建路径返回 `SearchSuccess`.
    *   若 `nodesSearched > maxLimit`: 终止, 返回 `InfiniteLoop` (如有部分解则返回).

    *   **邻居遍历**:
        *   `neighbors = graph.getNeighbors(current)`
        *   For each `neighbor`:
            *   若 `filter.shouldIgnoreClosedNodes() !== false && neighbor.isClosed`, 跳过.
            *   若 `!filter.isTraversalAllowed(current, neighbor)`, 跳过.
            *   计算 `newG = current.G + filter.getTraversalCost(...)`.
            *   若 `newG > costLimit`, 跳过.
            
            *   获取或创建 `neighborNode` from `nodePool`.
            *   若是新节点 或 `newG < neighborNode.G`:
                *   更新 `neighborNode`: Parent=`current`, G=`newG`, H=`heuristic`, F=`G+H`.
                *   若 `!neighborNode.isOpened`:
                    *   `openList.push(neighborNode)`.
                    *   `neighborNode.isOpened = true`.
                *   若已 Open:
                    *   `openList.update(neighborNode)`.

4.  **路径构建**:
    *   从 End 节点回溯 `parentRef` 直到 Start.
    *   若 `filter.shouldIncludeStartNodeInPath()` 为 true, 将起点加入路径.
    *   反转路径数组 (回溯得到的是逆序).

5.  **收尾**:
    *   若循环结束仍未找到 End:
        *   若 `filter.wantsPartialSolution()`: 返回离目标最近(H最小)节点的路径.
        *   否则返回 `GoalUnreachable`.

### 3.4 泛洪算法 (floodFrom)

用于计算移动范围：

1.  初始化同 findPath，但 H 恒为 0 (退化为 Dijkstra).
2.  主循环中，不判断 `current == end`.
3.  遍历邻居时严格检查 `costLimit`.
4.  当 OpenList 为空时，返回 `FloodResult`.

**返回结构：**

```typescript
/**
 * 泛洪填充结果
 */
interface FloodResult<TNodeRef> {
  /** 所有可达节点的搜索信息 */
  reachable: Map<string, SearchNode<TNodeRef>>;

  /**
   * 获取到指定目标的路径
   * 通过回溯 parentRef 构建
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

## 4. hex-grid 集成

### 4.1 HexGridGraph 适配器

```typescript
/**
 * HexGridModel 的 IGraph 适配器
 */
class HexGridGraph implements IGraph<AxialCoord> {
  constructor(private readonly model: HexGridModel) {}

  isValidRef(coord: AxialCoord): boolean {
    return this.model.hasTile(coord);
  }

  getKey(coord: AxialCoord): string {
    // 使用 hexKey 保证唯一性
    return hexKey(coord);
  }

  getNeighbors(coord: AxialCoord): AxialCoord[] {
    // 过滤掉无效邻居，只返回存在的坐标
    const potential = hexNeighbors(coord);
    const valid: AxialCoord[] = [];
    for (const n of potential) {
      if (this.model.hasTile(n)) {
        valid.push(n);
      }
    }
    return valid;
  }
}
```

### 4.2 PathFilter 修正

```typescript
class HexPathFilter implements IPathFilter<AxialCoord> {
  // ...

  getTraversalCost(start: AxialCoord, end: AxialCoord): number {
    const tile = this.model.getTile(end);
    
    // 理论上 isTraversalAllowed 应该先拦截，这里做防御性编程
    if (!tile) return 1.0; 

    let cost = tile.moveCost;
    // ... 应用惩罚 ...

    // 强制最小代价，防止死循环
    return Math.max(cost, 0.001); 
  }

  isTraversalAllowed(from: AxialCoord, to: AxialCoord): boolean {
    const tile = this.model.getTile(to);
    if (!tile) return false;
    if (tile.terrain === 'blocked') return false;
    
    // ... 其他逻辑 ...
    return true;
  }
}
```

## 5. 优先队列优化 (MinHeap)

为了实现 O(1) 的堆内查找，我们需要维护元素在堆数组中的索引。

```typescript
/**
 * 带索引映射的最小堆
 * T 必须是对象引用，以便在 Map 中作为 Key
 */
class MinHeap<T extends object> {
  private heap: T[] = [];
  // 记录对象在堆中的索引：Obj -> Index
  private indexMap: Map<T, number> = new Map();
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  push(item: T): void {
    this.heap.push(item);
    this.indexMap.set(item, this.heap.length - 1);
    this.siftUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;

    const result = this.heap[0];
    const last = this.heap.pop()!;
    
    this.indexMap.delete(result);

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.indexMap.set(last, 0); // 更新索引
      this.siftDown(0);
    }

    return result;
  }

  /**
   * 更新元素优先级 (O(log n))
   * 依赖 indexMap 快速定位
   */
  update(item: T): void {
    const index = this.indexMap.get(item);
    if (index === undefined) return; // 不在堆中

    // A* 中 Key 只会减小（发现更优路径），理论上只需 siftUp
    // 但 siftDown 也调用以保证通用性（开销可忽略，最多一次比较即返回）
    this.siftUp(index);
    this.siftDown(index);
  }

  private siftUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parent]) >= 0) break;
      
      this.swap(index, parent);
      index = parent;
    }
  }

  private siftDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === index) break;

      this.swap(index, smallest);
      index = smallest;
    }
  }

  private swap(i: number, j: number): void {
    const a = this.heap[i];
    const b = this.heap[j];
    
    this.heap[i] = b;
    this.heap[j] = a;
    
    this.indexMap.set(a, j);
    this.indexMap.set(b, i);
  }
}
```

## 6. 文件结构

结构保持不变，`types.ts` 将包含新的 IGraph 定义。

## 7. 实施计划

| 阶段 | 内容 | 重点关注 |
|------|------|----------|
| Phase 1 | 基础实现 | MinHeap (带索引), GraphAStar, IGraph 接口 |
| Phase 2 | 集成 | HexGridGraph (key/neighbors), HexPathFilter |
| Phase 3 | 范围与优化 | floodFrom 实现, 单元测试覆盖各类边界 |

## 8. 验证与演示 (Validation & Demo)

为了验证算法的正确性与性能，将在 `inkmon-pokedex` 项目中构建一个可视化的调试环境。

*   **位置**: `inkmon-pokedex/app/tools/pathfinding/page.tsx`
*   **技术**: React + HTML5 Canvas
*   **功能要求**:
    1.  **交互式地图**:
        *   绘制六边形网格。
        *   左键点击设置/清除障碍物 (Wall)。
        *   右键点击设置起点 (Start) 和终点 (End)。
    2.  **可视化反馈**:
        *   高亮显示最终计算出的路径。
        *   (Debug) 利用 `onNodeVisited` 实时绘制搜索过的节点（热力图），直观展示 A* 与 Dijkstra 的区别。
    3.  **实时参数**:
        *   调整 `Heuristic Scale`。
        *   显示寻路耗时 (ms) 和 搜索节点数 (Visited Count)。