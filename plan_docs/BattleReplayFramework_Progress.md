# Battle Replay Framework 重构进度

> 追踪 `inkmon-pokedex` 战斗回放框架的重构进度

## 总体进度

| Phase | 名称 | 状态 | 完成日期 |
|-------|------|------|----------|
| Phase 1 | 核心类型定义 | ✅ 完成 | 2026-01-10 |
| Phase 2 | Visualizer 注册机制 | ✅ 完成 | 2026-01-10 |
| Phase 3 | ActionScheduler + RenderWorld | ✅ 完成 | 2026-01-10 |
| Phase 4 | 重构 BattleReplayPlayer | ✅ 完成 | 2026-01-10 |
| Phase 5 | 配置化 | ✅ 完成 | 2026-01-10 |

## Phase 1: 核心类型定义 ✅

**目标**：定义 VisualAction 类型系统 + VisualizerContext 接口

### 完成的文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `lib/battle-replay/types/VisualAction.ts` | 视觉动作类型定义 | ✅ |
| `lib/battle-replay/types/VisualizerContext.ts` | Visualizer 上下文接口 | ✅ |
| `lib/battle-replay/types/AnimationConfig.ts` | 动画配置类型 | ✅ |
| `lib/battle-replay/types/RenderState.ts` | 渲染状态类型 | ✅ |
| `lib/battle-replay/types/index.ts` | 类型导出入口 | ✅ |

### 定义的类型

#### VisualAction 类型

- `MoveAction` - 移动动作
- `UpdateHPAction` - 血条更新动作
- `FloatingTextAction` - 飘字动作
- `SpriteVFXAction` - Sprite 特效动作
- `ProceduralVFXAction` - 程序化特效动作

#### 辅助类型

- `HexCoord` - 六边形坐标（别名 `@lomo/hex-grid` 的 `AxialCoord`）
- `WorldCoord` - 世界坐标（别名 `@lomo/hex-grid` 的 `PixelCoord`）
- `EasingFunction` - 缓动函数
- `ActiveAction` - 运行时动作状态

#### 渲染状态类型

- `ActorRenderState` - 角色渲染状态
- `SpriteVFXInstance` - Sprite 特效实例
- `ProceduralEffectInstance` - 程序化特效实例
- `FloatingTextInstance` - 飘字实例
- `RenderState` - 完整渲染状态

#### 配置类型

- `AnimationConfig` - 完整动画配置
- `MoveAnimationConfig` - 移动动画配置
- `DamageAnimationConfig` - 伤害动画配置
- `HealAnimationConfig` - 治疗动画配置
- `SkillAnimationConfig` - 技能动画配置

### 验证

- [x] TypeScript 编译通过
- [x] 类型导出正确

---

## Phase 2: Visualizer 注册机制 ✅

**目标**：可插拔的事件→动作转换器

### 完成的文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `lib/battle-replay/visualizers/IVisualizer.ts` | 接口定义 | ✅ |
| `lib/battle-replay/visualizers/VisualizerRegistry.ts` | 注册表 | ✅ |
| `lib/battle-replay/visualizers/impl/MoveVisualizer.ts` | 移动事件转换器 | ✅ |
| `lib/battle-replay/visualizers/impl/DamageVisualizer.ts` | 伤害事件转换器 | ✅ |
| `lib/battle-replay/visualizers/impl/SkillVisualizer.ts` | 技能事件转换器 | ✅ |
| `lib/battle-replay/visualizers/impl/HealVisualizer.ts` | 治疗事件转换器 | ✅ |
| `lib/battle-replay/visualizers/impl/index.ts` | 实现导出 | ✅ |
| `lib/battle-replay/visualizers/index.ts` | 模块导出 | ✅ |

### 实现的 Visualizer

| Visualizer | 输入事件 | 输出动作 |
|------------|----------|----------|
| `MoveVisualizer` | `move_start` | `MoveAction` |
| `DamageVisualizer` | `damage` | `FloatingTextAction` + `UpdateHPAction` |
| `SkillVisualizer` | `skillUse` | `MeleeStrikeAction` |
| `HealVisualizer` | `heal` | `FloatingTextAction` + `UpdateHPAction` |

