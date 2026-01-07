# Phase 4 开发文档：Web 回放验证（inkmon-pokedex）

> 创建日期：2026-01-07
> 关联协议：`plan_docs\BattleReplayProtocol_v2.md` (Replay Protocol v2.0)
> 范围：只覆盖 Phase 4（Web 验证），不修改 Phase 1~3 的框架/战斗逻辑实现

---

## 0. 目标（MVP）

在 `inkmon-pokedex` 中实现一个最小可用的 Battle Replay 播放器，用于：

1. **验证数据完整性**：确认 `@inkmon/battle` 产出的 `IBattleRecord` 在 Web 端可解析、可消费、可回放。
2. **可视化调试**：提供帧进度、事件列表、关键状态（位置、HP）变化的可视化对照。
3. **作为后续表现层的地基**：后续更复杂的表演（投射物、镜头、动画）都建立在同一套 replay 消费逻辑上。

### 0.1 非目标（本 Phase 不做）

- 不做高保真战斗美术/动画
- 不做复杂粒子/投射物轨迹系统（可以先 raw 展示事件）
- 不做 replay 压缩、schema 校验、版本兼容策略（仅做运行时检查+开发期对照）

---

## 1. 当前实现情况（截至 2026-01-07）

### 1.1 已完成（Phase 3）

- `packages\inkmon-battle`：
  - `InkMonBattle` 可运行战斗，并可 `getReplay(): IBattleRecord`
  - `ReplayLogPrinter.print(replay)` 可输出对照日志
  - 项目事件：`packages\inkmon-battle\src\events\ReplayEvents.ts`（`battleStart/battleEnd/turnStart/move/skillUse/damage/heal/death/skip`）
- 协议文档：`plan_docs\BattleReplayProtocol_v2.md` 已给出完整结构与 Phase 1~3 的实现说明

### 1.2 Web 端现状（inkmon-pokedex）

- 当前有“战斗模拟器”页面：`inkmon-pokedex\app\battle\page.tsx`
- 组件 `components\battle\BattleSimulator.tsx` 目前是**纯 UI/简单数值对比**，并未接入真实战斗逻辑，也未引入 `@inkmon/battle`。
- `inkmon-pokedex\package.json` 当前依赖只有 `@inkmon/core`、`next`、`react`。

结论：Phase 4 需要把 **replay 生成** 与 **replay 消费/播放** 两条链路在 Web 端打通。

---

## 2. 设计决策（推荐方案）

### 2.1 运行战斗的位置：Server Route（推荐）

在 Next.js **Route Handler** 中运行 `@inkmon/battle`：

- 避免把战斗引擎及其依赖打进浏览器 bundle
- 便于后续做 replay 存档、分享链接、服务端验证
- 逻辑更接近“真实产品形态”（前端只是消费数据）

> 若后续想做纯前端离线回放，也可以在本 Phase 先把 replay 消费逻辑写成纯函数模块，未来复用。

### 2.2 播放器的核心：纯函数 reducer

把“初始状态 + 帧事件流 → 当前状态”写成纯函数：

- 易测试（不依赖 DOM）
- 易调试（输入 replay，输出任意 frame 的 state）
- 未来可接入更多事件（投射物、buff 等）

---

## 3. 数据与类型约定

### 3.1 关键类型来源

- `IBattleRecord`：从 `@inkmon/battle` 重新导出（实际来自 `@lomo/logic-game-framework/stdlib`）
- InkMon 项目事件：`@inkmon/battle` 的 `events/ReplayEvents.ts`（导出类型 `InkMonReplayEvent`）

### 3.2 InkMon 事件字段速查表

| 事件 | kind | 关键字段 |
|------|------|----------|
| `BattleStartEvent` | `battleStart` | `teamAIds[]`, `teamBIds[]` |
| `BattleEndEvent` | `battleEnd` | `result`, `turnCount`, `survivorIds[]` |
| `TurnStartEvent` | `turnStart` | `turnNumber`, `actorId` |
| `MoveEvent` | `move` | `actorId`, `fromHex`, `toHex` |
| `SkillUseEvent` | `skillUse` | `actorId`, `skillName`, `element`, `targetActorId?`, `targetHex?` |
| `DamageEvent` | `damage` | `damage`, `targetActorId`, `sourceActorId?`, `element`, `damageCategory`, `effectiveness`, `typeMultiplier`, `isCritical`, `isSTAB` |
| `HealEvent` | `heal` | `healAmount`, `targetActorId`, `sourceActorId?` |
| `DeathEvent` | `death` | `actorId`, `killerActorId?` |
| `SkipEvent` | `skip` | `actorId` |

