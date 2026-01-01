# 逻辑表演分离的技能系统设计

> 文档版本：v0.11 (Unity 风格 getComponent + 过期机制重构)
> 创建日期：2025-12-27
> 更新日期：2026-01-01
> 目标：设计一套可二次开发的、逻辑表演分离的战斗框架

**相关文档**：
- 📖 《接入指南》（待创建）- 框架接入流程、配置规范、工具链使用

---

## 1. 背景与动机

### 1.1 当前项目(DESKTK)的经验

**做得好的部分：**
- Action工厂模式：`Action.damage()`, `Action.heal()` 等链式调用，技能逻辑表达清晰
- GAS的AttributeSet：属性聚合、Modifier数学模型成熟

**遇到的困境：**
- GAS本质是"动画驱动逻辑"，而回合制需要"逻辑驱动表演"
- 为使用GAS，被迫创建两套角色（逻辑层Actor + 表演层Actor）
- GameplayEffect在两层间同步困难（来源、层数等信息）
- 技能时序配置复杂，难以与蒙太奇动画解耦
- 回调目标表达不清晰（`EDelegateTargetStrategy` 枚举过于抽象）

### 1.2 设计目标

1. **逻辑表演完全分离**：逻辑层可独立运行（AI模拟、战斗预览）
2. **TS侧定义全部逻辑**：UE仅作为渲染器
3. **保留GAS精华**：AttributeSet数学模型、Modifier聚合机制
4. **简化配置复杂度**：动画主导时序，减少手动时间配置
5. **可二次开发**：作为框架提供扩展机制，支持不同类型的回合制/ATB游戏

---

## 2. 框架边界

### 2.1 Core vs StdLib

框架分为**核心层（Core）**和**标准库（StdLib）**两部分：

| 层级 | 内容 | 可修改性 |
|------|------|---------|
| **Core** | 基础机制、接口定义、生命周期管理 | 不可修改，只能扩展 |
| **StdLib** | 常用实现、预设组件、示例代码 | 可选使用，可替换 |

### 2.2 框架提供（Core）

| 模块 | 职责 | 扩展方式 |
|------|------|---------|
| GameWorld | 顶层容器、实例管理 | 可继承扩展 |
| GameplayInstance | 玩法流程控制 | 必须继承实现 |
| Actor | 游戏实体基类 | 必须继承实现 |
| System | 全局逻辑处理器 | 可继承扩展 |
| AttributeSet | 类型安全的属性集（对外）、RawAttributeSet（底层） | 属性名可定义，公式固定 |
| AbilitySet | 能力容器，管理 grant/revoke/event ✅ NEW | 可继承扩展 |
| Ability | 能力实例容器 | 可继承扩展 |
| AbilityComponent | 能力功能模块接口 | 必须实现接口 |
| GameEventBase | 事件基础接口（kind + logicTime）✅ NEW | 游戏自定义具体类型 |
| Action | 效果执行单元接口 | 必须实现接口 |
| BattleEvent | 表演层事件信封结构 | payload类型可扩展 |

### 2.3 标准库提供（StdLib）

| 模块 | 内容 | 说明 |
|------|------|------|
| **StandardAbilitySystem** | 标准能力系统 ✅ v0.10 | System 的标准实现，项目可自行实现 |
| **StandardBattleInstance** | 标准战斗实例 ✅ v0.10 | GameplayInstance 的标准实现 |
| 标准Action | Damage, Heal, AddBuff, Move, Knockback... | 覆盖常见战斗效果 |
| 标准Component | TimeDuration, Stack, StatModifier... | 覆盖常见能力行为 |
| GameEventComponent | 事件驱动的 Action 执行器 | 唯一触发 Action 的组件 |
| 标准Attribute | HP, MaxHP, ATK, DEF, Speed... | 作为示例，游戏可自定义 |
| BattleUnit | 战斗单位 | Actor的标准实现 |

**标准实现说明**：stdlib 中的实现都是可选的，项目可以：
- 直接使用
- 继承扩展
- 基于 core 完全自行实现

### 2.4 示例代码（examples/）✅ NEW

| 模块 | 内容 | 说明 |
|------|------|------|
| events/BattleGameEvents.ts | DamageEvent, DeathEvent... | 游戏事件类型示例 |
| events/ActionTriggerFactories.ts | createEventTrigger | 触发器工厂示例 |
| abilities/AbilityTags.ts | RPG/MOBA/回合制标签 | 标签定义示例 |
| abilities/ActiveSkillComponent.ts | 主动技能组件 | CD/Cost/激活流程示例 |

**设计原则**：框架层不定义具体的标签、事件类型、组件实现，由游戏自定义。示例代码供参考。

### 2.5 框架不管（由游戏层实现）

| 内容 | 说明 |
|------|------|
| 具体伤害公式 | 框架提供表达式求值接口，公式由游戏定义 |
| AI决策逻辑 | 框架提供查询接口，决策由AISystem实现 |
| 技能配置数据 | 框架定义Schema，数据由游戏填充 |
| UI/渲染/表演 | 框架输出BattleEvent，表演由宿主环境实现 |
| 存档格式 | 框架保证状态可序列化，格式由游戏定义 |
| 网络同步 | 单机框架，不处理网络 |

---

## 3. 核心设计决策（已确定）

### 3.1 逻辑层使用时间片

**决策**：即使是回合制，逻辑层也使用时间片概念

**理由**：
- 时间片不是"模拟实时流逝"，而是"为事件提供精确的逻辑顺序锚点"
- 支持打断机制（需要知道技能执行到哪个时间点）
- 处理"同时发生"的事件排序
- 统一架构（回合制/ATB可复用同一框架）

**实现思路**：事件驱动的时间模拟（非固定Tick）
```
事件队列按时间戳排序
while (队列非空) {
    取出下一个事件
    推进逻辑时间到该事件时间
    执行事件
}
```
- 只在有事件的时间点处理，不空转
- 时间精度可达毫秒级

### 3.2 支持技能打断

**决策**：技能执行不是原子操作，允许被打断

**技能状态模型**：
```
Pending → Channeling → Executing → Recovering → Completed
              ↓            ↓
         Interrupted   Interrupted
```

**打断配置**：
- 技能配置中声明"可打断区间"（如：从开始到命中帧之间可打断）
- 逻辑层需要跟踪当前技能执行状态和进度

### 3.3 动画主导时序

**决策**：时间信息从动画资产（时间序列资产）提取，而非手动配置

**时间序列资产**：
- 可以是蒙太奇、Sequence、或自定义时间轴
- 包含关键时间点标记（markers）
- 技能配置引用时间资产，绑定Action到marker

**数据流**：
```
动画资产 → [提取工具] → 时间配置(自动生成)
                              ↓
技能配置(手动编写) ← 引用时间配置 + 绑定Action
```

**好处**：
- 修改动画时间后，时间配置自动更新
- 技能配置只关心"在哪个标记点执行什么"，不关心具体毫秒数

### 3.4 "同时行动"的处理

**决策**：逻辑上永远是顺序执行，表演层可选择并行播放

**示例**：A和B连携攻击
```
逻辑层：A攻击 @100ms → B连携攻击 @150ms (顺序执行)
表演层：同时播放两个攻击动画 (视觉上同时)
```

不需要真正的并发处理机制。

---

## 4. 系统架构（已确定）

### 4.1 整体分层

```
┌─────────────────────────────────────────────────────────────┐
│                    宿主环境 (UE / Web / Node)                │
│  • 提供帧循环，调用 TS 的 advance(dt)                        │
│  • 负责渲染/表演                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ 调用
┌─────────────────────────────────────────────────────────────┐
│                       TS 逻辑层                              │
│  • 纯逻辑，可脱离UE独立存在                                  │
│  • 输入: advance(dt) / processAction(action)                │
│  • 输出: BattleEvent[]（带逻辑时间戳）                       │
└─────────────────────────────────────────────────────────────┘
```

**关键特性**：
- TS逻辑层是**被动的**，需要宿主环境驱动
- 逻辑层**代码**不依赖UE API，可在任何JS环境运行
- 逻辑层使用**逻辑时间**，与真实时间解耦

### 4.2 TS逻辑层内部架构

