# Battle Replay Protocol v2 - 详细设计文档

> 版本：v2.0
> 创建日期：2026-01-06
> 状态：Phase 1 ✅ 已完成 | Phase 2 🚧 进行中
> 最后更新：2026-01-07

## 1. 目标与动机

### 1.1 核心目标

将战斗逻辑层的执行数据，导出为跨平台可读取的标准格式，实现：

- **"一次编写逻辑，多端渲染"** - Web、Unity、UE、Godot 均可消费
- **逻辑-表现完全解耦** - 逻辑层不关心渲染，表现层只读取数据
- **战斗回放** - 支持完整重现战斗过程
- **调试与验证** - 可通过日志形式检查战斗逻辑正确性

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **事件溯源** | 初始状态 + 事件流 = 任意时刻状态 |
| **自描述性** | 事件数据足够详细，能完整表达发生了什么 |
| **按帧组织** | 同一帧的事件归为一组，无需每个事件记录时间 |
| **核心层低耦合** | core 层数据结构不依赖 EventCollector，通过回调通知变化 |
| **简单优先** | v1 采用 JSON 全量导出，后续再优化体积 |

---

## 2. 前端表演需求分析

基于 hex-atb-battle 项目，前端需要对以下内容执行表演：

| 表演内容 | 数据来源 | 记录方式 |
|---------|---------|---------|
| 角色执行技能 | Ability 激活 | `abilityActivated` 事件 |
| Action 执行效果 | 各种 Action | `damage`/`heal`/`move` 等事件 |
| Ability 获得/失去 | AbilitySet 变化 | `abilityGranted`/`abilityRemoved` 事件 |
| 属性变化 | AttributeSet 变化 | `attributeChanged` 事件 |
| Tag 变化（CD/Stack） | TagContainer 变化 | `tagChanged` 事件 |
| 角色位置变化 | 移动 Action | `move` 事件（项目定义） |
| 投射物创建 | ProjectileSystem | `projectileLaunched` 事件 |
| 投射物飞行轨迹 | 每帧位置 | `projectilePosition` 事件 ⚠️ 新增功能 |
| 投射物命中/消失 | ProjectileSystem | `projectileHit`/`projectileDespawn` 事件 |
| 地图配置 | 初始配置 | `configs.map` |
| 交互 Actor | 动态生成 | `actorSpawned` 事件 |

---

## 3. 数据结构设计

### 3.1 根结构

```typescript
interface IBattleRecord {
  /** 协议版本 */
  version: string;

  /** 元数据 */
  meta: IBattleMeta;

  /** 配置数据 - v1 全量内嵌 */
  configs: Record<string, unknown>;

  /** 初始 Actor 列表 */
  initialActors: IActorInitData[];

  /** 时间线 - 按帧组织 */
  timeline: IFrameData[];
}

interface IBattleMeta {
  battleId: string;
  recordedAt: number;       // 录制时间戳
  tickInterval: number;     // tick 间隔 (ms)
  totalFrames: number;      // 总帧数
  result?: string;          // 战斗结果
}
```

### 3.2 帧数据

```typescript
interface IFrameData {
  /** 帧号（= logicTime / tickInterval） */
  frame: number;

  /** 该帧所有事件，有序 */
  events: IReplayEvent[];
}
```

**设计决策**：
- 事件不单独记录 `logicTime`，从所属 `frame` 可推算
- 同一帧内事件保持产生顺序
- 空帧（无事件）不记录，节省空间

### 3.3 事件结构

```typescript
interface IReplayEvent {
  /** 事件类型 */
  kind: string;

  /** 事件数据，由 kind 决定具体结构 */
  [key: string]: unknown;
}
```

**设计决策**：
- 采用扁平结构，不使用 `data` 包装
- 字段使用完整名称（开发友好），生产环境可压缩
- 每个 kind 有明确的字段契约

### 3.4 Actor 初始数据

```typescript
interface IActorInitData {
  id: string;
  configId: string;           // 前端用于加载模型/预制体
  displayName: string;
  team: number | string;

  /** 位置 - 支持多种坐标系 */
  position: {
    hex?: { q: number; r: number };
    world?: { x: number; y: number; z: number };
  };

  /** 属性快照 */
  attributes: Record<string, number>;

  /** 初始 Ability 列表 */
  abilities: IAbilityInitData[];

  /** 初始 Tag */
  tags: Record<string, number>;

  /** 项目扩展字段 */
  [key: string]: unknown;
}

interface IAbilityInitData {
  instanceId: string;
  configId: string;
  remainingCooldown?: number;
  stackCount?: number;
}
```

