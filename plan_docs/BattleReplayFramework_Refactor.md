# Battle Replay Framework 重构设计

> 将紧耦合的原型代码重构为职责清晰的模块化架构

**范围**：仅服务于 `inkmon-pokedex` 项目，不考虑抽包复用

## 1. 问题分析

### 1.1 当前架构

```
GameEvent (逻辑层) ──────────────────────► React Component (渲染层)
                    直接耦合，无中间层
```

**现状**：`BattleReplayPlayer.tsx` 承担了过多职责：
- 事件解析（switch-case 判断事件类型）
- 动画调度（管理 activeAnimations）
- 插值计算（updateAnimationInterpolation）
- 效果触发（triggeredEffects）
- UI 渲染（JSX）

### 1.2 核心问题

| 问题 | 表现 | 影响 |
|------|------|------|
| **紧耦合** | 事件处理逻辑写死在组件里 | 无法复用到其他项目 |
| **扩展困难** | 新增事件类型需改 switch-case | 违反开闭原则 |
| **配置缺失** | 动画时长是硬编码常量 | 无法运行时调整 |
| **职责混乱** | 组件既是 Controller 又是 View | 难以测试和维护 |

## 2. 目标架构

### 2.1 设计约束：帧同步模式

本框架采用**帧同步**（Frame Sync）而非状态同步模式：

```
初始状态 → Event₁ → Event₂ → Event₃ → ... → 当前状态
           ↓        ↓        ↓
         动画₁    动画₂    动画₃
```

**核心特点**：
- 从初始状态开始，逐帧应用 GameEvent 更新表演层状态
- 不支持拖拽进度条/快进到任意帧
- 只支持：**播放**、**暂停**、**重置**（回到初始状态）

**优势**：
- 实现简单，无需维护状态快照
- 内存占用低，无需缓存中间状态
- 与网络游戏帧同步逻辑一致

### 2.2 简化设计决策

**不考虑 blocking 动作**：
- Web 端动画简单，主要是 transform 操作
- 所有动作并行执行，不阻塞事件处理
- 如果出现动画冲突问题，后续再考虑

**只支持 parallel 模式**：
- 移除 `sequential`、`wait_previous` 等复杂调度
- 所有 VisualAction 入队后立即并行执行
- 大幅简化 ActionScheduler 实现

### 2.3 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    GameEvent[] (逻辑层输出)                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Visualizer / Director (中间层)                  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ EventTranslator │  │ ActionScheduler │  │ EffectMgr   │ │
│  │ 事件→动作翻译   │  │ 动作队列调度    │  │ 特效生命周期│ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                              │                              │
│                              ▼                              │
│                    VisualCommand[]                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Renderer (纯渲染层)                          │
│                                                             │
│  - 给我位置，我画图                                          │
│  - 给我特效ID，我播片                                        │
│  - 不知道"为什么"，只知道"怎么做"                            │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 核心概念

#### 2.4.1 Visualizer (视觉转换器)

**职责**：将逻辑事件翻译为视觉动作

```typescript
interface IVisualizer<TEvent extends GameEventBase, TAction extends VisualAction> {
  /** 是否能处理该事件 */
  canHandle(event: GameEventBase): event is TEvent;

  /** 将事件翻译为视觉动作 */
  translate(event: TEvent, context: VisualizerContext): TAction[];
}

// 示例：伤害事件 Visualizer
class DamageVisualizer implements IVisualizer<DamageEvent, VisualAction> {
  canHandle(event: GameEventBase): event is DamageEvent {
    return isDamageEvent(event);
  }

  translate(event: DamageEvent, ctx: VisualizerContext): VisualAction[] {
    return [
      // 受击特效
      {
        type: 'SpawnVFX',
        vfxId: 'hit_impact',
        position: ctx.getActorPosition(event.targetActorId),
        duration: 300,
      },
      // 伤害飘字
      {
        type: 'FloatingText',
        text: `-${event.damage}`,
        color: event.isCritical ? 'yellow' : 'red',
        position: ctx.getActorPosition(event.targetActorId),
        duration: 800,
      },
      // 血条扣减（延迟执行，等特效播完）
      {
        type: 'UpdateHP',
        actorId: event.targetActorId,
        newHP: ctx.getActorHP(event.targetActorId) - event.damage,
        delay: 200,
      },
    ];
  }
}
```

#### 2.4.2 ActionScheduler (动作调度器)

**职责**：管理动作的生命周期和进度更新