```
GameWorld（单例，顶层容器）
  │
  └── GameplayInstance（玩法实例）
        │
        ├── BattleInstance（战斗）
        │     ├── 流程控制（回合、阶段）
        │     ├── Systems[]
        │     │     ├── AbilitySystem
        │     │     ├── AISystem
        │     │     └── ...
        │     └── Actors[]
        │
        └── 其他玩法实例（探索等，未来扩展）
```

### 4.3 各层设计模式

| 层级 | 概念 | 设计模式 | 说明 |
|------|------|---------|------|
| 世界层 | GameWorld | 单例 | 顶层容器 |
| 玩法层 | GameplayInstance | 实例 | 控制流程，持有System和Actor |
| 系统层 | System | 全局遍历 | AbilitySystem、AISystem等 |
| 实体层 | Actor | **OOP** | 完整对象，不过度Component化 |
| 能力层 | Ability | **EC** | 技能/Buff，Component组合 |
| 组件层 | AbilityComponent | 数据+钩子 | Duration、Stack、Trigger等 |

### 4.4 Actor设计（OOP）

Actor采用面向对象设计，不过度创造Component概念。每种Actor是完整的对象，内部持有什么是它自己的能力。

```typescript
class BattleUnit extends Actor {
    // 直接持有，不是Component
    attributes: AttributeSet;
    abilities: Ability[];
    equipment: Equipment;

    tick(dt: number) {
        // Actor自己知道该干嘛
    }
}
```

**设计理由**：
- 战斗单位的结构相对固定（一定有属性、一定有能力系统）
- 不需要"有的角色有属性，有的没有"这种灵活性
- OOP更直观，符合人类思维

### 4.5 Ability设计（EC模式）

Ability（技能/Buff）采用Entity-Component模式，因为能力的组合是动态的。

```typescript
class Ability {
    readonly id: string;           // 实例唯一标识
    readonly configId: string;     // 配置表引用
    readonly source: ActorRef;     // 施加者
    readonly owner: ActorRef;      // 持有者
    readonly tags: readonly string[];  // 标签
    readonly components: readonly IAbilityComponent[];  // 不可变
}
```

**关键设计决策**：
- **Component 在构造时注入，运行时不可修改**
- 双层触发机制：内部 Hook + 事件响应
- 标签使用 `string[]`，框架不预定义具体标签

### 4.5.1 AbilitySet（能力容器）✅ NEW

**AbilitySet** 取代 `Actor.abilities: Ability[]`，是统一的能力容器：

```typescript
class AbilitySet<T extends AttributesConfig> {
    readonly owner: ActorRef;
    readonly attributes: AttributeSet<T>;

    // 能力管理
    grantAbility(ability: Ability): void;
    revokeAbility(abilityId: string, reason: AbilityRevokeReason): boolean;
    revokeAbilitiesByTag(tag: string, reason: AbilityRevokeReason): number;

    // 内部 Hook
    tick(dt: number): void;

    // 事件接收
    receiveEvent(event: GameEventBase): void;

    // 查询方法
    findAbilityById(id: string): Ability | undefined;
    findAbilitiesByTag(tag: string): Ability[];
    hasAbility(configId: string): boolean;

    // 回调
    onAbilityGranted(callback): () => void;
    onAbilityRevoked(callback): () => void;
}
```

**职责**：
- 管理 Ability 的获得 (grant) 和移除 (revoke)
- 持有 owner 和 attributes 引用
- 分发事件到所有 Ability 的 Component
- 驱动内部 Hook (tick)
- 自动清理过期的 Ability

### 4.5.2 双层触发机制 ✅ NEW

```
┌─────────────────────────────────────────────────────────────┐
│                     双层触发机制                              │
├──────────────────────┬──────────────────────────────────────┤
│  内部 Hook（框架级）   │  事件系统（业务级）                    │
├──────────────────────┼──────────────────────────────────────┤
│  onTick(dt)          │  receiveEvent(event)                 │
│  onActivate(ctx)     │                                      │
│  onDeactivate(ctx)   │  → GameEventComponent 响应            │
├──────────────────────┼──────────────────────────────────────┤
│  用于标准组件：            │  用于被动技能：                        │
│  - TimeDurationComponent │  - 受伤时反击                         │
│  - StatModifier          │  - 击杀时回血                         │
│                      │  - 回合开始时触发                      │
└──────────────────────┴──────────────────────────────────────┘
```

**设计理由**：
- 时间驱动（tick）和事件驱动（receiveEvent）分离
- 标准组件使用内部 Hook，不需要关心业务事件
- GameEventComponent 专门负责业务事件 → Action 执行

### 4.5.3 AbilityComponent 设计

```typescript
interface IAbilityComponent {
    readonly type: string;
    readonly state: ComponentState;

    // 初始化（Ability 构造时调用）
    initialize(ability: IAbilityForComponent): void;

    // ═══ 内部 Hook（框架级）═══
    onActivate?(context: ComponentLifecycleContext): void;
    onDeactivate?(context: ComponentLifecycleContext): void;
    onTick?(dt: number): void;

    // ═══ 事件响应（业务级）═══
    onEvent?(event: GameEventBase, context: ComponentLifecycleContext): void;
}
```

**常见AbilityComponent**：

| Component | 职责 | 使用的钩子 |
|-----------|------|-----------|
| TimeDurationComponent | 基于时间的持续时间 | onTick |
| StatModifierComponent | 属性修改 | onActivate, onDeactivate |
| GameEventComponent | 事件驱动执行 Action | onEvent |
| StackComponent | 层数管理 | onActivate |
| CooldownComponent | 冷却时间 | onTick |

**组合示例**：

| 类型 | 组成 |
|------|------|
| 主动技能 | Ability + [GameEventComponent(监听 inputAction)] |
| 被动技能 | Ability + [GameEventComponent(监听 damage/death)] |
| 持续Buff | Ability + [TimeDuration, StatModifier] |
| 可叠加Buff | Ability + [TimeDuration, Stack, StatModifier] |

### 4.5.4 Unity 风格 Component 查询 ✅ v0.11

Ability 提供 Unity 风格的 Component 查询 API，使用类构造函数作为参数：

```typescript
// 类型定义
type ComponentConstructor<T extends IAbilityComponent> = new (...args: any[]) => T;

// Ability API
class Ability {
    getComponent<T>(ctor: ComponentConstructor<T>): T | undefined;
    getComponents<T>(ctor: ComponentConstructor<T>): T[];
    hasComponent<T>(ctor: ComponentConstructor<T>): boolean;
    getAllComponents(): readonly IAbilityComponent[];
}

// 使用示例
const duration = ability.getComponent(TimeDurationComponent);
//    ^? TimeDurationComponent | undefined  ← 自动推断类型

const modifiers = ability.getComponents(StatModifierComponent);
//    ^? StatModifierComponent[]
```

**设计优势**：
- 类型安全：泛型自动从构造函数推断
- IDE 友好：自动补全、跳转定义
- 与 Unity `GetComponent<T>()` 一致的使用体验

### 4.5.5 过期机制 ✅ v0.11

**Component 主动触发过期**：

```typescript
// IAbilityForComponent 接口
interface IAbilityForComponent {
    readonly id: string;
    readonly configId: string;
    expire(reason: string): void;  // Component 可调用
}

// TimeDurationComponent 示例
class TimeDurationComponent extends BaseAbilityComponent {
    onTick(dt: number): void {
        this.remaining -= dt;
        if (this.remaining <= 0) {
            this.markExpired();
            this.ability?.expire('time_duration');  // 主动通知
        }
    }
}
```

**过期原因追踪**：

```typescript
// Ability 只记录第一个过期原因
class Ability {
    private _expireReason?: string;

    expire(reason: string): void {
        if (this._state === 'expired') return;  // 忽略后续调用
        this._expireReason = reason;
        this.deactivate();
        this._state = 'expired';
    }

    get expireReason(): string | undefined {
        return this._expireReason;
    }
}
```

**AbilitySet 回调增强**：

```typescript
// 回调现在包含具体的过期原因
type AbilityRevokedCallback = (
    ability: Ability,
    reason: AbilityRevokeReason,
    abilitySet: AbilitySet,
    expireReason?: string  // 'time_duration' | 'round_duration' | ...
) => void;
```

