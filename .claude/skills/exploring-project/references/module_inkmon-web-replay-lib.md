# Inkmon Web Replay Lib Details

<!-- region Generated Config Start -->
```yaml
description: "InkMon 战斗回放可视化库"
tracked_paths:
  - "inkmon-pokedex/lib/battle-replay/"
  - "inkmon-pokedex/components/battle-replay/"
last_updated: "2026-01-11"
```
<!-- region Generated Config End -->

<!-- SECTION: core-concepts -->
<!-- TRACKED_FILES: types/*.ts, visualizers/IVisualizer.ts, scheduler/ActionScheduler.ts, world/RenderWorld.ts -->
## 1. Core Concepts

| Concept | Responsibility |
|---------|----------------|
| `VisualAction` | 原子级视觉效果描述（声明式），由 Visualizer 从 GameEvent 翻译而来 |
| `IVisualizer` | 事件翻译器接口，将逻辑层 GameEvent 转换为表现层 VisualAction |
| `VisualizerRegistry` | Visualizer 注册表，管理事件分发，支持多 Visualizer 协作 |
| `ActionScheduler` | 动作调度器，管理 VisualAction 的生命周期和进度更新 |
| `RenderWorld` | 渲染状态管理器，将 VisualAction 应用到状态上 |
| `useBattleDirector` | 核心调度 Hook，整合所有子系统提供完整回放控制 |

### 1.1 数据流

```
GameEvent (逻辑层)
    ↓ VisualizerRegistry.translate()
VisualAction[] (声明式动作)
    ↓ ActionScheduler.enqueue()
ActiveAction[] (带进度的运行时状态)
    ↓ RenderWorld.applyActions()
RenderState (React 可消费的渲染状态)
```

### 1.2 VisualAction 类型

| Action Type | 用途 |
|-------------|------|
| `MoveAction` | 角色移动动画（六边形坐标插值） |
| `UpdateHPAction` | 血条平滑过渡 |
| `FloatingTextAction` | 伤害/治疗飘字 |
| `MeleeStrikeAction` | 近战打击特效（斩击/突刺/冲击） |
| `SpriteVFXAction` | 序列帧动画特效 |
| `ProceduralVFXAction` | 程序化特效（震屏/闪白/染色） |
<!-- END_SECTION -->

<!-- SECTION: design-decisions -->
<!-- TRACKED_FILES: -->
## 2. Design Decisions

### 2.1 逻辑-表现分离
**Decision**: 采用 Visualizer 模式将逻辑事件翻译为视觉动作
**Rationale**:
- 逻辑层（GameEvent）与表现层（VisualAction）完全解耦
- Visualizer 是纯函数，无副作用，易于测试
- 支持同一事件触发多个视觉效果（如伤害事件同时触发飘字+震屏）

### 2.2 职责分离：时序 vs 状态
**Decision**: ActionScheduler 管理"时序"，RenderWorld 管理"状态"
**Rationale**:
- ActionScheduler 只关心动作的生命周期和进度计算
- RenderWorld 只关心如何将动作应用到渲染状态
- 清晰的职责边界使代码更易维护

### 2.3 声明式 VisualAction
**Decision**: VisualAction 描述"做什么"而非"怎么做"
**Rationale**:
- 声明式设计使动作可序列化、可调试
- 渲染层可以自由选择实现方式（CSS/Canvas/WebGL）
- 支持动作的延迟执行（delay 字段）

### 2.4 并行动作调度
**Decision**: 所有动作入队后立即并行执行
**Rationale**:
- 简化调度逻辑，无需复杂的依赖管理
- 通过 delay 字段实现动作间的时序控制
- 适合战斗回放场景的快节奏表现
<!-- END_SECTION -->

<!-- SECTION: api-interfaces -->
<!-- TRACKED_FILES: index.ts, types/*.ts, visualizers/IVisualizer.ts, hooks/useBattleDirector.ts -->
## 3. Core Interfaces

### 3.1 IVisualizer 接口

```typescript
interface IVisualizer<TEvent extends GameEventBase = GameEventBase> {
  readonly name: string;
  canHandle(event: GameEventBase): event is TEvent;
  translate(event: TEvent, context: VisualizerContext): VisualAction[];
}
```

### 3.2 VisualizerContext 接口

```typescript
interface VisualizerContext {
  getActorPosition(actorId: string): WorldCoord;
  getActorHP(actorId: string): number;
  getActorMaxHP(actorId: string): number;
  isActorAlive(actorId: string): boolean;
  getActorHexPosition(actorId: string): HexCoord;
  getActorTeam(actorId: string): 'A' | 'B';
  getAllActorIds(): string[];
  getAnimationConfig(): AnimationConfig;
  hexToWorld(hex: HexCoord): WorldCoord;
}
```

### 3.3 IActionScheduler 接口

```typescript
interface IActionScheduler {
  enqueue(actions: VisualAction[]): void;
  tick(deltaMs: number): SchedulerTickResult;
  getActiveActions(): ActiveAction[];
  cancelAll(): void;
  getActionCount(): number;
}
```

### 3.4 useBattleDirector Hook

```typescript
function useBattleDirector(
  replay: IBattleRecord,
  options?: UseBattleDirectorOptions
): UseBattleDirectorResult;

interface UseBattleDirectorResult {
  state: DirectorState;
  controls: DirectorControls;
}

interface DirectorControls {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
}
```

### 3.5 Public API

| API | Description |
|-----|-------------|
| `useBattleDirector(replay, options)` | 核心 Hook，提供完整回放控制 |
| `createVisualizerRegistry()` | 创建 Visualizer 注册表 |
| `createDefaultRegistry()` | 创建带默认 Visualizer 的注册表 |
| `createActionScheduler()` | 创建动作调度器 |
| `createRenderWorld(replay, config)` | 创建渲染状态管理器 |
| `createVisualizer(name, canHandle, translate)` | 快速创建简单 Visualizer |
<!-- END_SECTION -->

<!-- SECTION: formulas-algorithms -->
<!-- TRACKED_FILES: world/RenderWorld.ts -->
## 4. Formulas / Core Algorithms

### 4.1 缓动函数

```typescript
const easingFunctions = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
};
```

### 4.2 动作进度计算

```typescript
// ActionScheduler.tick()
const effectiveElapsed = elapsed - delay;
const progress = Math.min(1, effectiveElapsed / duration);
```

### 4.3 震屏效果

```typescript
// 衰减震动
const decay = 1 - progress;
screenShake = {
  offsetX: Math.sin(progress * Math.PI * 8) * intensity * decay,
  offsetY: Math.cos(progress * Math.PI * 6) * intensity * decay * 0.5,
};
```

### 4.4 逻辑帧推进

```typescript
// useBattleDirector
const LOGIC_TICK_MS = 100; // 每 100ms 推进一个逻辑帧
while (accumulator >= LOGIC_TICK_MS) {
  accumulator -= LOGIC_TICK_MS;
  currentFrame++;
}
```
<!-- END_SECTION -->

## 5. Usage Examples

```typescript
// 基本使用
import { useBattleDirector } from '@/lib/battle-replay';

function BattleReplayPlayer({ replay }) {
  const { state, controls } = useBattleDirector(replay, {
    initialSpeed: 1,
    autoPlay: false,
  });

  return (
    <div>
      <BattleStage renderState={state.renderState} />
      <button onClick={controls.toggle}>
        {state.isPlaying ? 'Pause' : 'Play'}
      </button>
      <span>Frame: {state.currentFrame} / {state.totalFrames}</span>
    </div>
  );
}
```

```typescript
// 自定义 Visualizer
import { createVisualizer, createVisualizerRegistry } from '@/lib/battle-replay';

const myVisualizer = createVisualizer(
  'MyVisualizer',
  (event) => event.kind === 'myEvent',
  (event, ctx) => [{
    type: 'FloatingText',
    text: 'Custom!',
    position: ctx.getActorPosition(event.actorId),
    duration: 500,
    color: '#ff0000',
    style: 'normal',
  }]
);

const registry = createVisualizerRegistry().register(myVisualizer);
```

## 6. Extension Guide

How to extend this module:

1. **添加新 Visualizer**:
   - 实现 `IVisualizer` 接口
   - 在 `visualizers/impl/` 创建文件
   - 在 `createDefaultRegistry()` 中注册

2. **添加新 VisualAction 类型**:
   - 在 `types/VisualAction.ts` 定义新类型
   - 在 `RenderWorld.applyAction()` 添加处理逻辑
   - 添加对应的类型守卫函数

3. **自定义动画配置**:
   - 修改 `types/AnimationConfig.ts`
   - 通过 `useBattleDirector` 的 `animationConfig` 选项传入

## 7. Common Issues

| Issue | Solution |
|-------|----------|
| 动画不播放 | 检查 `autoPlay` 选项或手动调用 `controls.play()` |
| 事件未被处理 | 启用 `registry.setDebugMode(true)` 查看未处理事件 |
| 动画时序错乱 | 使用 `delay` 字段控制动作执行顺序 |
| 状态不更新 | 确保 `scheduler.tick()` 返回的 `hasChanges` 被正确处理 |