```typescript
interface IActionScheduler {
  /** 添加动作（立即并行执行） */
  enqueue(actions: VisualAction[]): void;

  /** 每帧更新 */
  tick(deltaMs: number): SchedulerTickResult;

  /** 获取当前活跃动作 */
  getActiveActions(): ActiveAction[];

  /** 取消所有动作（用于重置） */
  cancelAll(): void;
}
```

> 注：简化版只支持 parallel 模式，所有动作入队后立即并行执行

#### 2.4.3 VisualAction (视觉动作)

**职责**：描述一个原子级的视觉效果

```typescript
type VisualAction =
  | MoveAction
  | SpawnVFXAction
  | FloatingTextAction
  | UpdateHPAction
  | PlaySoundAction
  | ShakeScreenAction;

interface MoveAction {
  type: 'Move';
  actorId: string;
  from: HexCoord;
  to: HexCoord;
  duration: number;
  easing: EasingFunction;
}

interface SpawnVFXAction {
  type: 'SpawnVFX';
  vfxId: string;
  position: WorldCoord;
  duration: number;
  delay?: number;
}

interface FloatingTextAction {
  type: 'FloatingText';
  text: string;
  color: string;
  position: WorldCoord;
  duration: number;
  delay?: number;
}
```

## 3. 实现计划

### Phase 1: 核心类型定义

**目标**：定义 VisualAction 类型系统 + VisualizerContext 接口

**文件**：
- `inkmon-pokedex/lib/battle-replay/types/VisualAction.ts`
- `inkmon-pokedex/lib/battle-replay/types/VisualizerContext.ts`

**内容**：

#### 1.1 VisualAction 类型

```typescript
/** 动作基础接口 */
interface VisualActionBase {
  type: string;
  actorId?: string;
  duration: number;
  delay?: number;
}

type VisualAction =
  | MoveAction
  | SpawnVFXAction
  | FloatingTextAction
  | UpdateHPAction
  | PlaySoundAction
  | ShakeScreenAction;

/** 运行时动作状态 */
interface ActiveAction extends VisualActionBase {
  id: string;           // 唯一标识
  elapsed: number;      // 已执行时间
  progress: number;     // 0~1 进度
}
```

#### 1.2 VisualizerContext 接口

```typescript
/**
 * Visualizer 的只读上下文
 *
 * 设计原则：
 * - 只读查询，不允许修改状态
 * - Visualizer 是纯函数，只返回声明式的 VisualAction
 * - 状态修改由 RenderWorld 统一执行
 */
interface VisualizerContext {
  // === 角色查询 ===
  getActorPosition(actorId: string): WorldCoord;
  getActorHP(actorId: string): number;
  getActorMaxHP(actorId: string): number;
  isActorAlive(actorId: string): boolean;

  // === 配置查询 ===
  getAnimationConfig(): AnimationConfig;

  // === 战场查询 ===
  hexToWorld(hex: HexCoord): WorldCoord;
}
```

**设计决策**：
- Context 只提供**只读**查询，不允许写入
- Visualizer 保持纯函数特性，便于测试
- 状态修改统一由 RenderWorld 处理（见 Phase 3）

### Phase 2: 实现 Visualizer 注册机制

**目标**：可插拔的事件→动作转换器，支持多 Visualizer 协作

**文件**：
- `inkmon-pokedex/lib/battle-replay/visualizers/IVisualizer.ts`
- `inkmon-pokedex/lib/battle-replay/visualizers/VisualizerRegistry.ts`
- `inkmon-pokedex/lib/battle-replay/visualizers/impl/DamageVisualizer.ts`
- `inkmon-pokedex/lib/battle-replay/visualizers/impl/MoveVisualizer.ts`

**设计**：

```typescript
class VisualizerRegistry {
  private visualizers: IVisualizer[] = [];

  register(visualizer: IVisualizer): void {
    this.visualizers.push(visualizer);
  }

  /**
   * 翻译事件为视觉动作
   *
   * 设计决策：收集所有匹配的 Visualizer 结果
   * 原因：一个事件可能需要多个 Visualizer 协作
   * 例如：DamageEvent 同时触发 DamageVisualizer（飘字）+ ScreenShakeVisualizer（震屏）
   */
  translate(event: GameEventBase, ctx: VisualizerContext): VisualAction[] {
    const actions = this.visualizers
      .filter(v => v.canHandle(event))
      .flatMap(v => v.translate(event, ctx));

    if (actions.length === 0) {
      // 开发模式下警告未处理的事件
      console.warn(`[VisualizerRegistry] Unhandled event: ${event.type}`);
    }

    return actions;
  }
}
```