**设计原则**：
- **谁持有状态谁负责**：Component 主动触发，而非 Ability 轮询检查
- **只记录首个原因**：多个 Component 可能同时触发过期
- **reason 类型为 string**：允许项目自定义过期原因

### 4.6 StandardAbilitySystem（标准能力系统）✅ v0.10

StandardAbilitySystem 是 **stdlib 提供的标准实现**，简化为**事件广播器**。

```typescript
// stdlib/systems/StandardAbilitySystem.ts
class StandardAbilitySystem extends System {
    // Tick 分发
    tick(actors: Actor[], dt: number): void {
        for (const actor of actors) {
            if (hasAbilitySet(actor)) {
                actor.abilitySet.tick(dt);
            }
        }
    }

    // 事件广播（gameplayState 由调用方传入）
    broadcastEvent(event: GameEventBase, actors: Actor[], gameplayState: unknown): void {
        for (const actor of actors) {
            if (hasAbilitySet(actor)) {
                actor.abilitySet.receiveEvent(event, gameplayState);
            }
        }
    }
}
```

| 职责 | 说明 |
|------|------|
| Tick 分发 | 驱动所有 Actor 的 AbilitySet.tick() |
| 事件广播 | 将 GameEvent 广播到所有 AbilitySet |

**设计说明**：
- 这是 **stdlib 中的标准实现**，项目可以完全自行实现 System
- `gameplayState: unknown` 由调用方传入，可以是实例引用或快照
- Ability 的生命周期（grant/revoke）由 AbilitySet 管理

### 4.7 事件策略：避免事件订阅

**决策**：纯逻辑层不使用事件订阅机制，改用**主动分发钩子**。

**理由**：
- 逻辑层完全可控，知道所有Actor和Ability
- 不需要"订阅-发布"的间接方式
- 执行顺序完全确定，便于调试

**对比**：

| 方式 | 代码 | 特点 |
|------|------|------|
| 事件订阅 | `actor.events.emit('onDamaged')` | 隐式，需追踪监听链 |
| 主动分发 | `for (ability of actor.abilities) ability.onHook('onDamaged')` | 显式，一目了然 |

**实现示例**：

```typescript
class BattleInstance {
    applyDamage(source: Actor, target: Actor, damage: number): BattleEvent {
        // 1. 应用伤害
        target.attributes.modifyCurrent('HP', -damage);

        // 2. 广播 GameEvent（不是事件订阅）
        this.abilitySystem.broadcastEvent({
            kind: 'damage',
            logicTime: this.logicTime,
            source: source.toRef(),
            target: target.toRef(),
            damage,
        });

        // 3. 返回 BattleEvent（给表演层）
        return { type: 'damage', source, target, damage };
    }
}
```

### 4.7.1 GameEvent 事件系统 ✅ NEW

**GameEvent** 是 Ability 系统内部的事件机制，用于触发被动技能。

```typescript
// 框架只提供基础接口约束
interface GameEventBase {
    readonly kind: string;       // 事件类型标识
    readonly logicTime: number;  // 逻辑时间戳
    readonly [key: string]: unknown;  // 允许扩展
}
```

**与 BattleEvent 的区别**：

| | GameEvent | BattleEvent |
|---|-----------|-------------|
| 用途 | Ability 系统内部 | 逻辑层 → 表演层 |
| 消费者 | GameEventComponent | 动画/特效系统 |
| 定义位置 | 游戏自定义 | 游戏自定义 |
| 示例 | damage, death, turnStart | DamageAnimation, HealEffect |

**框架设计原则**：
- 框架**不**对事件结构做假设（不预定义 source/target）
- 具体事件类型由游戏自定义
- 示例代码放在 `examples/events/` 目录

**游戏自定义事件示例**：

```typescript
// examples/events/BattleGameEvents.ts
type DamageGameEvent = GameEventBase & {
    kind: 'damage';
    source: ActorRef;
    target: ActorRef;
    damage: number;
    isCritical: boolean;
};

type DeathGameEvent = GameEventBase & {
    kind: 'death';
    unit: ActorRef;
    killer?: ActorRef;
};

// 游戏的事件联合类型
type MyGameEvent = DamageGameEvent | DeathGameEvent | TurnStartGameEvent;
```

### 4.7.2 GameEventComponent（统一事件模型）✅ NEW

**GameEventComponent** 是框架中**唯一**触发 Action 执行的组件。

**核心设计思想**：所有 Action 执行都是事件驱动的

```
┌─────────────────────────────────────────────────────────────┐
│                    GameEvent（统一入口）                     │
├─────────────────────────────────────────────────────────────┤
│  主动技能：InputActionEvent                                 │
│    - 玩家选择技能和目标                                     │
│    - 战斗系统创建 { kind: 'inputAction', abilityId, ... }   │
│    - 广播事件，技能的 GameEventComponent 匹配并执行         │
├─────────────────────────────────────────────────────────────┤
│  被动技能：DamageEvent / DeathEvent / TurnStartEvent ...    │
│    - 游戏逻辑产生事件                                       │
│    - 广播事件，被动技能的 GameEventComponent 匹配并执行     │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    GameEventComponent.onEvent()
                              ↓
                      执行 Action 链
```

**使用示例**：

```typescript
// 火球术：主动技能
const fireball = new Ability({
    configId: 'skill_fireball',
    tags: ['active', 'fire'],
    components: [
        new GameEventComponent([{
            eventKind: 'inputAction',
            filter: (event, ctx) => event.abilityId === ctx.ability.configId,
            actions: [new DamageAction({ damage: 50, element: 'fire' })],
        }]),
    ],
}, caster.toRef());

// 荆棘护甲：被动技能（受伤时反弹）
const thornArmor = new Ability({
    configId: 'passive_thorn',
    tags: ['passive'],
    components: [
        new GameEventComponent([{
            eventKind: 'damage',
            filter: (event, ctx) => event.target.id === ctx.owner.id,
            actions: [new ReflectDamageAction({ percent: 0.1 })],
        }]),
    ],
}, hero.toRef());
```

**这种设计的优势**：
1. **统一模型**：主动/被动技能都通过事件触发，Action 执行方式一致
2. **解耦**：战斗系统只负责发事件，不关心技能具体怎么执行
3. **可扩展**：可以实现"当有人使用技能时"的响应（如反制、打断）
4. **可记录**：所有操作都是事件，方便回放/录像/网络同步

### 4.8 时间模型

| 游戏类型 | 逻辑层接口 | 说明 |
|---------|-----------|------|
| 纯回合制 | `processAction(action)` | 事件驱动，瞬间算完 |
| ATB | `advance(dt)` | 逻辑时间推进 |
| 混合 | 两者都支持 | 按需使用 |

**逻辑时间 vs 真实时间**：

```typescript
class BattleInstance {
    logicTime: number = 0;

    // 推进逻辑时间，与真实时间解耦
    advance(logicDeltaTime: number): BattleEvent[] {
        this.logicTime += logicDeltaTime;
        // 处理逻辑...
        return events;
    }
}
```

- 逻辑层使用"逻辑时间"，不知道真实时间
- 宿主环境负责映射：UE每帧调用`advance(16)`，Web用`requestAnimationFrame`
- 确定性：相同输入序列 = 相同结果

### 4.9 数据流

```
玩家输入 / AI决策
        │
        ▼
┌─────────────────┐
│  BattleInstance │ ← 流程控制
│                 │
│  advance(dt)    │ ← 时间推进（ATB）
│  processAction()│ ← 行动处理（回合制）
└─────────────────┘
        │
        ▼
  BattleEvent[]（带逻辑时间戳）
        │
        ▼
┌─────────────────┐
│    表演层        │ ← 按时间戳播放动画/特效
│  (UE / Web)     │
└─────────────────┘
```

### 4.10 关键接口定义（概念级）

**时间序列资产**
```typescript
interface ITimelineAsset {
    id: string;
    totalDuration: number;
    markers: { name: string; time: number; }[];
}
```

**技能配置**
```typescript
interface AbilityConfig {
    id: string;
    timelineAsset: string;           // 引用时间资产
    actionBindings: {                // marker → actions
        marker: string;
        actions: ActionConfig[];
    }[];
    interruptible: {                 // 可打断区间
        duringMarkers: [string, string];
    };
}
```