---

## 4. 事件类型设计

### 4.1 框架层事件（自动产生）

这些事件由框架在对应模块中自动 push，项目无需手动处理。

#### Actor 生命周期

```typescript
// 战斗中动态创建 Actor
interface ActorSpawnedEvent {
  kind: 'actorSpawned';
  actor: IActorInitData;      // 完整初始数据
}

// Actor 被移除
interface ActorDestroyedEvent {
  kind: 'actorDestroyed';
  actorId: string;
  reason?: string;
}
```

#### 属性变化

```typescript
interface AttributeChangedEvent {
  kind: 'attributeChanged';
  actorId: string;
  attribute: string;
  oldValue: number;
  newValue: number;
  source?: {
    actorId?: string;
    abilityId?: string;
  };
}
```

#### Ability 生命周期

```typescript
interface AbilityGrantedEvent {
  kind: 'abilityGranted';
  actorId: string;
  ability: IAbilityInitData;
}

interface AbilityRemovedEvent {
  kind: 'abilityRemoved';
  actorId: string;
  abilityInstanceId: string;
}

interface AbilityActivatedEvent {
  kind: 'abilityActivated';
  actorId: string;
  abilityInstanceId: string;
  abilityConfigId: string;
  target?: {
    actorId?: string;
    position?: unknown;
  };
}
```

#### Tag 变化

```typescript
interface TagChangedEvent {
  kind: 'tagChanged';
  actorId: string;
  tag: string;
  oldCount: number;
  newCount: number;
}
```

#### 投射物

> **命名说明**：事件命名与框架代码对齐（`projectileLaunched` 而非 `projectileSpawned`）

```typescript
// 投射物发射（框架已有）
interface ProjectileLaunchedEvent {
  kind: 'projectileLaunched';
  projectileId: string;
  configId: string;
  sourceActorId: string;
  initialPosition: { x: number; y: number; z: number };
  targetPosition?: { x: number; y: number; z: number };
  targetActorId?: string;
  config?: unknown;           // v1 可选内嵌完整配置
}

// ⚠️ 新增功能：每帧位置更新（v1 简单方案，前端直接 lerp）
// 需要在 ProjectileSystem 中增加配置项 broadcastPosition: boolean
interface ProjectilePositionEvent {
  kind: 'projectilePosition';
  projectileId: string;
  position: { x: number; y: number; z: number };
}

// 投射物命中（框架已有）
interface ProjectileHitEvent {
  kind: 'projectileHit';
  projectileId: string;
  targetActorId: string;
  position: { x: number; y: number; z: number };
}

// 投射物消失（框架已有，注意是 projectileDespawn 不是 Despawned）
interface ProjectileDespawnEvent {
  kind: 'projectileDespawn';
  projectileId: string;
  reason: 'hit' | 'expired' | 'outOfRange' | 'pierceLimit' | string;
}
```

### 4.2 项目层事件（项目定义）

这些事件由项目在 Action 中手动 push。

```typescript
// 伤害
interface DamageEvent {
  kind: 'damage';
  sourceActorId?: string;
  targetActorId: string;
  damage: number;
  damageType: 'physical' | 'magical' | 'pure';
  isCritical?: boolean;
  isReflected?: boolean;
}

// 治疗
interface HealEvent {
  kind: 'heal';
  sourceActorId?: string;
  targetActorId: string;
  healAmount: number;
}

// 移动
interface MoveEvent {
  kind: 'move';
  actorId: string;
  fromHex: { q: number; r: number };
  toHex: { q: number; r: number };
  path?: Array<{ q: number; r: number }>;
}

// 死亡
interface DeathEvent {
  kind: 'death';
  actorId: string;
  killerActorId?: string;
}
```

---

## 5. 架构设计

### 5.1 核心设计：Observer/Bridge 模式

> **重要**：框架的 core 层数据结构（AttributeSet、AbilitySet、TagContainer）设计得非常纯粹，
> 它们**不持有 EventCollector**，**不直接产生 GameEvent**。
> 这些类只通过回调函数（`onXxxChanged`、`onGranted`）通知变化，保持核心层的低耦合。

**事件产生机制**：