### Phase 3: 实现 ActionScheduler + RenderWorld

**目标**：动作生命周期管理、渲染状态管理

**文件**：
- `inkmon-pokedex/lib/battle-replay/scheduler/ActionScheduler.ts`
- `inkmon-pokedex/lib/battle-replay/world/RenderWorld.ts`

#### 3.1 ActionScheduler（简化版）

```typescript
interface IActionScheduler {
  /** 添加动作（立即并行执行） */
  enqueue(actions: VisualAction[]): void;

  /** 每帧更新 */
  tick(deltaMs: number): SchedulerTickResult;

  /** 获取当前活跃动作 */
  getActiveActions(): ActiveAction[];

  /** 取消所有动作（用于重置） */
  cancelAll(): void;
}

interface SchedulerTickResult {
  /** 当前活跃的动作（带进度） */
  activeActions: ActiveAction[];
  /** 本帧完成的动作 */
  completedThisTick: VisualAction[];
  /** 是否有变化（用于优化渲染） */
  hasChanges: boolean;
}
```

#### 3.2 RenderWorld（渲染状态管理）

```typescript
/**
 * 渲染世界状态
 *
 * 职责分离：
 * - Scheduler 管理"时序"（什么时候执行）
 * - RenderWorld 管理"状态"（当前值是什么）
 */
class RenderWorld {
  private actors: Map<string, ActorRenderState> = new Map();
  private effects: Effect[] = [];
  private floatingTexts: FloatingText[] = [];

  constructor(initialState: BattleInitialState) {
    // 从初始状态构建渲染状态
    for (const unit of initialState.units) {
      this.actors.set(unit.id, {
        id: unit.id,
        position: unit.position,
        visualHP: unit.hp,  // 注意：visualHP 用于动画插值
        maxHP: unit.maxHP,
        // ...
      });
    }
  }

  /** 应用动作到状态 */
  applyAction(action: ActiveAction): void {
    switch (action.type) {
      case 'Move':
        this.updateActorPosition(action.actorId, action.currentPos);
        break;
      case 'UpdateHP':
        this.updateActorVisualHP(action.actorId, action.targetHP, action.progress);
        break;
      case 'SpawnVFX':
        this.effects.push({ ...action, startTime: Date.now() });
        break;
      case 'FloatingText':
        this.floatingTexts.push({ ...action, startTime: Date.now() });
        break;
    }
  }

  /** 清理过期效果 */
  cleanup(now: number): void {
    this.effects = this.effects.filter(e => now - e.startTime < e.duration);
    this.floatingTexts = this.floatingTexts.filter(t => now - t.startTime < t.duration);
  }

  /** 获取当前渲染状态（供 React 组件消费） */
  getState(): RenderState {
    return {
      actors: Array.from(this.actors.values()),
      effects: this.effects,
      floatingTexts: this.floatingTexts,
    };
  }

  /** 创建 VisualizerContext（只读视图） */
  asContext(): VisualizerContext {
    return {
      getActorPosition: (id) => this.actors.get(id)?.position ?? { x: 0, y: 0 },
      getActorHP: (id) => this.actors.get(id)?.visualHP ?? 0,
      getActorMaxHP: (id) => this.actors.get(id)?.maxHP ?? 0,
      isActorAlive: (id) => (this.actors.get(id)?.visualHP ?? 0) > 0,
      getAnimationConfig: () => this.config,
      hexToWorld: (hex) => hexToWorldCoord(hex, this.gridConfig),
    };
  }

  /** 重置到指定状态（用于 Seek） */
  resetTo(state: BattleInitialState): void {
    this.actors.clear();
    this.effects = [];
    this.floatingTexts = [];
    // 重新初始化...
  }
}
```

**Visual State vs Logic State**：
- `LogicState`：逻辑层的真值（HP=50）
- `VisualState`：渲染层的呈现值（visualHP 正在从 100 插值到 50）
- UI 组件只读取 `VisualState`，不直接访问逻辑数据

#### 3.3 核心调度逻辑（简化版）