**战斗事件（逻辑层输出）**
```typescript
interface BattleEvent {
    type: string;
    logicTime: number;               // 逻辑时间戳
    sourceUnitId?: string;
    // ... 具体事件数据
}
```

### 4.11 扩展接口定义

框架的所有核心模块都提供扩展接口，二次开发者通过继承/实现这些接口来扩展框架。

**GameWorld 扩展**
```typescript
abstract class GameWorld {
    protected instances: Map<string, GameplayInstance>;

    // 可重写：自定义实例创建逻辑
    protected createInstance(type: string, config: object): GameplayInstance;

    // 可重写：全局Tick前后钩子
    protected onPreTick(dt: number): void;
    protected onPostTick(dt: number): void;
}
```

**GameplayInstance 扩展**
```typescript
abstract class GameplayInstance {
    abstract readonly type: string;
    protected systems: System[] = [];
    protected actors: Actor[] = [];

    // 必须实现：驱动接口
    abstract advance(dt: number): BattleEvent[];

    // 可重写：生命周期钩子
    protected onStart(): void;
    protected onEnd(): void;
}
```

**Actor 扩展**
```typescript
abstract class Actor {
    readonly id: string;
    abstract readonly type: string;

    // 可重写
    tick(dt: number): void;
    onSpawn(): void;
    onDespawn(): void;
}

// 使用示例
class BattleUnit extends Actor {
    readonly type = 'BattleUnit';
    attributes: AttributeSet;
    abilities: Ability[];

    // 游戏特有逻辑
    equipment: Equipment;
}
```

**System 扩展**
```typescript
abstract class System {
    abstract readonly type: string;

    // 必须实现
    abstract tick(actors: Actor[], dt: number): void;

    // 可重写
    onRegister(instance: GameplayInstance): void;
    onUnregister(): void;
}
```

**AbilityComponent 接口**
```typescript
interface IAbilityComponent {
    readonly type: string;

    // 生命周期
    onAttach(ability: Ability): void;
    onDetach(): void;

    // 钩子（可选实现）
    onTick?(dt: number): void;
    onHook?(hookName: string, context: Readonly<HookContext>): void;

    // 激活检查（可选，用于Cost/Cooldown等前置条件）
    canActivate?(ctx: Readonly<ActivationContext>): boolean | ActivationError;

    // 序列化（可选）
    serialize?(): object;
    deserialize?(data: object): void;
}
```

**Action 接口**
```typescript
interface IAction {
    readonly type: string;

    // 必须实现
    execute(ctx: Readonly<ExecutionContext>): ActionResult;

    // 可选：配置方法（链式调用）
    setTarget?(target: TargetRef): this;
}

interface ActionResult {
    success: boolean;
    events: BattleEvent[];
    callbackTriggers: string[];  // 如 'onCrit', 'onKill'
}
```

**BattleEvent 扩展**
```typescript
// 事件信封（固定结构）
interface BattleEvent<T = unknown> {
    readonly type: string;
    readonly logicTime: number;
    readonly payload: T;
}

// 标准事件（StdLib）
type DamageEvent = BattleEvent<{
    source: ActorRef;
    target: ActorRef;
    damage: number;
    isCritical: boolean;
}>;

// 游戏可扩展自定义事件
type MyCustomEvent = BattleEvent<{
    customData: string;
}>;
```

### 4.12 错误处理策略

框架定义统一的错误处理策略，确保游戏不会因异常而崩溃。

| 场景 | 框架行为 | 理由 |
|------|---------|------|
| 循环依赖检测 | 返回缓存值 + 警告日志 | 不崩溃，但记录问题 |
| Marker不存在 | 抛出配置错误（开发期）| 快速失败，配置问题必须修复 |
| Action执行异常 | 捕获 + 产出ErrorEvent | 不中断战斗流程 |
| 属性计算溢出 | Clamp到安全范围 + 警告 | 防止数值爆炸 |
| Component钩子异常 | 捕获 + 跳过该Component | 单个Component错误不影响其他 |

**Logger接口**

框架提供统一Logger接口，游戏层可注入自定义实现：

```typescript
interface ILogger {
    debug(msg: string, data?: object): void;
    info(msg: string, data?: object): void;
    warn(msg: string, data?: object): void;
    error(msg: string, data?: object): void;
}

// 框架初始化时注入
Framework.init({
    logger: myCustomLogger,  // 可选，默认使用console
});
```

**错误事件**

当框架捕获异常时，产出ErrorEvent供游戏层处理：

```typescript
type ErrorEvent = BattleEvent<{
    errorType: 'action_failed' | 'component_error' | 'config_invalid';
    message: string;
    context?: object;
}>;
```

---

## 5. 属性系统设计（已确定）

### 5.1 核心概念

属性系统只关注两个核心概念：

| 概念 | 职责 |
|------|------|
| **AttributeSet\<T\>** | 类型安全的属性集（对外接口），持有一组属性，管理BaseValue/CurrentValue，提供变化钩子 |
| **RawAttributeSet** | 底层实现类（@internal），框架内部使用 |
| **AttributeModifier** | 描述"如何修改某个属性"的数据结构 |

上层概念（武器、Buff、被动技能等）都是**创建和管理Modifier的来源**，不是属性系统本身需要关心的。

### 5.2 计算公式

```
CurrentValue = ((Base + AddBase) × MulBase + AddFinal) × MulFinal
```

### 5.3 四层语义模型

| 层级 | 代码名 | UI描述模板 | 玩家心理模型 | 默认值 |
|------|--------|-----------|-------------|--------|
| 1. 肉体强化 | `AddBase` | **基础**攻击力 +10 | "我通过锻炼变强了，这是我永久的属性" | 0 |
| 2. 肉体潜能 | `MulBase` | **基础**攻击力 +20% | "我的血统/天赋变强了，同样锻炼效果更好" | 1.0 |
| 3. 外物附加 | `AddFinal` | **附加**攻击力 +50 / 装备攻击力 +50 | "这是武器的锋利度，和我力气多大没关系" | 0 |
| 4. 状态效率 | `MulFinal` | **最终**攻击力 +30% | "这是最终打到怪身上的效果，是我发挥能力的效率" | 1.0 |

### 5.4 设计理念

这套设计追求**拟真**和**逻辑自洽**，具有极强的**解释力**：
- 每种Modifier都有现实世界的对应含义
- 玩家可以用直觉理解，无需了解公式

### 5.5 关键设计决策

**附加层不设百分比**：
- 装备强化（如武器+10%攻击力）应直接修改装备自身属性
- 而非在角色属性层添加"附加百分比"Modifier
- 这保持了语义的清晰：附加层就是"外物本身的数值"

**MulFinal的描述词**：
- 可用"最终"、"效率"、或符合游戏世界观的词汇
- 例如："虚弱状态：最终攻击力-30%"

### 5.6 Modifier聚合规则

| 类型 | 聚合方式 | 示例 |
|------|---------|------|
| AddBase | 求和 | +10 和 +5 → **+15** |
| MulBase | 求和 | +20% 和 +10% → **+30%**（即×1.3） |
| AddFinal | 求和 | +50 和 +30 → **+80** |
| MulFinal | 求和 | +30% 和 -20% → **+10%**（即×1.1） |

**选择求和而非求积的理由**：易于玩家理解，"+20%和+10%等于+30%"比"×1.32"更直观。

### 5.7 变化钩子（参考GAS）

| 钩子 | 时机 | 典型用途 |
|------|------|----------|
| `PreAttributeBaseChange` | BaseValue即将改变前 | Clamp基础值 |
| `PostAttributeBaseChange` | BaseValue改变后 | 响应基础值变化 |
| `PreAttributeChange` | CurrentValue即将改变前 | Clamp当前值（如不超过MaxHP） |
| `PostAttributeChange` | CurrentValue改变后 | 响应变化（如触发死亡判定） |

### 5.8 循环依赖处理

**场景**：属性A的Modifier依赖属性B，属性B的Modifier依赖属性A

