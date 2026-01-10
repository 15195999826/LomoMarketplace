# Logic Game Framework Details

<!-- region Generated Config Start -->
```yaml
description: "逻辑表演分离的通用游戏框架，支持回合制/ATB 战斗"
tracked_paths:
  - "packages/logic-game-framework/src/"
last_updated: "2026-01-11"
```
<!-- region Generated Config End -->

<!-- SECTION: core-concepts -->
<!-- TRACKED_FILES: Actor.ts, AttributeSet.ts, Ability.ts, Action.ts, GameEvent.ts, Timeline.ts, AbilityExecutionInstance.ts, StageCueAction.ts -->
## 1. Core Concepts

| Concept | Responsibility |
|---------|----------------|
| `Actor` | 游戏实体基类（OOP 设计），管理状态、位置、阵营 |
| `AttributeSet` | 四层属性计算，Modifier 管理，脏标记缓存 |
| `Ability` | 技能/Buff 容器，EC 模式组合 Component |
| `AbilityExecutionInstance` | 技能执行实例，管理 Timeline 推进和 Tag 触发 |
| `Action` | 效果执行原语，链式回调机制 |
| `Timeline` | 时间轴资产，定义 Tag 时间点（从渲染端动画导入） |
| `GameEvent` | 通用事件信封，用于事件链传递和回调触发 |
| `StageCueAction` | 舞台提示 Action，向表演层传递视觉数据 |
| `System` | 全局逻辑处理器（如回合系统、ATB 系统） |

### 架构分层

```
┌─────────────────────────────────────────┐
│              Core Layer                  │  ← 接口、基类、机制
│  (不可修改，只能扩展)                      │
├─────────────────────────────────────────┤
│              StdLib Layer                │  ← 标准实现
│  (可选实现，可替换)                        │
├─────────────────────────────────────────┤
│           Game Implementation            │  ← 具体游戏
│  (如 InkMon Battle)                      │
└─────────────────────────────────────────┘
```

### Timeline 执行流程

```
Ability.activate()
    ↓
ActivateInstanceComponent.onActivate()
    ↓ (创建)
AbilityExecutionInstance(tagActions: {tagName → Action[]})
    ↓ (tick 推进)
检测 Tag 到达 → 执行绑定的 Action 列表
    ↓
Action.execute() → 收集 GameEvent
    ↓
表演层消费 events
```

### 框架层事件类型

| Event Kind | 用途 |
|------------|------|
| `attributeChanged` | 属性值变化 |
| `abilityActivated` | Ability 激活完成 |
| `abilityTriggered` | Ability 被事件触发 |
| `executionActivated` | 执行实例创建 |
| `tagChanged` | Tag 层数变化 |
| `stageCue` | 舞台提示（表演层动画触发） |
<!-- END_SECTION -->

<!-- SECTION: design-decisions -->
<!-- TRACKED_FILES: -->
## 2. Design Decisions

### 2.1 逻辑表演分离
**Decision**: 逻辑层纯同步，通过 BattleEvent 与表演层通信
**Rationale**: 逻辑层可独立运行和测试，表演层可按需播放动画

### 2.2 OOP vs EC
**Decision**: Actor 采用 OOP，Ability 采用 EC (Entity-Component)
**Rationale**:
- Actor 结构相对固定，不需要过度 Component 化
- Ability 需要灵活组合不同功能（Duration、Stack、StatModifier）

### 2.3 Modifier 聚合规则
**Decision**: 同类型 Modifier 求和（非求积）
**Rationale**:
- MulBase +0.1 和 +0.2 聚合为 ×1.3（而非 ×1.1 ×1.2 = ×1.32）
- 避免百分比叠加过于强力

### 2.4 Action 回调深度限制
**Decision**: 最大回调深度 10 层
**Rationale**: 防止 onHit → onDamage → onHit 等无限循环
<!-- END_SECTION -->

<!-- SECTION: api-interfaces -->
<!-- TRACKED_FILES: index.ts, *.ts -->
## 3. Core Interfaces

```typescript
// Actor 状态
type ActorState = 'active' | 'inactive' | 'dead' | 'removed';

// Ability 状态
type AbilityState = 'idle' | 'active' | 'channeling' | 'executing' | 'cooldown' | 'expired';

// 执行实例状态
type ExecutionState = 'executing' | 'completed' | 'cancelled';

// Modifier 类型
enum ModifierType {
  AddBase = 'AddBase',
  MulBase = 'MulBase',
  AddFinal = 'AddFinal',
  MulFinal = 'MulFinal',
}

// 时间轴资产
interface TimelineAsset {
  readonly id: string;
  readonly totalDuration: number;
  readonly tags: Record<string, number>;  // tagName → time(ms)
}

// Action 接口
interface IAction {
  readonly type: string;
  execute(ctx: ExecutionContext): ActionResult;
}

// 执行上下文（eventChain 机制）
interface ExecutionContext {
  readonly eventChain: GameEventBase[];  // 事件链（用于回调触发）
  readonly gameplayState: unknown;
  readonly eventCollector: IEventCollector;
  readonly ability?: AbilityInfo;
  readonly execution?: ExecutionInfo;
}

// 框架层事件基础接口
interface GameEventBase {
  readonly kind: string;
  readonly [key: string]: unknown;
}

// StageCue 事件（表演层数据传递）
interface StageCueEvent extends GameEventBase {
  readonly kind: 'stageCue';
  readonly sourceActorId: string;
  readonly targetActorIds: readonly string[];
  readonly cueId: string;
  readonly params?: Record<string, unknown>;
}
```

### 3.1 Public API