> **注意**：InkMon 项目**没有** `attributeChanged` 事件。HP 变化需从 `damage`/`heal` 事件推算。

### 3.3 Web 侧最小渲染需要哪些字段

- Actor：`initialActors[].id`, `displayName`, `team`, `position.hex`, `attributes.hp/maxHp`
- Timeline：`timeline[].frame`, `events[]`
- Meta：`tickInterval`, `totalFrames`

---

## 4. 任务拆解（按依赖顺序）

> 编号是建议执行顺序；每项都给出“产物/路径/验收要点”。

### 4.1 接入依赖与编译链路

**任务**
- 4.1.1 `inkmon-pokedex\package.json` 增加：`"@inkmon/battle": "workspace:*"`
- 4.1.2 在 `inkmon-pokedex` 中验证可引用：
  - `import type { IBattleRecord } from "@inkmon/battle"`

**验收**
- `pnpm -w --filter inkmon-pokedex build` 通过

---

### 4.2 新增 API：生成 replay（simulate battle）

**目标**：给前端一个稳定的 replay 来源（同时可返回对照 log）。

**新增路径**
- `inkmon-pokedex\app\api\battle\simulate\route.ts`

**接口**
```ts
// request
export type SimulateBattleRequest = {
  teamA: string[]; // InkMon.name_en
  teamB: string[]; // InkMon.name_en
  config?: {
    tickInterval?: number;
    deterministicMode?: boolean;
    maxTurns?: number;
  };
};

// success response
export type SimulateBattleResponse = {
  success: true;
  replay: IBattleRecord;
  log?: string;
};

// error response
export type SimulateBattleErrorResponse = {
  success: false;
  error: string;
  code: 'INKMON_NOT_FOUND' | 'INVALID_TEAM' | 'BATTLE_ERROR';
  details?: string[]; // 例如：找不到的 name_en 列表
};
```

**实现要点**
- 通过 `name_en` 获取完整 `InkMon` 数据：
  ```ts
  import { getInkMonByNameEn, openDatabase } from '@inkmon/core';

  const db = openDatabase(process.env.INKMON_DB_PATH!);
  const inkmon = getInkMonByNameEn(db, name_en);
  if (!inkmon) {
    return { success: false, error: `InkMon not found: ${name_en}`, code: 'INKMON_NOT_FOUND' };
  }
  ```
- 调用 `createInkMonBattle(teamAInkMons, teamBInkMons, config)`
- 运行战斗直到结束或 `maxTurns`
- `const replay = battle.getReplay()`
- 可选：`const log = ReplayLogPrinter.print(replay)`

**验收**
- `POST /api/battle/simulate` 返回 `replay.version === "2.0"`
- 对固定输入（且 `deterministicMode: true`）多次请求 replay 关键输出稳定（至少：`totalFrames`、timeline 事件顺序不崩）

---

### 4.3 BattleSimulator：改为调用 API（产出 replay）

**修改路径**
- `inkmon-pokedex\components\battle\BattleSimulator.tsx`

**任务**
- 4.3.1 点击“开始战斗”时：
  - 收集 teamA/teamB 的 `name_en`
  - `fetch('/api/battle/simulate', { method: 'POST', body: JSON.stringify(...) })`
  - 将 `replay` 存入 state
- 4.3.2 UI 增加：
  - 显示 `replay.meta.totalFrames / tickInterval`
  - （可折叠）显示 `log`（开发期对照）

**验收**
- 页面能在选择两队后生成 replay，并展示基础信息

---

### 4.4 新建 BattleReplayPlayer（MVP 播放器）