**示例**：
```
Buff1: ATK.AddBase = DEF肉体属性 × 10%
Buff2: DEF.AddBase = ATK肉体属性 × 10%
```

**解决方案**：防重入 + 依赖追踪

1. **依赖追踪**：Modifier添加时记录依赖关系
   - 添加Buff1时，记录"ATK依赖DEF"
   - DEF变化时，标记ATK为dirty

2. **防重入**：计算时标记状态，避免递归
   ```
   读取ATK.Current:
   1. ATK标记为【计算中】
   2. 需要DEF，读取DEF.Current
   3. DEF标记为【计算中】
   4. 需要ATK，ATK是【计算中】→ 返回ATK缓存值（不递归）
   5. DEF计算完成
   6. ATK计算完成
   ```

3. **结果特点**：
   - 不会无限循环
   - 结果可能不对称（先计算的属性值更"新"）
   - Buff获取顺序影响结果，这是合理的设计

**示例结果**：
```
初始：ATK.Base=100, DEF.Base=100
获得Buff1（ATK依赖DEF），获得Buff2（DEF依赖ATK）
读取ATK时：ATK=111, DEF=110（DEF计算时ATK还是缓存值100）
```

### 5.9 属性系统对外 API

#### 导出结构

属性系统采用分层导出，区分对外 API 和内部 API：

**对外 API（游戏开发者使用）**：
```typescript
import {
  // 核心函数
  defineAttributes,      // 创建属性集
  restoreAttributes,     // 反序列化
} from '@lomo/logic-game-framework';

import type {
  // 类型定义
  AttributeSet,          // 属性集类型（类型安全的代理）
  AttributesConfig,      // 配置类型
  AttributeDefConfig,    // 单个属性配置
  ModifierBreakdown,     // $xxx 返回类型
  AttributeChangeEvent,  // 变化事件类型
} from '@lomo/logic-game-framework';
```

**内部 API（标记为 `@internal`，框架内部使用）**：
- `AttributeModifier`, `ModifierType` - Modifier 类型
- `createAddBaseModifier` 等 - Modifier 创建函数
- `RawAttributeSet` - 底层实现类
- `IAttributeModifierTarget` - 内部接口

#### 角色使用示例

```typescript
import { defineAttributes, AttributeSet } from '@lomo/logic-game-framework';

// 1. 定义属性配置
const heroConfig = {
  maxHp: { baseValue: 100, minValue: 0 },
  currentHp: { baseValue: 100, minValue: 0 },
  attack: { baseValue: 50 },
  defense: { baseValue: 30 },
  speed: { baseValue: 10 },
} as const;

// 2. 创建角色类
class Character {
  readonly name: string;
  readonly attributes: AttributeSet<typeof heroConfig>;

  constructor(name: string) {
    this.name = name;
    this.attributes = defineAttributes(heroConfig);

    // 3. 订阅属性变化
    this.attributes.onCurrentHpChanged((event) => {
      console.log(`${this.name} HP: ${event.oldValue} → ${event.newValue}`);
      if (event.newValue <= 0) {
        console.log(`${this.name} 已阵亡！`);
      }
    });
  }

  // 4. 获取属性值
  get hp() { return this.attributes.currentHp; }
  get maxHp() { return this.attributes.maxHp; }
  get attack() { return this.attributes.attack; }

  // 5. 直接修改基础值（少数情况）
  takeDamage(damage: number) {
    const newHp = Math.max(0, this.attributes.currentHp - damage);
    this.attributes.setBase('currentHp', newHp);
  }

  // 6. 查看属性详情
  showAttackBreakdown() {
    const breakdown = this.attributes.$attack;
    console.log(`攻击力分解：`);
    console.log(`  基础值: ${breakdown.base}`);
    console.log(`  肉体强化: +${breakdown.addBaseSum}`);
    console.log(`  肉体潜能: ×${breakdown.mulBaseProduct}`);
    console.log(`  外物附加: +${breakdown.addFinalSum}`);
    console.log(`  最终值: ${breakdown.currentValue}`);
  }
}

// 7. 使用 StatModifierComponent 修改属性（推荐方式）
const hero = new Character('勇者');
const buffAbility = new Ability('power-buff');
buffAbility.addComponent(new StatModifierComponent([
  { attributeName: hero.attributes.attackAttribute, modifierType: 'AddBase', value: 20 },
]));
```

#### 肉体属性定义

`(Base + AddBase) × MulBase`

包含天生能力、肉体强化、潜能发挥，不包含装备和状态效率。

#### 推荐接口：`defineAttributes()` 工厂函数

框架提供类型安全的工厂函数，支持 IDE 自动补全，类似 UE 的 `ATTRIBUTE_ACCESSORS` 宏：

```typescript
import { defineAttributes, createAddBaseModifier } from '@lomo/logic-game-framework';

// 定义属性（IDE 自动补全属性名）
const hero = defineAttributes({
  maxHp: { baseValue: 100, minValue: 0 },
  attack: { baseValue: 50 },
  defense: { baseValue: 30 },
});

// 直接访问 currentValue（最常用）
hero.maxHp          // → 100 ✅ IDE 提示
hero.attack         // → 50  ✅ IDE 提示

// $ 前缀访问 breakdown（需要详情时）
hero.$attack.base       // → 50
hero.$attack.bodyValue  // → 50
hero.$attack.addBaseSum // → 0

// Attribute 后缀获取属性名引用（用于 StatModifier）
hero.attackAttribute    // → 'attack' ✅ 类型安全
hero.defenseAttribute   // → 'defense' ✅ IDE 补全

// 修改基础值
hero.setBase('attack', 60);    // ✅ 类型安全
hero.modifyBase('attack', 10);

// 添加 Modifier（通过内部接口，外部使用 StatModifierComponent）
hero._modifierTarget.addModifier(createAddBaseModifier('buff', 'attack', 20));
hero.attack  // → 90

// 序列化/反序列化
const saved = hero.serialize();
const restored = restoreAttributes(saved);
```

**对比 UE 方式**：

| UE (C++ 宏) | TypeScript |
|-------------|------------|
| `ATTRIBUTE_ACCESSORS(Class, MaxHP)` | `defineAttributes({ maxHp: {...} })` |
| `GetMaxHP()` | `hero.maxHp` |
| `GetMaxHPAttribute()` | `hero.maxHpAttribute` |
| `SetMaxHP(v)` | `hero.setBase('maxHp', v)` |

#### Breakdown 结构

通过 `$属性名` 访问完整的分层数据：

| 字段 | 说明 |
|------|------|
| `base` | 天生值 |
| `addBaseSum` | 肉体强化总和 |
| `mulBaseProduct` | 肉体潜能乘数（1 + ΣMulBase） |
| `bodyValue` | 肉体属性 = (Base + AddBase) × MulBase |
| `addFinalSum` | 装备加成总和 |
| `mulFinalProduct` | 效率乘数（1 + ΣMulFinal） |
| `currentValue` | 最终值 |

**UI显示示例**：

```
攻击力: 105
├─ 肉体: 100              ← hero.$attack.bodyValue
│   ├─ 天生: 80           ← hero.$attack.base
│   ├─ 强化: +10          ← hero.$attack.addBaseSum
│   └─ 潜能: ×1.25        ← hero.$attack.mulBaseProduct
├─ 装备: +50              ← hero.$attack.addFinalSum
└─ 效率: ×0.7 (-30%)      ← hero.$attack.mulFinalProduct
```

**应用场景**：
- **装备需求检测**：检查 `hero.$strength.bodyValue`，避免"穿装备才能穿装备"悖论
- **Modifier依赖**："增加10%基础攻击力"依赖 `bodyValue`
- **UI分层显示**：根据需要选择显示粒度

#### 属性引用（xxxAttribute）

通过 `属性名Attribute` 后缀获取属性名的字符串字面量类型，类似 UE 的 `GetMaxHPAttribute()`：

```typescript
// 返回属性名字符串字面量（带 IDE 补全）
hero.attackAttribute   // → 'attack'
hero.defenseAttribute  // → 'defense'
hero.maxHpAttribute    // → 'maxHp'

// 用于 StatModifierComponent 的类型安全配置
new StatModifierComponent([
  { attributeName: hero.attackAttribute, modifierType: 'AddBase', value: 20 },
  //              ^^^^^^^^^^^^^^^^^^^^^ IDE 自动补全，拼写错误会编译报错
])
```

