# HexGrid Pathfinding：8. 验证与演示（Validation & Demo）实现方案

> 版本: v0.1
> 日期: 2026-01-07
> 关联设计: `plan_docs\\HexGrid_Pathfinding_Design.md`（第 8 节）
> 目标落地位置: `inkmon-pokedex\\app\\tools\\pathfinding\\page.tsx`

本文档是对《HexGrid_Pathfinding_Design.md》中 **8. 验证与演示** 的“落地实现规划”。重点是：在 `inkmon-pokedex` 内提供一个**可交互、可观测、可复现**的页面，用于验证 `@lomo/hex-grid` 寻路模块（`GraphAStar/HexGridGraph/HexPathFilter`）的正确性与性能表现。

---

## 0. 范围与非目标

### 范围（必须）

1. 可交互编辑六边形网格：墙体/起点/终点
2. 可运行 A*（含可调 heuristicScale）与 Dijkstra（heuristicScale=0）
3. 可视化：
   - 最终路径
   - 搜索访问节点（`onNodeVisited`）热力图/覆盖层
4. 指标：耗时（ms）、nodesSearched、路径长度、总代价、结果枚举
5. 基础验证：
   - 路径相邻性
   - 代价一致性
   - 不同 heuristicScale 的行为差异可观察

### 非目标（本阶段不做）

- 不做通用 UI 组件库；用最少样式即可
- 不做“服务器端存储/分享链接”
- 不做复杂地形编辑器（只做 blocked + 可选 moveCost）

---

## 1. 设计约束与关键依赖

### 1.1 关键依赖（来自 `@lomo/hex-grid`）

- `HexGridModel`：网格数据与坐标转换（`coordToWorld/worldToCoord`）
- `HexGridGraph`：将 `HexGridModel` 适配为 `IGraph<AxialCoord>`
- `HexPathFilter`：默认 `IPathFilter<AxialCoord>` 实现（支持 heuristicScale、blockOccupied、wantsPartialSolution、maxSearchNodes 等）
- `GraphAStar`：核心 A*（含 `GraphAStarOptions.onNodeVisited`）

### 1.2 UI 位置与 Next.js 约束

- 页面位于 Next App Router：`inkmon-pokedex/app/tools/pathfinding/page.tsx`
- 此页面必须是 Client Component：文件顶部 `\"use client\"`
- 右键交互需 `preventDefault()` 防止浏览器菜单

---

## 2. 文件结构与最小改动清单

### 2.1 新增文件（建议）

1. `inkmon-pokedex\\app\\tools\\pathfinding\\page.tsx`
   - 页面主体：控制面板 + Canvas
2. （可选）`inkmon-pokedex\\app\\tools\\pathfinding\\styles.module.css`
   - 仅承载布局样式，避免污染全局
3. （可选）`inkmon-pokedex\\lib\\pathfinding-demo\\*.ts`
   - 抽离纯函数：绘制几何、坐标换算、验证函数

### 2.2 可能需要调整的文件

- `inkmon-pokedex/app/page.tsx` 或某个导航区域增加入口链接（可选）
  - 若当前项目已有导航组件，优先加到既有导航里

---

## 3. 页面布局与交互设计

### 3.1 布局

- 左侧 Control Panel（固定宽度）
- 右侧 Canvas（自适应剩余宽高）

Control Panel 内容（最小可用）：

1. Grid 配置
   - rows / columns（或 radius）
   - orientation: flat / pointy
   - hexSize（像素）
2. 寻路参数
   - heuristicScale（0~2 或 0~5，步进 0.1）
   - wantsPartialSolution（checkbox）
   - shouldIgnoreClosedNodes（checkbox，默认 true）
   - maxSearchNodes（number）
3. 操作
   - Run（重新计算）
   - Clear Walls
   - Reset（重建网格 + 清空状态）
4. 指标展示
   - result（`PathfindingResult`）
   - timeMs
   - nodesSearched
   - pathLength
   - totalCost

### 3.2 交互规则（与原设计对齐）

- 左键：切换墙体（tile.terrain normal/blocked）
- 右键：设置 Start / End
  - 建议规则：
    - 右键点击：若无 Start → 设 Start；否则若无 End → 设 End；否则循环覆盖（Start→End→Start…）
  - 或者使用修饰键：
    - Shift+右键 = Start
    - Alt+右键 = End

