# Logic Game Framework Details

<!-- region Generated Config Start -->
```yaml
description: "逻辑表演分离的通用游戏框架，支持回合制/ATB 战斗"
tracked_paths:
  - "packages/logic-game-framework/src/"
last_updated: "2025-12-31"
```
<!-- region Generated Config End -->

<!-- SECTION: core-concepts -->
<!-- TRACKED_FILES: Actor.ts, AttributeSet.ts, Ability.ts, Action.ts, BattleEvent.ts -->
## 1. Core Concepts

| Concept | Responsibility |
|---------|----------------|
| `Actor` | 游戏实体基类（OOP 设计），管理状态、位置、阵营 |
| `AttributeSet` | 四层属性计算，Modifier 管理，脏标记缓存 |
| `Ability` | 技能/Buff 容器，EC 模式组合 Component |
| `Action` | 效果执行原语，链式回调机制 |
| `BattleEvent` | 逻辑层输出给表演层的事件信封 |
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

// Modifier 类型
enum ModifierType {
  AddBase = 'AddBase',
  MulBase = 'MulBase',
  AddFinal = 'AddFinal',
  MulFinal = 'MulFinal',
}

// 属性修改器
interface AttributeModifier {
  id: string;
  attributeName: string;
  modifierType: ModifierType;
  value: number;
  source: string;
}

// Action 接口
interface IAction {
  readonly type: string;
  execute(ctx: ExecutionContext): ActionResult;
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
| `Action.onHit(action)` | 添加命中回调 |
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

### Action 回调链

```
DamageAction.execute()
  ├─ 计算伤害
  ├─ 触发 onHit
  │    └─ ApplyDebuffAction.execute()
  ├─ 如果暴击触发 onCritical
  │    └─ BonusDamageAction.execute()
  └─ 如果击杀触发 onKill
       └─ HealAction.execute()
```
<!-- END_SECTION -->

## 5. Usage Examples

```typescript
import { Actor, AttributeSet, Ability } from '@lomo/logic-game-framework';
import { BattleUnit, DamageAction, AddBuffAction } from '@lomo/logic-game-framework/stdlib';

// 创建战斗单位
const unit = new BattleUnit('hero');
unit.attributes.defineAttribute('hp', 1000, 0); // min=0
unit.attributes.defineAttribute('atk', 100);

// 添加属性修改器（如装备效果）
unit.attributes.addModifier({
  id: 'weapon-1',
  attributeName: 'atk',
  modifierType: ModifierType.AddBase,
  value: 50,
  source: 'equipment',
});

// 创建伤害 Action 并添加命中回调
const attack = new DamageAction({ base: 100, scaling: 1.0, type: 'physical' })
  .onHit(new AddBuffAction({ buffId: 'bleed', duration: 3000 }))
  .onKill(new HealAction({ amount: 50 }));

// 执行
const result = attack.execute(context);
// result.events 包含所有产生的 BattleEvent
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
| 回调不触发 | 检查 `callbackTriggers` 是否包含对应 trigger |