```typescript
class ActionScheduler implements IActionScheduler {
  private active: Map<string, ActiveAction> = new Map();
  private nextId = 0;

  enqueue(actions: VisualAction[]): void {
    // 所有动作立即并行执行
    for (const action of actions) {
      const id = `action_${this.nextId++}`;
      this.active.set(id, {
        ...action,
        id,
        elapsed: 0,
        progress: 0,
      });
    }
  }

  tick(deltaMs: number): SchedulerTickResult {
    const completedThisTick: VisualAction[] = [];

    // 更新所有活跃动作的进度
    for (const [id, action] of this.active) {
      action.elapsed += deltaMs;
      action.progress = Math.min(1, action.elapsed / action.duration);

      if (action.elapsed >= action.duration) {
        completedThisTick.push(action);
        this.active.delete(id);
      }
    }

    return {
      activeActions: Array.from(this.active.values()),
      completedThisTick,
      hasChanges: completedThisTick.length > 0 || this.active.size > 0,
    };
  }

  getActiveActions(): ActiveAction[] {
    return Array.from(this.active.values());
  }

  cancelAll(): void {
    this.active.clear();
  }
}
```

### Phase 4: 重构 BattleReplayPlayer

**目标**：将其退化为纯渲染器，实现 React 集成

**变更**：

Before:
```typescript
// BattleReplayPlayer.tsx (500+ 行)
function BattleReplayPlayer({ replay }) {
  // 状态管理
  // 事件处理
  // 动画调度
  // 插值计算
  // UI 渲染
}
```

After:
```typescript
// BattleReplayPlayer.tsx (100 行)
function BattleReplayPlayer({ replay }) {
  const director = useBattleDirector(replay);
  const { actors, effects, floatingTexts } = director.state;

  return (
    <div>
      <BattleStage actors={actors} effects={effects} />
      <FloatingTextLayer texts={floatingTexts} />
      <ControlPanel director={director} />
    </div>
  );
}
```

#### 4.1 useBattleDirector Hook

```typescript
function useBattleDirector(replay: IBattleRecord) {
  // === 初始化（只执行一次） ===
  const registry = useMemo(() => createDefaultRegistry(), []);
  const scheduler = useMemo(() => new ActionScheduler(), []);
  const world = useMemo(() => new RenderWorld(replay.initialState), [replay]);

  // 渲染状态
  const [renderState, setRenderState] = useState<RenderState>(world.getState());
  const [isPaused, setIsPaused] = useState(false);

  // === 帧循环 ===
  useAnimationFrame((deltaMs) => {
    if (isPaused) return;

    // 1. 推进逻辑帧，获取事件
    const events = replay.advanceFrame();

    // 2. 翻译事件为动作
    for (const event of events) {
      const actions = registry.translate(event, world.asContext());
      scheduler.enqueue(actions);
    }

    // 3. 调度器 tick
    const result = scheduler.tick(deltaMs);

    // 4. 应用到世界状态
    if (result.hasChanges) {
      for (const action of result.activeActions) {
        world.applyAction(action);
      }
      world.cleanup(Date.now());
      setRenderState(world.getState());
    }
  });

  // === 控制接口 ===
  const controls = useMemo(() => ({
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false),
    reset: () => {
      scheduler.cancelAll();
      world.resetTo(replay.initialState);
      replay.reset();
      setRenderState(world.getState());
    },
  }), [scheduler, world, replay]);

  return { state: renderState, controls, isPaused };
}
```

#### 4.2 性能优化

```typescript
// 1. 批量更新：每帧只触发一次 setState
// 2. 使用 React.memo 优化子组件
const BattleStage = React.memo(({ actors, effects }) => {
  // ...
});

// 3. 使用 useMemo 缓存不变的数据
const actorMap = useMemo(
  () => new Map(actors.map(a => [a.id, a])),
  [actors]
);
```

### Phase 5: 配置化

**目标**：动画参数从配置读取

**文件**：
- `inkmon-pokedex/lib/battle-replay/config/AnimationConfig.ts`

**示例**：
```typescript
const defaultConfig: AnimationConfig = {
  move: {
    duration: 500,
    easing: 'easeInOutQuad',
  },
  damage: {
    hitVfxDuration: 300,
    floatingTextDuration: 800,
    hpBarDelay: 200,
  },
  skill: {
    basicAttack: {
      duration: 1000,
      hitFrame: 500,
    },
  },
};

// 可从 replay.configs.animation 覆盖
const config = mergeConfig(defaultConfig, replay.configs?.animation);
```

## 4. Web 端动画实现方案

### 4.1 混合渲染架构 (Hybrid Rendering)

采用 **Canvas + DOM 混合架构**，这是 React 游戏开发中性能与开发效率的最佳平衡点。