**四种访问模式汇总**：

| 访问方式 | 返回类型 | 用途 |
|---------|---------|------|
| `hero.attack` | `number` | 获取 currentValue（最常用） |
| `hero.$attack` | `ModifierBreakdown` | 获取详细分层数据 |
| `hero.attackAttribute` | `'attack'` | 获取属性名引用（用于 StatModifier） |
| `hero.onAttackChanged(cb)` | `() => void` | 订阅变化事件，返回 unsubscribe |

#### 属性变化委托（onXxxChanged）

通过 `on属性名Changed` 订阅特定属性的变化事件，类似 UE 的 `OnMaxHPChanged` 委托：

```typescript
// 订阅 HP 变化
const unsubscribe = hero.onCurrentHpChanged((event) => {
  console.log(`HP: ${event.oldValue} → ${event.newValue}`);
  if (event.newValue <= 0) {
    console.log('角色阵亡！');
  }
});

// 取消订阅
unsubscribe();
```

**特点**：
- 返回取消订阅函数，无需保存 callback 引用
- 只监听特定属性，不会收到其他属性的变化通知
- 支持驼峰命名（`onMaxHpChanged`、`onCriticalRateChanged`）

### 5.10 变化钩子

| 钩子 | 触发时机 | 典型用途 |
|------|----------|----------|
| `PreAttributeBaseChange` | Base值即将改变前 | Clamp基础值 |
| `PostAttributeBaseChange` | Base值改变后 | 响应基础值变化 |
| `PreAttributeChange` | CurrentValue即将改变前 | Clamp当前值（如不超过MaxHP） |
| `PostAttributeChange` | CurrentValue改变后 | 响应变化（如触发死亡判定） |

**注意**：
- Modifier变化（AddBase/MulBase等）不触发BaseChange钩子
- Modifier变化会导致CurrentValue变化，触发AttributeChange钩子
- **钩子只用于"观察和响应"，不用于触发其他属性重算**（重算由依赖追踪机制处理）

### 5.11 待项目实现的部分

以下内容框架层面不做约束，由具体项目在钩子中实现：
- 属性值的上下限处理
- 负数属性的特殊处理
- UI显示的具体格式和粒度

---

## 6. Action系统设计（已确定）

Action系统是技能效果的执行原语，负责"做什么"。它与Component（负责"何时执行"）配合使用。

### 6.1 核心设计思想

**分层职责**：
```
AbilityComponent（何时执行）
        │
        │ 调用
        ▼
Action（做什么）
        │
        │ 产出
        ▼
BattleEvent（结果）
```

**设计原则**：
- **原子性**：每个Action是最小执行单元（伤害、治疗、添加Buff等）
- **可组合**：复杂效果通过多个Action组合实现
- **数据驱动**：Action通过配置参数控制行为
- **结果反馈**：Action执行后产出结果，可触发后续逻辑

### 6.2 工厂模式

通过静态工厂方法创建Action，简化调用：

```typescript
// 工厂类
class Action {
    static damage(): DamageAction { ... }
    static heal(): HealAction { ... }
    static addBuff(): AddBuffAction { ... }
    static move(): MoveAction { ... }
    static projectile(): ProjectileAction { ... }
    static knockback(): KnockbackAction { ... }
    // ...
}

// 使用
Action.damage()
    .setExpression("ATK * 1.5")
    .setTarget(TargetRef.affected)
    .execute(context);
```

### 6.3 链式调用

每个Action方法返回`this`，支持流畅的链式配置：

```typescript
Action.damage()
    .setDamageExpression("ATK * 1.5")    // 伤害公式
    .setMelee()                           // 近战类型
    .setTarget({ ref: 'single_enemy' })   // 目标选择
    .onCritical(                          // 暴击回调
        Action.addBuff()
            .setBuffId("bleeding")
            .setTarget({ ref: 'affected' })
    );
```

### 6.4 目标选择器

封装各种目标选择逻辑：

**预定义选择器**：
```typescript
class TargetSelector {
    static SINGLE_ENEMY: TargetSelector;  // 单体敌方
    static SINGLE_ALLY: TargetSelector;   // 单体友方
    static SELF: TargetSelector;          // 自身
}
```

**动态创建选择器**：
```typescript
// 直线选择（穿透3格）
TargetSelector.createGridBasedLine(length: 3, pierceThrough: true);

// 圆形范围（半径2格）
TargetSelector.createCircle(radius: 2, includeCenter: false);

// 锥形范围（射程3，角度60度）
TargetSelector.createCone(range: 3, angleDegrees: 60);
```

**选择器类型**：

| 类型 | 说明 |
|------|------|
| Single | 单体目标 |
| Self | 自身 |
| Circle | 圆形范围 |
| GridBasedLine | 直线（格子） |
| Cone | 锥形范围 |
| NearestAroundTile | 周围最近单位 |
| Override | 由上层指定（用于回调） |

### 6.5 回调机制

Action执行后可根据结果触发回调Action：

```typescript
Action.damage()
    .setDamageExpression("ATK * 1.5")

    // 暴击时触发
    .onCritical(
        Action.addBuff().setBuffId("bleeding")
    )

    // 击中时触发
    .onHit(
        Action.heal().setTarget({ ref: 'source' }).setValue(10)
    )

    // 击杀时触发
    .onKill(
        Action.heal().setTarget({ ref: 'source' }).setExpression("MaxHP * 0.1")
    );
```

**回调目标策略**：

| 策略 | 说明 |
|------|------|
| Affected | 被当前Action影响的目标 |
| Source | 技能释放者 |
| None | 使用Action自身的目标选择器 |

### 6.6 Action类型列表

| Action | 说明 | 主要参数 |
|--------|------|----------|
| DamageAction | 造成伤害 | 伤害公式、攻击类型（近战/远程） |
| HealAction | 治疗 | 治疗公式 |
| AddBuffAction | 添加Buff | BuffId、层数、持续时间 |
| MoveAction | 移动 | 目标位置 |
| KnockbackAction | 击退 | 方向、距离 |
| ProjectileAction | 投射物 | 投射物类型、速度 |
| DeadAction | 死亡处理 | - |
| GameShakeAction | 镜头震动 | 强度、持续时间 |

### 6.7 与Component的整合

**EffectComponent内部调用Action**：

```typescript
class EffectComponent extends AbilityComponent {
    config: {
        actions: ActionConfig[];
    };

    onTrigger(context: AbilityContext) {
        for (const actionConfig of this.config.actions) {
            const action = this.createAction(actionConfig);
            const result = action.execute(context);

            // 处理回调
            this.processCallbacks(action, result, context);
        }
    }
}
```

**执行流程**：

```
1. Component.onTrigger() 被调用
2. 根据配置创建Action实例
3. Action.execute() 执行逻辑，返回结果
4. 检查结果，触发回调Action
5. 收集所有BattleEvent
```

### 6.8 新框架的改进方向

相比旧项目（DESKTK），新框架的Action系统计划改进：

| 问题 | 改进 |
|------|------|
| Action绑定到Tag时机复杂 | 简化为Component控制触发时机 |
| 回调目标表达不清晰 | 使用语义化TargetRef |
| 依赖UE类型 | 纯TS实现，不依赖UE |
| Builder模式过于复杂 | 简化配置结构 |

---

## 7. 待细化问题（实现阶段）

以下问题在核心架构已确定的情况下，留待实现阶段逐步细化。

### 7.1 AbilityComponent具体设计

**问题**：每个Component的接口、数据结构、钩子定义

**需要细化**：
- 各Component的配置格式
- Component之间的交互方式
- 钩子的调用顺序

### 7.2 Buff系统细节

**问题**：Buff的具体行为规则

**需要细化**：
- 层数规则（叠加上限、刷新策略）
- 互斥/覆盖关系
- 来源信息的保留和使用

### 7.3 目标选择器的表达

**问题**：如何清晰表达"对谁执行"，特别是在回调场景？