### 3.3 可视化层级（从底到顶）

1. 网格底色（normal/blocked）
2. visited 热力图（可开关）
3. 路径线/路径格高亮
4. Start/End 标记

---

## 4. 状态模型（React State）

建议用 `useReducer` 管理，避免状态散落：

### 4.1 核心状态

- `model: HexGridModel`（或用 ref 保存，状态只存 config 与 tile mutations）
- `start: AxialCoord | null`
- `end: AxialCoord | null`
- `walls: Set<string>`（存 `hexKey(coord)`；同步写回 model.updateTile）
- `visited: Map<string, number>`（key -> visitOrder 或 visitCount）
- `path: AxialCoord[]`
- `metrics: { timeMs; nodesSearched; totalCost; result }`

### 4.2 状态流

- 用户点击修改墙体/起终点 → 更新状态 + 写入 `model.updateTile()`
- 点击 Run →
  1) 清空 visited
  2) 创建 `GraphAStar(graph, { onNodeVisited })`
  3) 执行 `findPath(start, end, filter)`
  4) 存储结果（path + metrics）

---

## 5. 寻路执行与参数映射

### 5.1 构造对象

- `const graph = new HexGridGraph(model)`
- `const filter = new HexPathFilter(model, { ...options })`
- `const pathfinder = new GraphAStar(graph, { onNodeVisited })`

### 5.2 参数映射建议

UI → `HexPathFilterOptions`：

- `heuristicScale` → `heuristicScale`
- `wantsPartialSolution` → `wantsPartialSolution`
- `maxSearchNodes` → `maxSearchNodes`
- `shouldIgnoreClosedNodes` → `shouldIgnoreClosedNodes`
- （可选）`costLimit`：未来如果想演示 `floodFrom` 或移动范围

注意：当前 `GraphAStar.findPath` 已实现终点快速失败：`filter.isTraversalAllowed(end, end)`。

---

## 6. Canvas 渲染方案（实现细节）

### 6.1 Canvas 尺寸与 DPR 处理

- 监听容器尺寸（`ResizeObserver`）
- 设置画布：
  - `canvas.width = cssWidth * devicePixelRatio`
  - `canvas.height = cssHeight * devicePixelRatio`
  - `ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)`

### 6.2 世界坐标与 Canvas 坐标统一

推荐：将 `HexGridModel.config.mapCenter` 设为 Canvas 中心（CSS 像素）：

- `mapCenter = { x: canvasCssWidth / 2, y: canvasCssHeight / 2 }`
- `hexSize = 24~40`（可调）

这样：

- 画格子中心点：`const p = model.coordToWorld(coord)` 直接用于 Canvas 绘制
- 点选反推坐标：`const coord = model.worldToCoord({x, y})`

### 6.3 六边形顶点计算（本页面内实现一个纯函数）

由于 `@lomo/hex-grid` 当前未提供“六边形角点”工具函数，建议在 demo 内写：

- 输入：`center: {x,y}`, `size`, `orientation`
- flat-top：角度 `angle = 60*i`（deg）
- pointy-top：角度 `angle = 60*i - 30`（deg）
- 输出 6 个顶点，用 `ctx.beginPath()` 连线闭合

### 6.4 绘制策略

- 基础网格每次全量重绘（规模默认 9x9~25x25 足够）
- visited 热力图：
  - `visitedOrder` 越小颜色越浅（或越深）
  - 用简单线性映射：`t = order / maxOrder`

为了避免 `onNodeVisited` 高频导致 React 重渲染：

- `onNodeVisited` 仅写入 `visitedRef`（`Map`）
- 每帧（`requestAnimationFrame`）合并一次：将 `visitedRef` 快照写入 state 或直接触发 redraw

---

## 7. onNodeVisited 的采样与性能

### 7.1 问题

`GraphAStar` 在主循环每 pop 一个节点都会调用 `onNodeVisited`，大地图时调用频率高。

### 7.2 建议实现

- `const visitedRef = useRef<Map<string, number>>(new Map())`
- `const visitSeqRef = useRef(0)`
- `onNodeVisited(node)`: `visitedRef.current.set(hexKey(node), ++visitSeqRef.current)`
- `Run` 时：
  - 清空 `visitedRef/current` 与 `visitSeqRef`
  - 运行寻路
  - 结束后把 `visitedRef.current` 复制到 state，用于显示统计（可选）