### 验证

- [x] TypeScript 编译通过
- [x] 类型导出正确

---

## Phase 3: ActionScheduler + RenderWorld ✅

**目标**：动作生命周期管理、渲染状态管理

### 完成的文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `lib/battle-replay/scheduler/ActionScheduler.ts` | 动作调度器 | ✅ |
| `lib/battle-replay/scheduler/index.ts` | 模块导出 | ✅ |
| `lib/battle-replay/world/RenderWorld.ts` | 渲染状态管理 | ✅ |
| `lib/battle-replay/world/index.ts` | 模块导出 | ✅ |
| `lib/battle-replay/index.ts` | 主入口导出 | ✅ |

### ActionScheduler 实现

**核心接口**：

```typescript
interface IActionScheduler {
  enqueue(actions: VisualAction[]): void;  // 添加动作（立即并行执行）
  tick(deltaMs: number): SchedulerTickResult;  // 每帧更新
  getActiveActions(): ActiveAction[];  // 获取当前活跃动作
  cancelAll(): void;  // 取消所有动作（用于重置）
}
```

**设计特点**：
- 所有动作并行执行，无阻塞
- 支持 `delay` 延迟执行
- 自动清理已完成的动作
- `isDelaying` 标记区分延迟等待和实际执行

### RenderWorld 实现

**核心功能**：

| 方法 | 说明 |
|------|------|
| `applyActions(activeActions)` | 应用活跃动作到状态 |
| `cleanup(now)` | 清理过期效果 |
| `getState()` | 获取当前渲染状态（供 React 消费） |
| `asContext()` | 创建 VisualizerContext（只读视图） |
| `resetTo(replay)` | 重置到初始状态 |

**支持的动作类型**：
- `MoveAction` - 移动动画（带缓动函数插值）
- `UpdateHPAction` - 血条平滑过渡
- `FloatingTextAction` - 飘字效果
- `MeleeStrikeAction` - 近战打击特效
- `SpriteVFXAction` - Sprite 序列帧特效
- `ProceduralVFXAction` - 程序化特效（闪白、震屏、染色）

**缓动函数**：
- `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`
- `easeInCubic`, `easeOutCubic`, `easeInOutCubic`

### 验证

- [x] TypeScript 编译通过
- [x] 类型导出正确

---

## Phase 4: 重构 BattleReplayPlayer ✅

**目标**：将组件退化为纯渲染器

### 完成的文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `lib/battle-replay/hooks/useAnimationFrame.ts` | RAF 封装 | ✅ |
| `lib/battle-replay/hooks/useBattleDirector.ts` | 核心 Hook | ✅ |
| `lib/battle-replay/hooks/index.ts` | 模块导出 | ✅ |

### useAnimationFrame 实现

**两个 Hook**：

```typescript
// 基础帧循环
useAnimationFrame(callback: (deltaMs: number) => void, isRunning: boolean)

// 带速度控制的帧循环
useAnimationFrameWithSpeed(callback, isRunning, speed)
```

**设计特点**：
- 使用 `requestAnimationFrame` 驱动
- 自动处理组件卸载时的清理
- `callbackRef` 避免闭包问题
- 速度通过 `deltaMs * speed` 实现

### useBattleDirector 实现

**核心 Hook**：整合 VisualizerRegistry、ActionScheduler、RenderWorld

```typescript
const { state, controls } = useBattleDirector(replay, options);

// state: DirectorState
// - renderState: RenderState（供 React 组件消费）
// - isPlaying, isEnded, currentFrame, totalFrames, speed
// - currentEvents: GameEventBase[]

// controls: DirectorControls
// - play(), pause(), toggle(), reset(), setSpeed(speed)
```

**帧循环流程**：
1. 累积时间，每 100ms 推进一个逻辑帧
2. 查找该帧的事件，翻译为 VisualAction
3. 调度器 tick，更新动作进度
4. 应用动作到 RenderWorld
5. 输出 RenderState 供 React 渲染