**可能的方案**：语义化的目标引用
```typescript
type TargetRef =
    | { ref: 'affected' }     // 被当前Action影响的目标
    | { ref: 'source' }       // 技能释放者
    | { ref: 'trigger' }      // 触发者（如反击时的攻击者）
    | { ref: 'custom', selector: ... };
```

### 7.4 BattleEvent结构

**问题**：逻辑层输出的事件格式

**需要细化**：
- 事件类型枚举
- 各类型事件的数据结构
- 跨语言传递的序列化方式

### 7.5 表演层接口设计

**问题**：C++如何消费BattleEvent？

**需要考虑**：
- 事件类型的定义和扩展性
- 跨语言数据传递的效率
- 表演层如何知道播放什么动画/特效
- 快进/跳过模式的支持

### 7.6 配置工具链

**问题**：如何简化技能配置的编写和维护？

**需要考虑**：
- 从动画资产自动提取时间配置的工具
- 技能配置的可视化编辑器
- 配置验证（时间资产和技能配置的一致性检查）
- 热重载支持

### 7.7 调试支持

**问题**：失去GAS编辑器调试工具后，如何调试逻辑层？

**可能的方案**：
- TS侧的战斗日志系统
- 战斗回放功能（记录所有事件，可回放）
- 属性变化追踪（谁在什么时候改了什么）
- 可视化的战斗模拟器（独立于UE运行）

---

## 8. 设计注意事项（经验教训）

基于DESKTK项目的实践经验，以下问题在新框架中需要**特别注意**避免重蹈覆辙。

### 8.1 数据传递问题 ⚠️

**DESKTK痛点**：技能激活和执行时多次数据传递，存在大量不必要的数据复制。

**问题表现**：
```
技能激活 → 创建Context → 传递给Action → 再传递给Effect → ...
每一层都在复制数据，性能和可维护性都受影响
```

**设计原则**：
- **单一上下文对象**：整个技能执行流程共享一个Context，引用传递
- **按需读取**：Context持有必要的引用，具体数据延迟获取
- **避免冗余字段**：不在Context中存储可从其他地方获取的数据

**建议方案**：
```typescript
// 差：每层复制数据
function executeAction(source, target, damage, abilityId, ...) { }

// 好：传递上下文引用
interface ExecutionContext {
    gameplayState: unknown;    // 游戏状态（快照或实例引用）✅ v0.10
    source: ActorRef;          // 引用
    primaryTarget: ActorRef;   // 引用
    ability: IAbility;         // 引用
    // 临时数据按需添加
}
function executeAction(ctx: ExecutionContext) { }

// Action 中通过类型断言访问
const state = ctx.gameplayState as MyBattleState;
const turn = state.turnNumber;
```

**v0.10 更新**：`battle` 改为 `gameplayState: unknown`，框架不假设游戏状态类型，项目可以传入：
- 实例引用（实时数据）
- 状态快照（事件发生时的数据，便于调试和回放）

### 8.2 事件描述问题 ⚠️

**DESKTK痛点**：使用统一字段在不同事件中表达不同语义，导致代码可读性差。

**问题表现**：
```typescript
// 差：统一事件结构，字段语义模糊
interface GameEvent {
    type: string;
    value1: number;  // 在伤害事件中是伤害值，在治疗事件中是治疗量...
    value2: number;  // 在伤害事件中是暴击率，在移动事件中是距离...
    target: any;     // 有时是Actor，有时是位置...
}
```

**设计原则**：
- **类型安全**：每种事件有独立的类型定义
- **语义明确**：字段名反映其含义，不复用通用字段
- **联合类型**：用TypeScript联合类型保证类型安全

**建议方案**：
```typescript
// 好：每种事件独立定义
type BattleEvent =
    | { type: 'damage'; source: ActorRef; target: ActorRef; damage: number; isCritical: boolean }
    | { type: 'heal'; source: ActorRef; target: ActorRef; healAmount: number }
    | { type: 'move'; unit: ActorRef; fromTile: TileRef; toTile: TileRef }
    | { type: 'buff_applied'; source: ActorRef; target: ActorRef; buffId: string; stacks: number };
```

### 8.3 目标选择表达问题 ⚠️

**DESKTK痛点**：回调中如何表达目标定义不清晰。例如"当暴击时对{X}DoSomething"，这个{X}在配置中难以表达。

**问题表现**：
```typescript
// 差：使用枚举，语义需要查文档
onCritical: {
    targetStrategy: EDelegateTargetStrategy.AFFECTED,  // 这是什么意思？
    action: ...
}
```

**设计原则**：
- **语义化引用**：目标引用应自解释
- **上下文感知**：不同场景下可用的目标引用不同
- **IDE提示友好**：使用字符串字面量类型，而非枚举数字

**建议方案**：
```typescript
// 好：语义化目标引用
type TargetRef =
    | { ref: 'affected' }    // 被当前Action命中的目标（伤害/治疗的接受者）
    | { ref: 'source' }      // 技能释放者
    | { ref: 'trigger' }     // 触发者（反击时：攻击我的人）
    | { ref: 'primary' }     // 主目标（技能的首选目标）
    | { ref: 'ability_owner' }  // 能力持有者（Buff挂载的人）
    | { ref: 'all_affected' }   // 所有被影响的目标（AOE场景）
    | { ref: 'custom', selector: TargetSelector };

// 使用示例：语义一目了然
Action.damage()
    .onCritical(
        Action.addBuff("bleeding").to({ ref: 'affected' })  // 给被暴击的目标加流血
    )
    .onKill(
        Action.heal(50).to({ ref: 'source' })  // 击杀时自己回血
    );
```

### 8.4 时序配置脱离动画的困境

**DESKTK痛点**：逻辑表演分离后，无法通过蒙太奇Notify触发Action，需要手动配置时间点。

**问题表现**：
- 逻辑层不播放动画，无法从动画帧获取时机
- 需要在配置中硬编码时间点（如"第350ms造成伤害"）
- 动画修改后，配置需要手动同步

**设计原则**：
- **动画资产作为权威**：时间信息从动画资产提取
- **自动化工具**：编辑器工具自动生成时间配置
- **marker而非时间戳**：配置引用marker名称，不直接使用毫秒数

**工作流建议**：
```
1. 美术创建动画资产，添加命名marker（如"hit_frame"、"end_frame"）
2. 编辑器工具自动提取marker时间点，生成时间配置
3. 策划在技能配置中引用marker名称绑定Action
4. 动画修改后，重新运行提取工具即可同步
```

### 8.5 跨层状态同步的复杂性

**DESKTK痛点**：将逻辑层GameplayEffect同步到表演层存在困难（来源信息、层数等）。

**教训**：不要尝试同步两层的"状态"，只同步"事件"。

**设计原则**：
- **事件驱动**：逻辑层输出事件，表演层消费事件
- **无状态表演层**：表演层不维护Buff列表，只负责播放效果
- **单向数据流**：逻辑层 → 事件 → 表演层，不允许反向

**建议方案**：
```
// 差：同步状态
逻辑层Buff列表变化 → 比对差异 → 同步到表演层Buff列表

// 好：同步事件
逻辑层发生变化 → 产出事件 { type: 'buff_applied', buffId, stacks, duration } → 表演层播放效果
```

### 8.6 调试困难的应对

**DESKTK痛点**：失去GAS编辑器的调试工具后，追踪问题变得困难。

**需要建设**：
- **结构化日志**：记录每个Action的输入输出
- **属性变化追踪**：谁在什么时候改了什么属性
- **战斗回放**：可保存事件序列，离线回放分析
- **独立模拟器**：不依赖UE的战斗模拟环境

### 8.7 游戏存档的考虑

**需要序列化的内容**：
- 角色属性的Base值（Modifier由装备/Buff重新计算）
- 当前装备列表
- 永久性Buff/被动（如天赋、诅咒）
- 战斗中途存档：当前回合、行动队列、临时Buff状态

**设计原则**：
- **最小化存档数据**：只存储"源数据"，派生数据重新计算
- **ID引用**：存储configId而非完整对象
- **状态快照**：战斗存档需要完整的逻辑层状态快照

**示例**：
```typescript
// 角色存档（非战斗中）
interface UnitSaveData {
    configId: string;
    baseAttributes: Record<string, number>;  // 只存Base值
    equipmentIds: string[];
    permanentBuffIds: string[];
}

// 战斗存档（战斗中途）
interface BattleSaveData {
    currentRound: number;
    units: UnitBattleState[];  // 包含临时Buff、CD等
    actionQueue: PendingAction[];
}
```