| API | Description |
|-----|-------------|
| `AttributeSet.getCurrentValue(name)` | 获取属性最终值 |
| `AttributeSet.getBodyValue(name)` | 获取肉体属性 (Base×MulBase) |
| `AttributeSet.addModifier(mod)` | 添加属性修改器 |
| `Ability.addComponent(comp)` | 添加能力组件 |
| `Ability.activate(ctx)` | 激活能力（应用 Modifier） |
| `Ability.deactivate(ctx)` | 失效能力（移除 Modifier） |
| `Action.execute(ctx)` | 执行效果 |
| `AbilityExecutionInstance.tick(dt)` | 推进时间，触发 Tag |
| `getCurrentEvent(ctx)` | 获取事件链末端事件 |
| `getOriginalEvent(ctx)` | 获取事件链起始事件 |

### 3.2 框架事件工厂函数

| API | Description |
|-----|-------------|
| `createAttributeChangedEvent(...)` | 创建属性变化事件 |
| `createAbilityActivatedEvent(...)` | 创建 Ability 激活事件 |
| `createTagChangedEvent(...)` | 创建 Tag 变化事件 |
| `createStageCueEvent(...)` | 创建舞台提示事件 |
| `createExecutionActivatedEvent(...)` | 创建执行实例激活事件 |

### 3.3 框架事件类型守卫

| API | Description |
|-----|-------------|
| `isAttributeChangedEvent(event)` | 检查是否为属性变化事件 |
| `isAbilityActivatedEvent(event)` | 检查是否为 Ability 激活事件 |
| `isTagChangedEvent(event)` | 检查是否为 Tag 变化事件 |
| `isStageCueEvent(event)` | 检查是否为舞台提示事件 |
<!-- END_SECTION -->

<!-- SECTION: formulas-algorithms -->
<!-- TRACKED_FILES: AttributeCalculator.ts -->
## 4. Formulas / Core Algorithms

### 属性计算公式

```
BodyValue    = (Base + AddBase) × MulBase
CurrentValue = (BodyValue + AddFinal) × MulFinal

完整展开：
CurrentValue = ((Base + ΣAddBase) × (1 + ΣMulBase) + ΣAddFinal) × (1 + ΣMulFinal)
```

### Modifier 聚合示例

```typescript
// 基础攻击力 100
// AddBase: +10, +20 → ΣAddBase = 30
// MulBase: +0.1, +0.2 → ΣMulBase = 0.3 → 乘数 = 1.3
// AddFinal: +50
// MulFinal: +0.1 → 乘数 = 1.1

BodyValue = (100 + 30) × 1.3 = 169
CurrentValue = (169 + 50) × 1.1 = 240.9
```

### Action 事件链机制

```
DamageAction.execute(ctx)
  ├─ 计算伤害
  ├─ emit DamageEvent
  ├─ createCallbackContext(ctx, damageEvent) ← 事件入链
  ├─ 触发回调 Action（使用新 context）
  │    └─ 回调可通过 getCurrentEvent 访问触发事件
  └─ 回调结束后事件自动出链
```

事件链用途：
- 回调 Action 可查询触发原因（如"是被谁攻击触发的"）
- 支持条件判断（如"只有暴击时才触发"）
- 防止无限回调（深度限制）
<!-- END_SECTION -->

## 5. Usage Examples

```typescript
import {
  Ability, AttributeSet,
  AbilityExecutionInstance,
  createExecutionContext
} from '@lomo/logic-game-framework';
import { DamageAction } from '@lomo/logic-game-framework/stdlib';

// ===== 1. Timeline 执行实例 =====

// 注册时间轴
getTimelineRegistry().register({
  id: 'skill_fireball',
  totalDuration: 1200,
  tags: { 'cast': 0, 'hit': 600, 'end': 1200 },
});

// 创建执行实例
const instance = new AbilityExecutionInstance({
  timelineId: 'skill_fireball',
  tagActions: {
    'hit': [new DamageAction({ base: 100 })],  // 600ms 时执行伤害
  },
  eventChain: [triggerEvent],
  gameplayState: battle,
  abilityInfo: { id, configId, owner, source },
});

// 游戏循环中推进
const triggeredTags = instance.tick(deltaTime);
const events = instance.flushEvents();  // 表演层消费

// ===== 2. 属性系统 =====

const attrs = new AttributeSet();
attrs.defineAttribute('atk', 100);
attrs.addModifier({
  id: 'weapon-1',
  attributeName: 'atk',
  modifierType: 'AddBase',
  value: 50,
  source: 'equipment',
});
console.log(attrs.getCurrentValue('atk'));  // 150
```

## 6. Extension Guide

How to extend this module:

1. **Adding new Action**: 继承 `BaseAction`，实现 `execute()` 方法
2. **Adding new Component**: 实现 `IAbilityComponent` 接口
3. **Custom Attribute Logic**: 使用 `setHooks()` 添加属性变化钩子
4. **Custom Event Types**: 定义新的 Payload 类型，使用 `createBattleEvent()`

## 7. Common Issues

| Issue | Solution |
|-------|----------|
| Modifier 不生效 | 检查 `attributeName` 是否与 `defineAttribute` 一致 |
| 循环依赖警告 | 属性 A 依赖 B，B 依赖 A，检查计算逻辑 |
| Ability 不过期 | 确保添加了 `DurationComponent` |
| Timeline 未找到 | 确保在 `getTimelineRegistry().register()` 注册 |
| Tag 未触发 | 检查 `tagActions` key 是否与 timeline tags 一致 |
| 事件链为空 | 确保 `createCallbackContext` 正确传入父 context |