```
┌─────────────────────────────────────────────────────────────┐
│                      BattleStage                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Canvas Layer (底层)                       │  │
│  │  高频重绘内容：                                         │  │
│  │  - 六边形地图背景                                       │  │
│  │  - 单位精灵 (Sprite)                                   │  │
│  │  - 技能粒子特效                                        │  │
│  │  - 受击闪白/染色效果                                    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              DOM Layer (顶层)                          │  │
│  │  UI、文本和交互：                                       │  │
│  │  - 伤害飘字 (Floating Text)                            │  │
│  │  - 血条 (HP Bar)                                       │  │
│  │  - Buff 图标                                           │  │
│  │  - Tooltip / 鼠标交互                                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**分层理由**：

| 层级 | 内容 | 理由 |
|------|------|------|
| **Canvas** | 地图、单位、粒子 | 对成百上千个物体渲染性能远超 DOM，易于实现像素级操作 |
| **DOM** | 文字、UI、交互 | CSS 动画处理文字简单清晰，React 组件化管理 UI 状态更高效 |

### 4.2 动画循环 (The Animation Loop)

使用 `requestAnimationFrame` 驱动独立的渲染循环，实现逻辑帧与渲染帧分离。

```
逻辑帧 (100ms/帧)     ●─────────────●─────────────●
                      │             │             │
渲染帧 (16.6ms/帧)    ●──●──●──●──●──●──●──●──●──●──●
                      ↑  ↑  ↑  ↑  ↑  ↑
                      插值计算，平滑过渡
```

**插值 (Interpolation)**：
- 逻辑帧是跳变的（每 100ms 一次事件处理）
- 渲染帧是平滑的（60fps）
- 渲染循环计算当前处于两个逻辑帧之间的位置（alpha 值）
- 平滑过渡单位的移动，消除卡顿感

```typescript
// 渲染帧插值示例
const alpha = (currentTime - lastLogicFrameTime) / LOGIC_FRAME_INTERVAL;
const smoothPosition = {
  q: lerp(prevPos.q, nextPos.q, alpha),
  r: lerp(prevPos.r, nextPos.r, alpha),
};
```

### 4.3 特效系统 (VFX System)

将特效分为三类处理：

| 类型 | 渲染层 | 说明 | 示例 |
|------|--------|------|------|
| **Sprite VFX** | Canvas | 播放序列帧图片 | 爆炸、刀光、技能特效 |
| **Procedural VFX** | Canvas/CSS | 代码生成的程序化效果 | 震屏、受击闪白、位移 |
| **UI VFX** | DOM + CSS | 纯 CSS 动画 | 伤害飘字、Buff 图标动画 |

#### Sprite VFX (Canvas)

```typescript
interface SpriteAnimation {
  spriteSheet: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
}

// 在 Canvas 上绘制当前帧
function drawSpriteFrame(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteAnimation,
  frameIndex: number,
  x: number,
  y: number
) {
  const sx = (frameIndex % sprite.frameCount) * sprite.frameWidth;
  ctx.drawImage(
    sprite.spriteSheet,
    sx, 0, sprite.frameWidth, sprite.frameHeight,
    x - sprite.frameWidth / 2,
    y - sprite.frameHeight / 2,
    sprite.frameWidth, sprite.frameHeight
  );
}
```

#### Procedural VFX (Canvas)

```typescript
// 受击闪白效果
function applyHitFlash(ctx: CanvasRenderingContext2D, progress: number) {
  if (progress < 0.5) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress * 2})`;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
}

// 震屏效果
function getShakeOffset(progress: number, intensity: number): { x: number; y: number } {
  const decay = 1 - progress;
  return {
    x: Math.sin(progress * Math.PI * 8) * intensity * decay,
    y: Math.cos(progress * Math.PI * 6) * intensity * decay * 0.5,
  };
}
```

#### UI VFX (CSS Animation)

```css
/* 伤害飘字 - 使用 transform3d 开启硬件加速 */
.floatingText {
  position: absolute;
  font-weight: bold;
  text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
  animation: floatUp 1s ease-out forwards;
  pointer-events: none;
  will-change: transform, opacity;  /* 提示浏览器优化 */
}

@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translate3d(-50%, 0, 0) scale(1);
  }
  50% {
    opacity: 1;
    transform: translate3d(-50%, -15px, 0) scale(1.15);
  }
  100% {
    opacity: 0;
    transform: translate3d(-50%, -30px, 0) scale(0.9);
  }
}

/* 暴击飘字 - 更强烈的动画 */
.floatingText.critical {
  color: #ffcc00;
  animation: criticalFloat 1.2s ease-out forwards;
}

@keyframes criticalFloat {
  0% {
    opacity: 1;
    transform: translate3d(-50%, 0, 0) scale(1.5);
  }
  20% {
    transform: translate3d(-50%, -10px, 0) scale(1.8);
  }
  100% {
    opacity: 0;
    transform: translate3d(-50%, -40px, 0) scale(1);
  }
}
```