### 8.8 明确排除的内容

| 排除项 | 原因 |
|-------|------|
| 网络同步 | 单机游戏，不需要 |
| 版本兼容 | 开发阶段，配置格式可自由调整 |
| 向后兼容存档 | 开发阶段，存档格式变更可接受 |

### 8.9 小结：设计检查清单

在设计和实现时，对照检查：

| 检查项 | 标准 |
|-------|------|
| 数据传递 | 是否使用引用传递？是否避免了冗余复制？ |
| 事件类型 | 是否每种事件有独立定义？字段语义是否明确？ |
| 目标引用 | 是否语义化？是否自解释？ |
| 时序配置 | 是否引用marker而非硬编码时间？ |
| 跨层通信 | 是否只同步事件而非状态？ |
| 可调试性 | 是否有足够的日志和追踪手段？ |
| 可存档性 | 状态是否可序列化？是否最小化存档数据？ |

---

## 9. 与GAS的关系

### 9.1 保留的部分

| GAS组件 | 新系统对应 | 说明 |
|---------|-----------|------|
| AttributeSet数学模型 | TS属性系统 | 参考其Modifier聚合公式 |
| GameplayTag | 可复用或自实现 | 标签系统通用性强 |
| 部分设计模式 | Action系统 | 如Effect的Modifier概念 |

### 9.2 抛弃的部分

| GAS组件 | 原因 |
|---------|------|
| GameplayAbility | 动画驱动执行，与逻辑表演分离冲突 |
| GameplayEffect的完整实现 | 过于复杂，回合制不需要持续时间等特性 |
| AbilityTask | 基于Tick的异步执行，不适合事件驱动 |
| 预测同步 | 单机回合制不需要 |

### 9.3 可选保留

| GAS组件 | 场景 |
|---------|------|
| 编辑器调试工具 | 如果表演层仍使用GAS组件，可保留用于调试 |
| GameplayCue | 表演层的特效触发可以复用 |

---

## 10. 下一步计划

### 已完成 ✅

1. **核心架构设计**：GameWorld → GameplayInstance → System + Actor
2. **属性系统设计**：四层公式、聚合规则、循环依赖处理
3. **Ability架构设计**：EC模式、Component类型定义
4. **事件策略确定**：避免事件订阅，使用主动分发钩子
5. **Action系统设计**：工厂模式、链式调用、回调机制
6. **属性系统实现**：
   - `RawAttributeSet` 底层实现类（四层公式、缓存、脏标记、钩子）
   - `AttributeSet<T>` 类型安全的对外接口（Proxy 包装）
   - `defineAttributes()` 工厂函数（类型安全、IDE 自动补全）
   - `xxxAttribute` 属性引用（类似 UE `GetXxxAttribute()`，用于 StatModifier）
   - `onXxxChanged` 属性变化委托（类似 UE `OnXxxChanged`，返回 unsubscribe）
   - API 分层导出（对外 API vs 内部 API）
   - Modifier 创建辅助函数
7. **命名重构**：`TypedAttributeSet` → `AttributeSet`，`AttributeSet` → `RawAttributeSet`
8. **AbilitySet 双层触发机制**（v0.9）：
   - `AbilitySet` 能力容器（grant/revoke/tick/receiveEvent）
   - `GameEventBase` 事件基础接口（框架层）
   - `GameEventComponent` 事件驱动的 Action 执行器（StdLib）
   - `Ability` 重构（Component 构造时注入，不可变）
   - 双层触发：内部 Hook（tick/activate/deactivate）+ 事件响应（onEvent）
9. **框架层简化**（v0.9）：
   - 移除 `AbilityTags`（移至 examples）
   - 移除具体事件类型（移至 examples）
   - 移除便捷工厂函数（移至 examples）
   - `ActionComponent` 重命名为 `GameEventComponent`
10. **gameplayState + 标准实现重命名**（v0.10）：
    - `ExecutionContext.battle` → `gameplayState: unknown`
    - 事件传递链加入 gameplayState 参数
    - `AbilitySystem` → `StandardAbilitySystem`（移至 stdlib/systems/）
    - `BattleInstance` → `StandardBattleInstance`（重命名文件）
    - Core 只保留接口和基类，具体实现在 stdlib
11. **Unity 风格 getComponent + 过期机制重构**（v0.11）：
    - `getComponent(type: string)` → `getComponent(ctor: ComponentConstructor<T>)`
    - 新增 `getComponents(ctor)` 获取所有同类型组件
    - 移除 `Ability.checkExpiration()`，Component 主动调用 `ability.expire(reason)`
    - 过期原因追踪：`Ability.expireReason`，只记录第一个
    - `DurationComponent` → `TimeDurationComponent`（基于时间）
    - `AbilitySet` 提取 `processAbilities()` 统一过期清理逻辑
    - `AbilityRevokedCallback` 新增 `expireReason` 参数

### 待实现

1. **原型验证**：用简化版实现验证核心流程
   - ~~实现AttributeSet基础版~~ ✅
   - ~~实现Ability + Component基础版~~ ✅
   - 实现Action工厂基础版
   - 实现简单的BattleInstance流程

2. **细节完善**（实现过程中）：
   - ~~AbilityComponent的具体接口~~ ✅
   - BattleEvent结构定义

3. **工具链规划**（后期）：
   - 配置编辑器
   - 调试工具

### 配套文档（随开发进度更新）

| 文档 | 内容 | 状态 |
|------|------|------|
| **《接入指南》** | 框架接入流程、环境配置、第一个示例 | 📝 待创建 |
| **《配置规范》** | 技能/Buff配置Schema、命名规范、最佳实践 | 📝 待创建 |
| **《扩展开发》** | 自定义Action/Component开发教程 | 📝 待创建 |
| **《调试手册》** | 日志分析、常见问题排查 | 📝 待创建 |

> 注：配套文档将在框架实现过程中同步创建和更新。

---

## 附录：术语对照

### A. 本文档术语 vs GAS

| 本文档术语 | GAS对应术语 | 说明 |
|-----------|------------|------|
| Actor | AbilitySystemComponent拥有者 | 游戏实体（OOP设计） |
| Ability | GameplayAbility + GameplayEffect | 技能/Buff（EC设计） |
| AbilitySet | AbilitySystemComponent | 能力容器（管理 grant/revoke）✅ NEW |
| AbilityComponent | - | Ability的功能模块 |
| AttributeSet\<T\> | AttributeSet | 类型安全的属性集（对外接口） |
| RawAttributeSet | AttributeSet | 底层实现类（@internal） |
| Attribute | GameplayAttribute | 属性（如HP、ATK） |
| Modifier | GameplayModifier | 属性修改器 |
| Action | GameplayAbility中的逻辑单元 | 最小执行单元 |
| GameEvent | - | Ability 系统内部事件 ✅ NEW |
| GameEventComponent | - | 事件驱动的 Action 执行器 ✅ NEW |
| TimelineAsset | AnimMontage | 时间序列资产 |
| BattleEvent | - | 逻辑层 → 表演层事件 |

### B. 架构层级术语

| 术语 | 说明 |
|------|------|
| GameWorld | 顶层容器，单例 |
| GameplayInstance | 玩法实例（如BattleInstance） |
| System | 全局逻辑处理器（如AbilitySystem） |
| Actor | 游戏实体，OOP设计 |
| AbilitySet | 能力容器，持有 Ability 列表 ✅ NEW |
| Ability | 能力实例，EC设计 |
| AbilityComponent | 能力组件（TimeDuration、StatModifier、GameEventComponent等） |

### C. 属性系统术语

| 术语 | 说明 |
|------|------|
| Base | 天生值 |
| AddBase | 肉体强化（加法） |
| MulBase | 肉体潜能（乘法） |
| AddFinal | 外物附加（加法） |
| MulFinal | 状态效率（乘法） |
| BodyValue | 肉体属性 = (Base + AddBase) × MulBase |
| CurrentValue | 最终值 = BodyValue + AddFinal) × MulFinal |