**新增目录**
- `inkmon-pokedex\components\battle-replay\`

**新增文件**
- `BattleReplayPlayer.tsx`
- `battleReplayReducer.ts`（纯函数：applyFrame/applyEvent）
- （可选）`types.ts`（Web 端播放状态类型）

**Player 功能（MVP）**
- 播放控制：Play/Pause、Step、Speed（0.5x/1x/2x/4x）
- 进度控制：当前 frame、可拖动到任意 frame
- 信息面板：
  - 当前帧 events 列表（raw JSON 或格式化文本）
  - 当前所有 actor 状态（id、team、hp、pos）

**Reducer 最小支持的事件**
- `move`：更新 actor 的 hex 坐标（`fromHex` → `toHex`）
- `damage`：**直接扣减** actor 的 HP（`hp -= event.damage`），可显示伤害数字/暴击/属性相克效果
- `heal`：**直接增加** actor 的 HP（`hp = min(maxHp, hp + healAmount)`）
- `skillUse`：显示技能使用提示（技能名、属性、目标）
- `death`：标记 actor 死亡（隐藏或置灰）
- `turnStart`：高亮当前行动 actor
- `battleStart/battleEnd`：显示战斗开始/结束状态
- 其余事件（`skip` 等）：未知 kind 必须"只展示不崩溃"

**ActorState 状态管理**
```ts
interface ActorState {
  id: string;
  displayName: string;
  team: 'A' | 'B';
  hp: number;       // 从 initialActors.attributes.hp 初始化
  maxHp: number;    // 从 initialActors.attributes.maxHp 初始化
  position: { q: number; r: number };
  isAlive: boolean; // death 事件后设为 false
}

// damage 处理示例
case 'damage':
  const target = actorMap.get(event.targetActorId);
  if (target) {
    target.hp = Math.max(0, target.hp - event.damage);
  }
  break;

// heal 处理示例
case 'heal':
  const healed = actorMap.get(event.targetActorId);
  if (healed) {
    healed.hp = Math.min(healed.maxHp, healed.hp + event.healAmount);
  }
  break;
```

**验收**
- 输入一个 replay，能从 frame 0 播放到最后一帧
- `move` 导致的位置变化能在 UI 中体现
- `damage`/`heal` 导致 HP 变化能在 UI 中体现
- `skillUse` 能显示技能使用信息
- 遇到未知事件 `kind` 不崩溃（至少 raw 输出）

---

### 4.5 基础渲染形态（先文本，后棋盘）

**优先级建议**
1) 文本/表格：最快把正确性跑通
2) 棋盘：复用或参考 `components\world\HexagonGrid.tsx`，渲染简易六边形网格 + actor token

**验收**
- 文本模式可用（MVP 必须）
- 棋盘模式可选（若实现，则至少能看出 move 的效果）

---

## 5. 数据完整性验证清单（Phase 4 的核心验收）

### 5.1 运行时校验（前端/服务端均可做）

- `replay.version === "2.0"`
- `meta.tickInterval > 0`
- `initialActors[].id` 唯一
- timeline 中所有 `actorId/sourceActorId/targetActorId/targetActorId?`：
  - 必须存在于 `initialActors`，或被 `actorSpawned` 引入（若项目后续用到动态 actor）

### 5.2 对照校验（开发期）

- 将 `ReplayLogPrinter.print(replay)` 输出在 Web UI 中展示
- 对照以下一致性：
  - 关键事件顺序（同一 frame 内顺序）
  - 关键状态变化（HP、位置）

---

## 6. 里程碑（建议）

- M1：Web 能引用 `@inkmon/battle`（编译通过）
- M2：`/api/battle/simulate` 返回 replay + log
- M3：BattleSimulator 能生成 replay 并展示摘要
- M4：BattleReplayPlayer 文本模式可播放（含 Step/Speed/Seek）
- M5（可选）：棋盘模式展示 move + hp

---

## 7. 风险与注意事项

1. **inkmon-pokedex 依赖膨胀**：如果把战斗放浏览器端会明显增大 bundle；优先 server route。
2. **deterministicMode**：回归验证尽量开 deterministic，减少随机导致的“回放 diff”。
3. **事件字段差异**：InkMon 项目事件与示例协议字段存在命名差异（例如 `damageCategory` vs `damageType`）；Web 侧渲染需以 `packages\inkmon-battle\src\events\ReplayEvents.ts` 为准。

---

## 8. 最终交付物（Phase 4）

- Web 端可生成 replay（API）
- Web 端可播放 replay（Player）
- 内置开发期对照日志（log printer 展示）
- 基础数据完整性校验（至少 runtime asserts / defensive checks）