```
┌─────────────────────────────────────────────────────────────────┐
│                    BattleRecorder (Observer)                    │
│              在 Actor 创建时订阅各组件的回调                      │
│              负责将回调转化为 GameEvent 推入 EventCollector       │
└─────────────────────────────────────────────────────────────────┘
          │ 订阅回调                          │ push 事件
          ▼                                  ▼
┌───────────────────────┐           ┌───────────────────────┐
│   Core 层数据结构      │           │    EventCollector     │
│   (纯粹，不依赖事件)   │           │                       │
├───────────────────────┤           │    事件流 → 回放数据  │
│ AttributeSet          │           │                       │
│   └─ onAttributeChanged()         │                       │
│ AbilitySet            │──────────▶│                       │
│   └─ onGranted/onRemoved()        │                       │
│ TagContainer          │           │                       │
│   └─ onTagChanged()   │           │                       │
└───────────────────────┘           └───────────────────────┘
```

**这样设计的好处**：
- Core 层保持纯粹，不依赖 EventCollector
- 录制功能是可选的，不开启时无性能损耗
- 符合单一职责原则
- 便于测试和维护

### 5.2 框架层 vs 项目层职责

```
┌─────────────────────────────────────────────────────────────────┐
│                 框架层 (@lomo/logic-game-framework)             │
├─────────────────────────────────────────────────────────────────┤
│  类型定义 (stdlib/replay/ReplayTypes.ts)：                       │
│  ├── IBattleRecord                                              │
│  ├── IBattleMeta                                                │
│  ├── IFrameData                                                 │
│  ├── IReplayEvent                                               │
│  ├── IActorInitData                                             │
│  └── IAbilityInitData                                           │
│                                                                 │
│  录制器 (stdlib/replay/BattleRecorder.ts)：                      │
│  └── BattleRecorder System                                      │
│      ├── 订阅 Actor 的各组件回调                                 │
│      ├── 将回调转化为标准事件                                    │
│      └── 记录事件到时间线                                        │
│                                                                 │
│  框架已有事件（由 ProjectileSystem 直接产生）：                   │
│  └── projectileLaunched/projectileHit/projectileDespawn         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 项目层 (hex-atb-battle / @inkmon/battle)        │
├─────────────────────────────────────────────────────────────────┤
│  扩展配置：                                                      │
│  ├── MapConfig                                                  │
│  └── 其他项目特有配置                                            │
│                                                                 │
│  扩展 Actor 初始数据：                                           │
│  └── 添加项目特有字段（如 hexPosition）                          │
│                                                                 │
│  定义业务事件：                                                   │
│  ├── damage                                                     │
│  ├── heal                                                       │
│  ├── move                                                       │
│  └── death 等                                                   │
│                                                                 │
│  在 Action 中 push 事件：                                        │
│  └── ctx.eventCollector.push({ kind: 'damage', ... })           │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 事件产生时机

> **注意**：Core 层组件（AttributeSet、AbilitySet、TagContainer）不直接产生事件，
> 而是由 BattleRecorder 订阅其回调后转化为事件。

| 事件 | 数据来源 | 事件产生方式 |
|------|---------|-------------|
| `actorSpawned` | `GameplayInstance` | BattleRecorder 监听 Actor 创建 |
| `actorDestroyed` | `GameplayInstance` | BattleRecorder 监听 Actor 移除 |
| `attributeChanged` | `AttributeSet.onAttributeChanged` | BattleRecorder 订阅回调后转化 |
| `abilityGranted` | `AbilitySet.onGranted` | BattleRecorder 订阅回调后转化 |
| `abilityRemoved` | `AbilitySet.onRemoved` | BattleRecorder 订阅回调后转化 |
| `abilityActivated` | `AbilityExecutionInstance` | 框架在 Ability 激活时产生（已有 `abilityActivate`） |
| `tagChanged` | `TagContainer.onTagChanged` | BattleRecorder 订阅回调后转化 |
| `projectileLaunched` | `ProjectileSystem` | 框架直接产生（已有） |
| `projectilePosition` | `ProjectileSystem` | ⚠️ 需新增：在 tick 中广播位置 |
| `projectileHit` | `ProjectileSystem` | 框架直接产生（已有） |
| `projectileDespawn` | `ProjectileSystem` | 框架直接产生（已有） |
| `damage/heal/move/...` | 项目 Action | 项目在 Action 中手动 push |

### 5.4 录制流程

```
战斗开始
    │
    ├── BattleRecorder.startRecording()
    │   ├── 记录 configs
    │   ├── 记录 initialActors（遍历所有 Actor）
    │   └── 订阅所有 Actor 的组件回调（AttributeSet、AbilitySet、TagContainer）
    │
    ▼
每个 Tick
    │
    ├── 各 System 执行
    ├── 各 Action 执行，push 事件到 EventCollector
    ├── Core 组件状态变化 → 触发回调 → BattleRecorder 转化为事件
    │
    ├── Tick 结束时
    │   ├── events = eventCollector.flush()
    │   └── BattleRecorder.recordFrame(frameNumber, events)
    │
    ▼
