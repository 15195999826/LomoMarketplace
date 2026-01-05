# Battle Replay Protocol v2 - 详细设计文档

> 版本：v2.0
> 创建日期：2026-01-06
> 状态：设计完成，待实现

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
| 投射物创建 | ProjectileSystem | `projectileSpawned` 事件 |
| 投射物飞行轨迹 | 每帧位置 | `projectilePosition` 事件 |
| 投射物命中/消失 | ProjectileSystem | `projectileHit`/`projectileDespawned` 事件 |
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

```typescript
interface ProjectileSpawnedEvent {
  kind: 'projectileSpawned';
  projectileId: string;
  configId: string;
  sourceActorId: string;
  initialPosition: { x: number; y: number; z: number };
  targetPosition?: { x: number; y: number; z: number };
  targetActorId?: string;
  config?: unknown;           // v1 可选内嵌完整配置
}

// 每帧位置更新（v1 简单方案，前端直接 lerp）
interface ProjectilePositionEvent {
  kind: 'projectilePosition';
  projectileId: string;
  position: { x: number; y: number; z: number };
}

interface ProjectileHitEvent {
  kind: 'projectileHit';
  projectileId: string;
  targetActorId: string;
  position: { x: number; y: number; z: number };
}

interface ProjectileDespawnedEvent {
  kind: 'projectileDespawned';
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

### 5.1 框架层 vs 项目层职责

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
│                                                                 │
│  框架事件产生点：                                                 │
│  ├── GameplayInstance    → actorSpawned/actorDestroyed          │
│  ├── AttributeSet        → attributeChanged                     │
│  ├── AbilitySet          → abilityGranted/abilityRemoved        │
│  ├── AbilityExecution    → abilityActivated                     │
│  ├── TagContainer        → tagChanged                           │
│  └── ProjectileSystem    → projectile* 系列                     │
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

### 5.2 事件产生时机

| 事件 | 产生位置 | 触发条件 |
|------|---------|---------|
| `actorSpawned` | `GameplayInstance.addActor()` | 战斗中动态创建 Actor |
| `actorDestroyed` | `GameplayInstance.removeActor()` | Actor 被移除 |
| `attributeChanged` | `AttributeSet` | CurrentValue 变化时 |
| `abilityGranted` | `AbilitySet.grantAbility()` | 获得新 Ability |
| `abilityRemoved` | `AbilitySet.removeAbility()` | 移除 Ability |
| `abilityActivated` | `AbilityExecutionInstance` | Ability 开始执行 |
| `tagChanged` | `TagContainer.add/remove()` | Tag 计数变化 |
| `projectileSpawned` | `ProjectileSystem` | 投射物创建 |
| `projectilePosition` | `ProjectileSystem.tick()` | 每帧更新位置 |
| `projectileHit` | `ProjectileSystem` | 投射物命中 |
| `projectileDespawned` | `ProjectileSystem` | 投射物消失 |
| `damage/heal/move/...` | 项目 Action | Action 执行时 |

### 5.3 录制流程

```
战斗开始
    │
    ├── BattleRecorder.startRecording()
    │   ├── 记录 configs
    │   └── 记录 initialActors（遍历所有 Actor）
    │
    ▼
每个 Tick
    │
    ├── 各 System 执行
    ├── 各 Action 执行，push 事件到 EventCollector
    │
    ├── Tick 结束时
    │   ├── events = eventCollector.flush()
    │   └── BattleRecorder.recordFrame(frameNumber, events)
    │
    ▼
战斗结束
    │
    ├── BattleRecorder.stopRecording()
    │   └── 计算 meta.totalFrames
    │
    └── 导出 replay.json
```

---

## 6. 实现计划

### Phase 1: 框架层 (@lomo/logic-game-framework)

**目标**：提供录制基础设施

```
packages/logic-game-framework/src/stdlib/replay/
├── index.ts              # 导出
├── ReplayTypes.ts        # 类型定义
└── BattleRecorder.ts     # 录制器 System
```

**任务清单**：
- [ ] 1.1 创建 `ReplayTypes.ts`，定义所有接口
- [ ] 1.2 实现 `BattleRecorder` System
  - [ ] `startRecording(actors, configs)` - 捕获初始状态
  - [ ] `recordFrame(frame, events)` - 记录一帧事件
  - [ ] `stopRecording()` - 完成录制，返回 `IBattleRecord`
  - [ ] `exportJSON()` - 导出为 JSON 字符串
- [ ] 1.3 在框架模块添加事件产生点（可选，根据实际需要逐步添加）
- [ ] 1.4 从 `stdlib/index.ts` 导出

### Phase 2: 验证层 (apps/hex-atb-battle)

**目标**：在验证项目中跑通录制流程，实现日志对照

**任务清单**：
- [ ] 2.1 定义项目特有事件类型
- [ ] 2.2 在各 Action 中 push 业务事件
- [ ] 2.3 集成 BattleRecorder 到 HexBattle
- [ ] 2.4 战斗结束时导出 `Replays/replay_{timestamp}.json`
- [ ] 2.5 实现 `ReplayLogPrinter`（将 replay.json 转为可读日志）
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
  projectileSpawned: [proj_1] fireball at (1.5, 0, 0.5)

[Frame 52]
  projectilePosition: [proj_1] at (2.0, 0, 1.0)

[Frame 55]
  projectileHit: [proj_1] hit [enemy_1] at (3.0, 0, 2.0)
  damage: 30 magical damage to [enemy_1]
  attributeChanged: [enemy_1] HP 55 → 25
  projectileDespawned: [proj_1] reason=hit

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

### 8.1 为什么不在事件中记录 logicTime？

事件按帧 flush，同一帧的事件时间相同。通过 `frame * tickInterval` 即可计算 logicTime。减少冗余数据。

### 8.2 为什么选择 JSON 而非 Protobuf？

- 全平台零依赖解析
- 可读性强，便于调试
- v1 简单优先，后续可通过 GZip 压缩优化体积
- 需要时再引入 Protobuf

### 8.3 为什么投射物记录每帧位置而非初始状态？

- v1 简单方案：前端只需 lerp 到目标位置
- 保证逻辑层和表现层轨迹完全一致
- 后续优化：可改为只记录初始状态，前端重算轨迹

### 8.4 为什么不做检查点（Checkpoint）？

- v1 战斗时长有限，事件溯源足够
- 检查点增加复杂度
- 未来需要"跳转到某帧"功能时再添加

### 8.5 为什么配置全量内嵌？

- v1 简单方案，保证 replay 文件自包含
- 离线可用，无需额外加载配置
- 后续优化：配置引用模式，减少体积

---

## 9. 未来优化方向

- [ ] 配置引用模式（只记录 configId，不内嵌完整配置）
- [ ] 投射物轨迹优化（只记录初始状态，前端重算）
- [ ] GZip 压缩
- [ ] 检查点支持（用于长战斗快进）
- [ ] JSON Schema 校验
- [ ] 协议版本兼容性处理