### 4.4 资源预加载

在回放开始前预加载所需资源，防止首次播放时出现闪烁或白块。

```typescript
interface AssetManifest {
  sprites: Record<string, string>;  // vfxId -> spriteSheet URL
  sounds?: Record<string, string>;  // soundId -> audio URL
}

class AssetLoader {
  private cache = new Map<string, HTMLImageElement>();
  private loading = new Map<string, Promise<HTMLImageElement>>();

  async preload(manifest: AssetManifest): Promise<void> {
    const promises = Object.entries(manifest.sprites).map(
      ([id, url]) => this.loadImage(id, url)
    );
    await Promise.all(promises);
  }

  private loadImage(id: string, url: string): Promise<HTMLImageElement> {
    if (this.cache.has(id)) {
      return Promise.resolve(this.cache.get(id)!);
    }

    if (this.loading.has(id)) {
      return this.loading.get(id)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(id, img);
        this.loading.delete(id);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });

    this.loading.set(id, promise);
    return promise;
  }

  getSprite(id: string): HTMLImageElement | undefined {
    return this.cache.get(id);
  }
}

// 使用示例
const assetLoader = new AssetLoader();
await assetLoader.preload({
  sprites: {
    'hit_impact': '/vfx/hit_impact.png',
    'slash': '/vfx/slash.png',
  }
});
```

### 4.5 VisualAction 类型扩展

根据特效系统，扩展 VisualAction 类型：

```typescript
type VisualAction =
  // 基础动作
  | MoveAction
  | UpdateHPAction
  // UI 特效 (DOM)
  | FloatingTextAction
  // Canvas 特效
  | SpriteVFXAction
  | ProceduralVFXAction;

interface SpriteVFXAction {
  type: 'SpriteVFX';
  vfxId: string;           // 对应预加载的 sprite ID
  position: WorldCoord;
  duration: number;
  scale?: number;
  rotation?: number;
}

interface ProceduralVFXAction {
  type: 'ProceduralVFX';
  effect: 'hitFlash' | 'shake' | 'colorTint';
  actorId?: string;        // hitFlash/colorTint 需要
  intensity?: number;      // shake 强度
  color?: string;          // colorTint 颜色
  duration: number;
}

interface FloatingTextAction {
  type: 'FloatingText';
  text: string;
  color: string;
  position: WorldCoord;
  duration: number;
  style?: 'normal' | 'critical' | 'heal';
}
```

### 4.6 RenderWorld 状态结构

```typescript
interface RenderState {
  // Canvas 层数据
  actors: Map<string, ActorRenderState>;
  interpolatedPositions: Map<string, HexCoord>;
  activeSpriteVFX: SpriteVFXInstance[];
  proceduralEffects: ProceduralEffectInstance[];

  // DOM 层数据
  floatingTexts: FloatingTextInstance[];

  // 全局效果
  screenShake?: { offsetX: number; offsetY: number };
}

interface ActorRenderState {
  id: string;
  position: HexCoord;
  visualHP: number;
  maxHP: number;
  team: string;
  // 单位级效果
  flashProgress?: number;  // 受击闪白进度
  tintColor?: string;      // 染色
}
```

### 4.7 帧循环与渲染流程

```typescript
function useAnimationFrame(callback: (deltaMs: number) => void) {
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number>();

  useEffect(() => {
    const loop = (time: number) => {
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;
      callback(delta);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [callback]);
}
```

**完整渲染流程**：