Actor 动态创建/销毁
    │
    ├── BattleRecorder 监听 GameplayInstance
    ├── 创建时：记录 actorSpawned 事件 + 订阅新 Actor 的回调
    └── 销毁时：记录 actorDestroyed 事件 + 取消订阅
    │
    ▼
战斗结束
    │
    ├── BattleRecorder.stopRecording()
    │   ├── 取消所有回调订阅
    │   └── 计算 meta.totalFrames
    │
    └── 导出 replay.json
```

---

## 6. 实现计划

### Phase 1: 框架层 (@lomo/logic-game-framework) ✅ 已完成

**目标**：提供录制基础设施

```
packages/logic-game-framework/src/stdlib/replay/
├── index.ts              # 导出
├── ReplayTypes.ts        # 类型定义
├── BattleRecorder.ts     # 录制器 System
└── ReplayLogPrinter.ts   # 日志打印器
```

**任务清单**：
- [x] 1.1 创建 `ReplayTypes.ts`，定义所有接口
- [x] 1.2 实现 `BattleRecorder` System
  - [x] `startRecording(actors, configs)` - 捕获初始状态
  - [x] `recordFrame(frame, events)` - 记录一帧事件
  - [x] `stopRecording()` - 完成录制，返回 `IBattleRecord`
  - [x] `exportJSON()` - 导出为 JSON 字符串
- [x] 1.3 在框架模块添加事件产生点（在 `core/events/GameEvent.ts` 中添加框架层事件类型）
- [x] 1.4 从 `stdlib/index.ts` 导出

### Phase 2: 验证层 (apps/hex-atb-battle) 🚧 进行中

**目标**：在验证项目中跑通录制流程，实现日志对照

**任务清单**：
- [ ] 2.1 定义项目特有事件类型（damage/heal/move/death 等）
- [ ] 2.2 在各 Action 中 push 业务事件
- [x] 2.3 集成 BattleRecorder 到 HexBattle
  - [x] `CharacterActor` 实现 `IRecordableActor` 接口
  - [x] `HexBattle` 初始化 BattleRecorder 并调用 `startRecording()`
  - [x] 每帧调用 `recordFrame()`
- [x] 2.4 战斗结束时导出 `Replays/replay_{timestamp}.json`
- [x] 2.5 实现 `ReplayLogPrinter`（将 replay.json 转为可读日志）
- [ ] 2.6 与现有 BattleLogger 输出对照验证

**ReplayLogPrinter 输出示例**：

```
=== Battle Replay Log ===
Version: 1.0 | Tick Interval: 100ms | Total Frames: 150

--- Initial State ---
Actor [hero_1] "战士" @ hex(0,0)
  - HP: 100, ATK: 20
  - Abilities: [skill_slash]
Actor [enemy_1] "哥布林" @ hex(3,2)
  - HP: 80, ATK: 15

--- Timeline ---
[Frame 10]
  abilityActivated: [hero_1] uses [skill_slash] → [enemy_1]
  damage: [hero_1] deals 25 physical damage to [enemy_1]
  attributeChanged: [enemy_1] HP 80 → 55

[Frame 15]
  tagChanged: [hero_1] skill_slash_cd: 0 → 1

[Frame 50]
  projectileLaunched: [proj_1] fireball at (1.5, 0, 0.5)

[Frame 52]
  projectilePosition: [proj_1] at (2.0, 0, 1.0)

[Frame 55]
  projectileHit: [proj_1] hit [enemy_1] at (3.0, 0, 2.0)
  damage: 30 magical damage to [enemy_1]
  attributeChanged: [enemy_1] HP 55 → 25
  projectileDespawn: [proj_1] reason=hit