### 待修改文件

| 文件 | 变更 | 状态 |
|------|------|------|
| `components/battle-replay/BattleReplayPlayer.tsx` | 简化为纯渲染 | ✅ 完成 |

**重构成果**：
- 组件从 700 行简化到 440 行
- 移除所有动画调度逻辑，改用 `useBattleDirector` Hook
- 保留事件历史、日志导出等 UI 功能

### 验证

- [x] TypeScript 编译通过
- [x] 类型导出正确
- [x] 组件重构完成

---

## Phase 5: 配置化 ✅

**目标**：动画参数从配置读取

### 完成的文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `lib/battle-replay/types/AnimationConfig.ts` | 配置类型 + 默认值 + 合并函数 | ✅ |
| `lib/battle-replay/config/index.ts` | 配置模块导出 | ✅ |

### 实现内容

**配置类型**（已在 Phase 1 定义）：
- `AnimationConfig` - 完整动画配置
- `MoveAnimationConfig` - 移动动画配置
- `DamageAnimationConfig` - 伤害动画配置
- `HealAnimationConfig` - 治疗动画配置
- `SkillAnimationConfig` - 技能动画配置

**配置功能**：
- `DEFAULT_ANIMATION_CONFIG` - 默认配置值
- `mergeAnimationConfig()` - 配置合并函数
- `extractAnimationConfig()` - 从回放数据提取配置

**使用方式**：
```typescript
// 使用默认配置
const { state, controls } = useBattleDirector(replay);

// 自定义配置
const { state, controls } = useBattleDirector(replay, {
  animationConfig: {
    move: { duration: 300 },  // 覆盖移动时长
  },
});
```

### 验证

- [x] TypeScript 编译通过
- [x] 配置导出正确

---

## 文件结构预览

```
inkmon-pokedex/
├── lib/
│   └── battle-replay/
│       ├── index.ts                 # ✅ 主入口
│       │
│       ├── types/                    # ✅ Phase 1
│       │   ├── VisualAction.ts       # ✅
│       │   ├── VisualizerContext.ts  # ✅
│       │   ├── AnimationConfig.ts    # ✅
│       │   ├── RenderState.ts        # ✅
│       │   └── index.ts              # ✅
│       │
│       ├── visualizers/              # ✅ Phase 2
│       │   ├── IVisualizer.ts        # ✅
│       │   ├── VisualizerRegistry.ts # ✅
│       │   ├── impl/
│       │   │   ├── MoveVisualizer.ts    # ✅
│       │   │   ├── DamageVisualizer.ts  # ✅
│       │   │   ├── SkillVisualizer.ts   # ✅
│       │   │   ├── HealVisualizer.ts    # ✅
│       │   │   └── index.ts             # ✅
│       │   └── index.ts              # ✅
│       │
│       ├── scheduler/                # ✅ Phase 3
│       │   ├── ActionScheduler.ts    # ✅
│       │   └── index.ts              # ✅
│       │
│       ├── world/                    # ✅ Phase 3
│       │   ├── RenderWorld.ts        # ✅
│       │   └── index.ts              # ✅
│       │
│       ├── hooks/                    # ✅ Phase 4
│       │   ├── useAnimationFrame.ts  # ✅
│       │   ├── useBattleDirector.ts  # ✅
│       │   └── index.ts              # ✅
│       │
│       └── config/                   # ✅ Phase 5
│           └── index.ts              # ✅
│
└── components/
    └── battle-replay/
        ├── BattleReplayPlayer.tsx    # ✅ Phase 4 重构完成
        └── ...
```

---

## 设计决策记录

### 2026-01-10: Phase 1 类型设计

1. **ActiveAction 结构**：将原始 action 作为嵌套对象保留，而非展开到 ActiveAction 中
   - 原因：保持类型清晰，便于类型守卫
   - 影响：访问原始属性需要 `activeAction.action.xxx`

