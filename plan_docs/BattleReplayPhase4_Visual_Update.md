# Phase 4 修正案：可视化战斗回放与地图集成

> **创建日期**：2026-01-08
> **关联文档**：
> - 原计划：`plan_docs\BattleReplayPhase4_WebValidation.md` (本许修正案将取代原计划中的 "Visual" 部分)
> - 协议：`plan_docs\BattleReplayProtocol_v2.md`
> **状态**：Draft

---

## 1. 背景与目标

用户反馈当前的 Web 回放验证方案过于简陋（纯文本/列表），不够直观。
**新的目标**是利用项目中已有的地图绘制能力（`HexagonGrid` 及其逻辑），实现一个**基于地图的、可视化的战斗回放器**。

### 核心体验升级
- **从** "看日志找数据" **转变为** "看动画悟战局"。
- **从** "列表显示单位" **转变为** "地图上的 Token 移动"。
- **从** "数字变化" **转变为** "飘字与特效"。

---

## 2. 现有资源分析

- **地图绘制逻辑**：`inkmon-pokedex\components\world\HexagonGrid.tsx` 中已经实现了 Flat-top 六边形的 `hexToPixel` 转换与网格生成逻辑。
- **战斗数据**：`IBattleRecord` 包含完整的 `timeline` 和 `initialActors`，足够重现每一帧的空间状态。
- **当前播放器**：`BattleReplayPlayer.tsx` 已实现了基础的 Time-Travel (帧控制) 和 Reducer 状态管理。

---

## 3. 技术方案详解

### 3.1 提取核心六边形逻辑 (Refactor)

为了复用地图逻辑，不应直接依赖耦合了 `WorldRegion` 的 `HexagonGrid` 组件，而是提取纯数学/布局逻辑。

**新建：`inkmon-pokedex\lib\hex-layout.ts`**
```typescript
export const HEX_LAYOUT = {
  width: 130,
  height: 112,
  spacingX: 130 * 0.75,
  spacingY: 112
};

export function hexToPixel(q: number, r: number): { x: number; y: number } {
  // ... 提取原 HexagonGrid 中的逻辑
}

export function getGridBounds(positions: {q: number, r: number}[]): { minX: number, maxX: number, ... } {
  // ... 计算包围盒逻辑
}
```

### 3.2 新组件：`BattleStage` (战斗舞台)

这是本次修改的核心 UI 组件，负责渲染“游戏画面”。

**位置**：`inkmon-pokedex\components\battle-replay\BattleStage.tsx`

**Props**:
```typescript
interface BattleStageProps {
  actors: ActorState[];  // 当前帧的所有单位状态
  events: InkMonReplayEvent[]; // 当前帧发生的事件（用于播放瞬时特效）
  mapRadius?: number;    // 地图半径，默认为 4 或 5
}
```

**功能模块**：

1.  **Grid Layer (背景层)**
    - 渲染静态的六边形网格地板。
    - 区别于 WorldMap，这里是战斗棋盘，可以使用更简洁的样式（如深色科技风或简单的方格材质）。
    - 坐标系：以 (0,0) 为中心。

2.  **Unit Layer (单位层)**
    - 遍历 `actors`，使用 `hexToPixel(actor.position)` 计算绝对位置。
    - **关键优化**：加上 CSS `transition: top 0.3s, left 0.3s`，这样当 Unit 坐标变化时，会自动产生平滑移动动画，无需逐帧插值（MVP 阶段性价比最高的动画方案）。
    - **Unit Token**: 显示名字首字母或图标，血条，队伍颜色边框。

3.  **Effect Layer (特效层)**
    - 这是一个覆盖在 Unit 之上的 Canvas 或 DOM 层。
    - **飘字 (Floating Text)**:
        - 当 `events` 包含 `damage` 时，在目标位置生成红色数字 `-99` 并向上飘动淡出。
        - 当 `events` 包含 `heal` 时，在目标位置生成绿色数字 `+50`。
    - **技能指示**:
        - 当 `events` 包含 `skillUse` 时，在 Source 和 Target 之间画一条连线或闪烁目标格子。

### 3.3 改造 `BattleReplayPlayer`

**布局变更**：
- 采用 **左右分栏** 或 **上下分栏** 布局。
- **主视图 (左/上)**：`BattleStage`，占据大面积。
- **控制栏 (底)**：保留进度条、播放按钮。
- **信息栏 (右/侧)**：
    - `BattleLog` (原有日志功能的简化版，自动滚动到最新)。
    - `UnitDetails` (点击地图单位显示详细属性)。

### 3.4 状态管理增强 (`battleReplayReducer.ts`)

不需要大幅修改，但需确保：
- `ActorState` 必须包含准确的 `position: {q, r}`。
- `ActorState` 包含 `isDead` 状态，UI 层据此决定是否渲染尸体或变灰。

---

## 4. 实施步骤

### Step 1: 基础设施 (Utility)
- 创建 `lib/hex-layout.ts`，将 `HexagonGrid.tsx` 中的坐标计算逻辑搬运过来。
- 确保原 `HexagonGrid.tsx` 改为引用该公共库（保持向后兼容）。

### Step 2: 战斗棋盘组件 (BattleStage)
- 实现 `BattleStage` 骨架。
- 使用 `lib/hex-layout` 生成一个固定半径（例如 R=4）的网格背景。
- 实现 `BattleUnit` 组件：圆形头像 + 顶部血条。
- 将 `BattleUnit` 放置在棋盘上，验证坐标系是否正确。

### Step 3: 集成到播放器
- 修改 `BattleReplayPlayer.tsx`。
- 引入 `BattleStage`。
- 将 `state.actors` 传递给 `BattleStage`。
- 移除旧的 "Actor 列表" 视图，保留 "事件列表" 作为侧边栏。

### Step 4: 视觉反馈 (The "Juice")
- **移动插值**：给 `BattleUnit` 的外层容器添加 CSS Transition。
- **伤害飘字**：
    - 在 `BattleStage` 内部维护一个 `floatingTexts` 状态。
    - `useEffect` 监听 `props.events`。
    - 当发现 `damage/heal` 事件时，向 `floatingTexts` 推入一个对象 `{ id, text, x, y, timestamp }`。
    - 使用 CSS Animation 处理飘字的位移和透明度。
    - 定时清理过期的飘字。

---

## 5. 验收标准 (Checklist)

1.  **地图可见**：能看到六边形网格组成的战斗场地。
2.  **单位定位**：战斗开始时，双方单位出现在正确的初始格子。
3.  **移动动画**：点击 "Next Step" 或播放时，能看到单位从 A 格子**滑向** B 格子（而不是瞬移）。
4.  **血量变化**：收到伤害时，血条减少，并能看到伤害数字飘起。
5.  **死亡表现**：单位死亡后，Token 变灰或消失。
6.  **无缝集成**：可以直接替换当前的 Text-based Player，不对外围 Page 产生破坏性影响。

---

## 6. 附录：样式参考

为了快速出效果，建议样式：
- **Token**: 圆形 div，直径 80% 格子宽。
    - Team A: 蓝色边框/背景。
    - Team B: 红色边框/背景。
- **Grid**: 灰色边框的六边形，背景半透明黑。
- **Damage Text**: `font-weight: bold; color: #ff4444; text-shadow: 1px 1px 0 #000;`

---

**Next Action**: 按照此计划执行代码修改。