```
requestAnimationFrame (60fps)
    │
    ▼
useBattleDirector.tick(deltaMs)
    │
    ├─► 1. 推进逻辑帧（如果到达时间点）
    │       └─► 获取 GameEvent[]
    │       └─► 翻译为 VisualAction[]
    │       └─► 入队 scheduler
    │
    ├─► 2. scheduler.tick(deltaMs)
    │       └─► 更新所有动作进度
    │       └─► 返回 activeActions + completedActions
    │
    ├─► 3. world.applyActions(activeActions)
    │       ├─► 更新 interpolatedPositions
    │       ├─► 更新 actor.visualHP / flashProgress
    │       ├─► 管理 spriteVFX / proceduralEffects
    │       └─► 添加 floatingTexts
    │
    ├─► 4. world.cleanup()
    │       └─► 移除过期的 VFX / floatingTexts
    │
    └─► 5. setRenderState(world.getState())
            │
            ▼
        React 渲染
            │
            ├─► Canvas 重绘
            │     ├─► 清空画布
            │     ├─► 应用 screenShake 偏移
            │     ├─► 绘制六边形网格
            │     ├─► 绘制单位（含 flashProgress 效果）
            │     └─► 绘制 Sprite VFX
            │
            └─► DOM 渲染
                  └─► FloatingText 组件（CSS 动画自动播放）
```

### 4.8 当前功能迁移映射

以下是当前 `battle-replay` 组件中已有功能到新设计的映射：

#### 移动动画

| 当前实现 | 新设计 |
|----------|--------|
| `MoveStartEvent` | `MoveStartEvent` |
| `processEventsForAnimation()` | `MoveVisualizer.translate()` |
| `MoveAnimationData` | `MoveAction` |
| `activeAnimations.set()` | `scheduler.enqueue()` |
| `updateAnimationInterpolation()` | `scheduler.tick()` + `world.applyAction()` |
| `interpolatedPositions` | `renderState.interpolatedPositions` |

```typescript
// MoveVisualizer 实现
class MoveVisualizer implements IVisualizer<MoveStartEvent> {
  canHandle(event: GameEventBase): event is MoveStartEvent {
    return isMoveStartEvent(event);
  }

  translate(event: MoveStartEvent, ctx: VisualizerContext): VisualAction[] {
    return [{
      type: 'Move',
      actorId: event.actorId,
      from: event.fromHex,
      to: event.toHex,
      duration: ctx.getAnimationConfig().move.duration,  // 500ms
      easing: 'easeInOutQuad',
    }];
  }
}
```

#### 飘字动画

| 当前实现 | 新设计 |
|----------|--------|
| `SkillAnimationData.pendingEffects` | `FloatingTextAction` |
| `tags.hit` 触发检查 | `action.delay` |
| `triggeredEffects` state | `renderState.floatingTexts` |
| `FloatingText` DOM 元素 | 相同 |

```typescript
// DamageVisualizer 实现
class DamageVisualizer implements IVisualizer<DamageEvent> {
  canHandle(event: GameEventBase): event is DamageEvent {
    return isDamageEvent(event);
  }

  translate(event: DamageEvent, ctx: VisualizerContext): VisualAction[] {
    const position = ctx.getActorPosition(event.targetActorId);
    return [{
      type: 'FloatingText',
      text: `-${event.damage}`,
      color: event.isCritical ? '#ffcc00' : '#ff4444',
      position,
      duration: 1000,
      delay: 0,  // 或配合技能动画的 hitFrame 延迟
      style: event.isCritical ? 'critical' : 'normal',
    }];
  }
}
```

#### 血条动画（新增）

当前实现中血条是**瞬间跳变**的，新设计支持**平滑过渡**：

```typescript
// HPVisualizer 实现
class HPVisualizer implements IVisualizer<AttributeChangedEvent> {
  canHandle(event: GameEventBase): event is AttributeChangedEvent {
    return isAttributeChangedEvent(event) && event.attribute === 'hp';
  }

  translate(event: AttributeChangedEvent, ctx: VisualizerContext): VisualAction[] {
    return [{
      type: 'UpdateHP',
      actorId: event.actorId,
      fromHP: event.oldValue,
      toHP: event.newValue,
      duration: ctx.getAnimationConfig().hp.duration,  // 300ms
    }];
  }
}
```

**渲染变化**：

```typescript
// 当前：直接使用 actor.hp
const hpPercent = actor.hp / actor.maxHp;

// 新设计：使用 visualHP（动画插值后的值）
const hpPercent = actor.visualHP / actor.maxHP;
```

#### 技能动画 Tag 系统

当前的 `SkillAnimationData.tags` 机制可以通过 `delay` 字段实现：