2. **AnimationConfig 独立文件**：将配置类型从 VisualizerContext 中分离
   - 原因：配置类型会被多处引用，独立文件便于管理
   - 影响：VisualizerContext 需要 import AnimationConfig

3. **RenderState 使用 Map**：`interpolatedPositions` 使用 Map 而非 Record
   - 原因：与现有代码保持一致，Map 在频繁增删时性能更好
   - 影响：序列化时需要转换

4. **使用框架坐标类型**：`HexCoord` 和 `WorldCoord` 使用 `@lomo/hex-grid` 提供的类型
   - 原因：保持与框架一致，避免类型重复定义
   - 实现：`HexCoord = AxialCoord`，`WorldCoord = PixelCoord`（类型别名）
   - 影响：需要安装 `@lomo/hex-grid` 依赖

### 2026-01-10: Phase 3 调度器与渲染世界设计

1. **ActionScheduler 简化设计**：只支持 parallel 模式
   - 原因：Web 端动画简单，不需要复杂的阻塞/顺序调度
   - 影响：所有动作入队后立即并行执行

2. **RenderWorld 职责分离**：Scheduler 管理时序，RenderWorld 管理状态
   - 原因：单一职责原则，便于测试和维护
   - 影响：需要在帧循环中协调两者

3. **缓动函数内置**：在 RenderWorld 中实现常用缓动函数
   - 原因：避免外部依赖，保持模块独立
   - 实现：7 种常用缓动函数（linear, easeIn/Out/InOut Quad/Cubic）

4. **效果实例化策略**：飘字/特效在首次应用时创建实例
   - 原因：避免重复创建，通过 actionId 去重
   - 影响：cleanup 需要根据时间戳清理过期实例

5. **mapCenter 处理**：使用默认值而非从 HexMapConfig 读取
   - 原因：HexMapConfig 不包含 mapCenter 字段
   - 影响：坐标转换使用 {x: 0, y: 0} 作为地图中心

### 2026-01-10: Phase 4 Hook 设计

1. **useAnimationFrame 使用 RAF**：使用 `requestAnimationFrame` 而非 `setInterval`
   - 原因：RAF 与浏览器渲染同步，性能更好
   - 影响：帧间隔不固定，需要使用 deltaMs 计算

2. **callbackRef 模式**：使用 ref 保持 callback 引用最新
   - 原因：避免 useEffect 依赖 callback 导致频繁重启循环
   - 影响：callback 变化时无需重启 RAF

3. **速度控制通过 deltaMs 缩放**：`deltaMs * speed` 实现变速
   - 原因：简单直接，无需修改帧循环逻辑
   - 影响：高倍速时可能跳过中间状态

4. **逻辑帧累积器**：使用累积时间推进逻辑帧
   - 原因：解耦渲染帧率和逻辑帧率
   - 实现：每累积 100ms 推进一个逻辑帧
   - 影响：支持任意渲染帧率

5. **组件重构为可选**：保留现有组件，新 Hook 作为替代方案
   - 原因：渐进式迁移，降低风险
   - 影响：两套实现并存，后续可选择性迁移

### 2026-01-10: Phase 4 组件重构 + Phase 5 配置化

1. **组件重构完成**：`BattleReplayPlayer.tsx` 从 700 行简化到 440 行
   - 移除：动画调度逻辑、插值计算、事件处理
   - 保留：事件历史、日志导出、UI 渲染
   - 改用 `useBattleDirector` Hook 管理所有逻辑

2. **配置模块复用**：配置类型已在 Phase 1 定义，Phase 5 只需导出
   - `types/AnimationConfig.ts` 包含类型、默认值、合并函数
   - `config/index.ts` 重新导出 + 添加 `extractAnimationConfig()`

3. **事件历史本地维护**：Director 只提供当前帧事件，历史需组件维护
   - 原因：Director 专注于渲染状态，不关心历史
   - 影响：组件需要 useEffect 追踪事件变化

---

## 参考文档

- [设计文档](./BattleReplayFramework_Refactor.md)
- [现有实现](../inkmon-pokedex/components/battle-replay/)