### 7.3 绘制节流

- 在寻路过程中可选择：
  1) “实时动画”：每 N 次访问触发一次 redraw（更酷但更复杂）
  2) “运行后展示”（推荐）：寻路结束后一次性画 visited

本阶段推荐方案 (2)，简单、稳定、指标更准。

---

## 8. 验证（Validation）策略

验证分两层：**运行时断言/自检** + **可视化直觉验证**。

### 8.1 运行时自检（Run 后执行）

对 `PathInfo` 做一组快速检查，并在 Panel 展示 Pass/Fail（或 console.warn）：

1. **相邻性**：
   - 对 `path[i] -> path[i+1]`，要求是相邻六边形
   - 可用 `hexDistance(a,b) === 1` 判断
2. **起终点一致性**：
   - `result === SearchSuccess` 时：最后一个节点应为 end
   - 若 `shouldIncludeStartNodeInPath=false`：路径第一个节点不应为 start
3. **可通行性**：
   - path 中每个节点（除 start）应满足 `model.isPassable()`（或至少 terrain != blocked）
4. **代价一致性**：
   - 重新用 filter 计算 `sum(getTraversalCost(prev,cur))` 与 `totalCost` 对比（允许浮点误差 epsilon）

> 说明：由于 `GraphAStar` 内部对 traversalCost 应用了 `MIN_COST_EPSILON`，自检时也要对 cost 做 `Math.max(cost, 0.001)` 同口径计算，避免误报。

### 8.2 A* vs Dijkstra 对照验证

提供一个“一键对照”模式（可选）：

- 使用同一张图、同一起终点
- 分别运行：
  - Dijkstra：`heuristicScale=0`
  - A*：`heuristicScale=1`
- 展示：
  - nodesSearched 的数量差异
  - 路径长度是否一致（在一致代价地图上应一致）

### 8.3 基准场景（建议内置按钮生成）

1. Empty Map：无墙
2. Maze：固定种子生成一些墙
3. Cost Field：将部分区域 moveCost 调高（例如水域 moveCost=2~5）

每种场景 Run 后：
- 人眼检查路径是否合理
- nodesSearched 是否符合直觉（A* 通常更少）

---

## 9. 演示（Demo）可交付标准（验收）

### 9.1 功能验收

- 能在页面中设置墙/起点/终点
- Run 后能看到路径高亮
- 能显示 nodesSearched 与 timeMs
- heuristicScale 调整后，能观察到 nodesSearched/路径变化
- 启用 visited 可视化后，能看到搜索区域扩张形态（A* 更“朝目标”）

### 9.2 可靠性验收

- 起点=终点时：
  - `SearchSuccess`
  - path 为空（默认不含起点）
- 终点 blocked 时：
  - 快速失败 `GoalUnreachable`
- 大量墙体时不会卡死：
  - maxSearchNodes 生效（出现 `InfiniteLoop`）

---

## 10. 实施步骤（建议按提交拆分）

1. 建路由骨架：`/tools/pathfinding` 页面 + 最简单 Canvas + 控制面板占位
2. 接入 `HexGridModel`，完成网格渲染（normal/blocked）
3. 完成交互：左键墙体、右键起终点、重绘
4. 接入寻路：Run，画路径
5. 加入 visited 收集（先运行后展示）
6. 指标展示与 Run 后自检
7. （可选）加入口链接

---

## 11. 风险与对策

1. **右键事件被浏览器菜单吞掉**：Canvas 上 `onContextMenu={e => e.preventDefault()}`
2. **Canvas DPR 模糊**：按 devicePixelRatio 处理
3. **visited 过大导致 React 卡顿**：visited 用 ref 收集，尽量减少 setState 次数
4. **坐标转换不一致**：统一用 `model.getWorldCoordConfig()` 生成 mapCenter/hexSize；不要在 demo 里另写一套 hex->pixel 逻辑（除角点计算外）

---

## 12. 可选增强（后续迭代）

- “逐步执行/动画”：每 pop 一个节点就重绘一次（需要节流 + async 执行）
- `floodFrom` 演示：移动范围（costLimit slider）与 `FloodResult.getPathTo`
- 保存/导入地图（JSON）
- 对比多种 filter：
  - blockOccupied on/off
  - shouldIgnoreClosedNodes on/off（展示性能差异）