```typescript
// 当前实现
const skillAnim: SkillAnimationData = {
  type: 'skill',
  tags: { hit: 500 },  // 500ms 时触发 hit
  pendingEffects: [{ type: 'damage', triggerTag: 'hit', ... }],
};

// 新设计：直接在 Visualizer 中设置 delay
class SkillVisualizer implements IVisualizer<SkillUseEvent> {
  translate(event: SkillUseEvent, ctx: VisualizerContext): VisualAction[] {
    const config = ctx.getAnimationConfig().skill.basicAttack;
    return [
      // 技能动画本身（如果有 Sprite）
      {
        type: 'SpriteVFX',
        vfxId: 'slash',
        position: ctx.getActorPosition(event.targetActorId),
        duration: config.duration,
      },
      // 伤害飘字延迟到 hitFrame
      // 注意：实际伤害飘字由 DamageVisualizer 处理
      // 这里只是示例如何使用 delay
    ];
  }
}
```

#### 迁移对照表

| 功能 | 当前文件 | 新文件 |
|------|----------|--------|
| 动画类型定义 | `types.ts` | `lib/battle-replay/types/VisualAction.ts` |
| 事件→动画转换 | `BattleReplayPlayer.tsx:processEventsForAnimation` | `lib/battle-replay/visualizers/impl/*.ts` |
| 动画进度更新 | `BattleReplayPlayer.tsx:updateAnimationInterpolation` | `lib/battle-replay/scheduler/ActionScheduler.ts` |
| 渲染状态管理 | `BattleReplayPlayer.tsx` state | `lib/battle-replay/world/RenderWorld.ts` |
| 帧循环 | `BattleReplayPlayer.tsx:renderTick` | `lib/battle-replay/hooks/useBattleDirector.ts` |
| 飘字渲染 | `BattleStage.tsx:FloatingText` | 保持不变 |
| Canvas 绘制 | `BattleStage.tsx` | 保持不变，读取新的 `renderState` |

## 5. 文件结构

```
inkmon-pokedex/
├── lib/
│   └── battle-replay/
│       ├── types/
│       │   ├── VisualAction.ts       # 视觉动作类型
│       │   ├── VisualizerContext.ts  # 上下文接口
│       │   ├── RenderState.ts        # 渲染状态类型
│       │   └── index.ts
│       │
│       ├── visualizers/
│       │   ├── IVisualizer.ts        # 接口定义
│       │   ├── VisualizerRegistry.ts # 注册表
│       │   ├── impl/
│       │   │   ├── MoveVisualizer.ts
│       │   │   ├── DamageVisualizer.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       │
│       ├── scheduler/
│       │   ├── ActionScheduler.ts    # 实现
│       │   └── index.ts
│       │
│       ├── world/
│       │   ├── RenderWorld.ts        # 渲染状态管理
│       │   └── index.ts
│       │
│       ├── config/
│       │   ├── AnimationConfig.ts    # 配置类型和默认值
│       │   └── index.ts
│       │
│       ├── hooks/
│       │   ├── useBattleDirector.ts  # 核心 Hook
│       │   ├── useAnimationFrame.ts  # RAF 封装
│       │   └── index.ts
│       │
│       └── index.ts
│
└── components/
    └── battle-replay/
        ├── BattleReplayPlayer.tsx    # 简化为纯渲染
        ├── BattleStage.tsx
        └── ...
```

## 6. 迁移策略

### 6.1 渐进式迁移

1. **Phase 1-2**：在 `lib/battle-replay/` 实现类型和 Visualizer 系统
2. **Phase 3**：实现 ActionScheduler + RenderWorld
3. **Phase 4**：实现 useBattleDirector，重构 BattleReplayPlayer
4. **Phase 5**：添加配置化支持，删除旧代码

### 6.2 兼容性

- 保持 `IBattleRecord` 格式不变
- 保持现有的播放/暂停/重置功能

## 7. 收益分析

| 维度 | Before | After |
|------|--------|-------|
| **可扩展性** | 改 switch-case | 注册新 Visualizer |
| **可测试性** | 需要渲染环境 | 纯逻辑可单测 |
| **可配置性** | 硬编码常量 | 配置文件驱动 |
| **代码量** | 500+ 行组件 | 100 行组件 + 模块化逻辑 |

## 8. 风险与对策

| 风险 | 对策 |
|------|------|
| 过度设计 | 先实现核心功能，按需扩展 |
| 性能下降 | 保持简单数据结构，避免深拷贝 |
| 学习成本 | 提供完整示例和文档 |

## 9. 参考

- 当前实现：`inkmon-pokedex/components/battle-replay/`
- 逻辑层框架：`packages/logic-game-framework/`
- 事件类型：`packages/inkmon-battle/src/events/ReplayEvents.ts`