=== End of Replay ===
```

### Phase 3: 正式项目层 (@inkmon/battle)

**目标**：将验证通过的方案移植到正式项目

**任务清单**：
- [ ] 3.1 定义 InkMon 特有事件类型
- [ ] 3.2 集成 BattleRecorder
- [ ] 3.3 导出 replay 相关类型供 pokedex 使用

### Phase 4: Web 验证 (inkmon-pokedex)

**目标**：在 Web 端验证数据完整性，实现基础渲染

**任务清单**：
- [ ] 4.1 引用 `@inkmon/battle` 类型
- [ ] 4.2 创建 BattleReplayPlayer 组件
- [ ] 4.3 实现基础渲染（位置、伤害数字）
- [ ] 4.4 验证数据完整性

---

## 7. 示例数据

```json
{
  "version": "1.0",
  "meta": {
    "battleId": "battle_20260106_143000",
    "recordedAt": 1736163000000,
    "tickInterval": 100,
    "totalFrames": 150
  },
  "configs": {
    "map": {
      "id": "forest_01",
      "width": 10,
      "height": 8
    }
  },
  "initialActors": [
    {
      "id": "hero_1",
      "configId": "warrior",
      "displayName": "战士",
      "team": 1,
      "position": { "hex": { "q": 0, "r": 0 } },
      "attributes": { "hp": 100, "maxHp": 100, "atk": 20 },
      "abilities": [
        { "instanceId": "ab_1", "configId": "skill_slash" }
      ],
      "tags": {}
    },
    {
      "id": "enemy_1",
      "configId": "goblin",
      "displayName": "哥布林",
      "team": 2,
      "position": { "hex": { "q": 3, "r": 2 } },
      "attributes": { "hp": 80, "maxHp": 80, "atk": 15 },
      "abilities": [],
      "tags": {}
    }
  ],
  "timeline": [
    {
      "frame": 10,
      "events": [
        {
          "kind": "abilityActivated",
          "actorId": "hero_1",
          "abilityInstanceId": "ab_1",
          "abilityConfigId": "skill_slash",
          "target": { "actorId": "enemy_1" }
        },
        {
          "kind": "damage",
          "sourceActorId": "hero_1",
          "targetActorId": "enemy_1",
          "damage": 25,
          "damageType": "physical"
        },
        {
          "kind": "attributeChanged",
          "actorId": "enemy_1",
          "attribute": "hp",
          "oldValue": 80,
          "newValue": 55
        }
      ]
    },
    {
      "frame": 15,
      "events": [
        {
          "kind": "tagChanged",
          "actorId": "hero_1",
          "tag": "skill_slash_cd",
          "oldCount": 0,
          "newCount": 1
        }
      ]
    }
  ]
}
```

---

## 8. 设计决策记录

### 8.1 为什么使用 Observer/Bridge 模式产生事件？

框架的 core 层数据结构（AttributeSet、AbilitySet、TagContainer）设计得非常纯粹：
- **不持有 EventCollector**
- **不直接产生 GameEvent**
- 只通过回调函数（`onXxxChanged`、`onGranted`）通知变化

如果在这些类内部直接 push 事件，会：
1. 让 core 层依赖 EventCollector
2. 破坏单一职责原则
3. 让核心数据结构变得不纯粹
4. 即使不需要录制，也会产生性能开销

**解决方案**：BattleRecorder 作为 Observer，在 Actor 创建时订阅各组件的回调，负责将回调转化为 GameEvent 推入 EventCollector。

### 8.2 为什么不在事件中记录 logicTime？

事件按帧 flush，同一帧的事件时间相同。通过 `frame * tickInterval` 即可计算 logicTime。减少冗余数据。

### 8.3 为什么选择 JSON 而非 Protobuf？

- 全平台零依赖解析
- 可读性强，便于调试
- v1 简单优先，后续可通过 GZip 压缩优化体积
- 需要时再引入 Protobuf

### 8.4 为什么投射物记录每帧位置而非初始状态？

- v1 简单方案：前端只需 lerp 到目标位置
- 保证逻辑层和表现层轨迹完全一致
- 后续优化：可改为只记录初始状态，前端重算轨迹

### 8.5 为什么不做检查点（Checkpoint）？

- v1 战斗时长有限，事件溯源足够
- 检查点增加复杂度
- 未来需要"跳转到某帧"功能时再添加

### 8.6 为什么配置全量内嵌？

- v1 简单方案，保证 replay 文件自包含
- 离线可用，无需额外加载配置
- 后续优化：配置引用模式，减少体积

### 8.7 事件命名约定

- 与框架代码对齐：使用 `projectileLaunched` 而非 `projectileSpawned`
- 回放事件使用过去时态（`abilityActivated`），表示"已发生的事实"
- 框架层事件（如 `abilityActivate`）可能需要映射为回放层事件

---

## 9. 未来优化方向

- [ ] 配置引用模式（只记录 configId，不内嵌完整配置）
- [ ] 投射物轨迹优化（只记录初始状态，前端重算）
- [ ] GZip 压缩
- [ ] 检查点支持（用于长战斗快进）
- [ ] JSON Schema 校验
- [ ] 协议版本兼容性处理
- [ ] 异步文件写入（当前 `exportReplay()` 使用同步 `fs.writeFileSync`，生产环境应改为异步）
