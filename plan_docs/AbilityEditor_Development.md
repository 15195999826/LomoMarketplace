# 技能编辑器开发规划

## 项目概述

**目标**: 创建一个 Web 端可视化技能编辑器，支持自然语言生成 AbilityConfig，并提供实时验证场景。

**核心原则**: **最大化复用现有代码**，不重复造轮子。

---

## 架构设计

### 核心思路

```
技能测试 = 运行一次简化的 InkMonBattle + 复用现有回放系统
```

### 数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         技能编辑器架构                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     用户输入层                                    │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │   │
│  │  │ 自然语言描述   │  │ JSON 编辑器   │  │ 可视化表单编辑    │   │   │
│  │  │ (LLM 生成)    │  │ (Monaco)      │  │ (Phase 2)        │   │   │
│  │  └───────────────┘  └───────────────┘  └───────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    ↓ AbilityConfigJSON                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     配置解析层 (新增)                             │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │ parseAbilityConfig(): JSON → AbilityConfig                │  │   │
│  │  │ (复用框架 Component/Condition/Cost 类)                     │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    ↓ AbilityConfig                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     战斗执行层 (复用 @inkmon/battle)              │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │   │
│  │  │ InkMonBattle  │→ │ BattleRecorder│→ │ IBattleRecord     │   │   │
│  │  │ (运行战斗)    │  │ (录制事件)    │  │ (回放数据)        │   │   │
│  │  └───────────────┘  └───────────────┘  └───────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    ↓ IBattleRecord                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     回放渲染层 (复用 inkmon-pokedex)              │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │   │
│  │  │useBattleDirector│→│ RenderWorld   │→ │ BattleStage      │   │   │
│  │  │ (播放控制)    │  │ (状态管理)    │  │ (React 渲染)     │   │   │
│  │  └───────────────┘  └───────────────┘  └───────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 复用清单

### 完全复用（不修改）

| 模块 | 来源 | 用途 |
|------|------|------|
| `InkMonBattle` | `@inkmon/battle` | 运行战斗逻辑 |
| `InkMonActor` | `@inkmon/battle` | 战斗单位 |
| `BattleRecorder` | `@lomo/logic-game-framework/stdlib` | 录制回放 |
| `useBattleDirector` | `inkmon-pokedex/lib/battle-replay` | 播放回放 |
| `RenderWorld` | `inkmon-pokedex/lib/battle-replay` | 渲染状态管理 |
| `BattleStage` | `inkmon-pokedex/components` | React 渲染组件 |
| 所有 Visualizers | `inkmon-pokedex/lib/battle-replay/visualizers` | 事件可视化 |
| `AbilitySet` | `@lomo/logic-game-framework` | 技能管理 |
| `Ability` | `@lomo/logic-game-framework` | 技能实例 |
| 所有 Components | `@lomo/logic-game-framework` | TimeDuration, Stack, StatModifier, Tag |
| 所有 Conditions | `@lomo/logic-game-framework` | HasTag, NoTag, TagStacks |
| 所有 Costs | `@lomo/logic-game-framework` | ConsumeTag, AddTag |
| `CooldownCost` | `@inkmon/battle` | 冷却消耗 |

### 需要新增

| 模块 | 位置 | 用途 |
|------|------|------|
| `parseAbilityConfig()` | `inkmon-pokedex/lib/ability-tester/config` | JSON → AbilityConfig |
| `createMockInkMon()` | `inkmon-pokedex/lib/ability-tester/mock` | 创建测试用 InkMon |
| `runSkillTest()` | `inkmon-pokedex/lib/ability-tester/runner` | 运行单次技能测试 |
| `useSkillTester()` | `inkmon-pokedex/lib/ability-tester/hooks` | React Hook 封装 |
| `AbilityTesterPage` | `inkmon-pokedex/app/tools/ability-tester` | 页面组件 |

---

## 详细设计文档

| Phase | 文档 | 描述 |
|-------|------|------|
| **Phase 0** | [Phase0_ConfigParser.md](./AbilityEditor_refs/Phase0_ConfigParser.md) | JSON → AbilityConfig 解析器（复用框架类） |
| **Phase 1** | [Phase1_SkillTestRunner.md](./AbilityEditor_refs/Phase1_SkillTestRunner.md) | 技能测试运行器（复用 InkMonBattle + useBattleDirector） |
| **Phase 2** | Phase2_ConfigEditor.md | Monaco Editor 集成（待设计） |
| **Phase 3** | Phase3_LLMIntegration.md | LLM 生成集成（待设计） |

---

## Phase 1: 技能测试运行器

### 核心实现

```typescript
// lib/ability-tester/runner/runSkillTest.ts

import {
  InkMonBattle,
  InkMonActor,
  createInkMonActor,
  type InkMonBattleConfig,
  type IBattleRecord,
} from '@inkmon/battle';
import { Ability, type AbilityConfig } from '@lomo/logic-game-framework';
import { createMockInkMon } from '../mock/createMockInkMon';

/**
 * 技能测试配置
 */
export interface SkillTestConfig {
  /** 要测试的技能配置 */
  abilityConfig: AbilityConfig;
  /** 释放者属性 */
  casterStats?: {
    hp?: number;
    atk?: number;
    def?: number;
    spAtk?: number;
    spDef?: number;
    speed?: number;
  };
  /** 木桩数量 */
  dummyCount?: number;
  /** 木桩属性 */
  dummyStats?: {
    hp?: number;
    def?: number;
    spDef?: number;
  };
}

/**
 * 技能测试结果
 */
export interface SkillTestResult {
  /** 回放数据（用于可视化） */
  replay: IBattleRecord;
  /** 测试是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 运行技能测试
 *
 * 创建一个简化的战斗场景，释放一次技能，返回回放数据。
 */
export async function runSkillTest(config: SkillTestConfig): Promise<SkillTestResult> {
  try {
    // 1. 创建 mock InkMon
    const casterInkMon = createMockInkMon('Caster', config.casterStats);
    const dummyInkMons = Array.from(
      { length: config.dummyCount ?? 3 },
      (_, i) => createMockInkMon(`Dummy${i + 1}`, config.dummyStats)
    );

    // 2. 创建战斗配置
    const battleConfig: InkMonBattleConfig = {
      teamA: [{ inkmon: casterInkMon, position: { q: 0, r: 0 } }],
      teamB: dummyInkMons.map((inkmon, i) => ({
        inkmon,
        position: { q: 2, r: i - 1 },
      })),
      // 禁用 AI，手动控制
      autoPlay: false,
    };

    // 3. 创建并启动战斗
    const battle = new InkMonBattle(battleConfig);
    battle.start();

    // 4. 获取 caster Actor 并授予测试技能
    const caster = battle.getActorsByTeam('A')[0];
    const ability = new Ability(config.abilityConfig, caster.toRef());
    caster.abilitySet.grantAbility(ability);

    // 5. 触发技能释放
    const targets = battle.getActorsByTeam('B').map(a => a.id);
    battle.useAbility(caster.id, config.abilityConfig.configId, targets);

    // 6. 推进时间直到技能执行完成
    const maxTicks = 100; // 防止无限循环
    for (let i = 0; i < maxTicks; i++) {
      battle.tick(100); // 100ms per tick

      // 检查技能是否执行完成
      if (!caster.abilitySet.getExecutingInstances().length) {
        break;
      }
    }

    // 7. 结束战斗，获取回放
    battle.end();
    const replay = battle.getReplay();

    return {
      replay,
      success: true,
    };
  } catch (error) {
    return {
      replay: null as any,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

### Mock InkMon 工具

```typescript
// lib/ability-tester/mock/createMockInkMon.ts

import type { InkMon, Element } from '@inkmon/core';

/**
 * 创建测试用 Mock InkMon
 */
export function createMockInkMon(
  name: string,
  stats?: Partial<{
    hp: number;
    atk: number;
    def: number;
    spAtk: number;
    spDef: number;
    speed: number;
  }>,
  element: Element = 'normal'
): InkMon {
  return {
    dex_number: 0,
    name,
    name_en: name.toLowerCase().replace(/\s/g, '_'),
    elements: {
      primary: element,
      secondary: null,
    },
    stats: {
      hp: stats?.hp ?? 100,
      attack: stats?.atk ?? 100,
      defense: stats?.def ?? 50,
      sp_attack: stats?.spAtk ?? 100,
      sp_defense: stats?.spDef ?? 50,
      speed: stats?.speed ?? 100,
    },
    // 其他必要字段使用默认值
    description: 'Test InkMon',
    category: 'Test',
    height: 1.0,
    weight: 10.0,
    abilities: [],
    evolution: null,
  };
}
```

### React Hook 封装

```typescript
// lib/ability-tester/hooks/useSkillTester.ts

import { useState, useCallback } from 'react';
import { useBattleDirector } from '@/lib/battle-replay/hooks/useBattleDirector';
import { runSkillTest, type SkillTestConfig, type SkillTestResult } from '../runner/runSkillTest';
import type { AbilityConfig } from '@lomo/logic-game-framework';

export interface UseSkillTesterOptions {
  /** 初始技能配置 */
  initialAbilityConfig?: AbilityConfig;
}

export function useSkillTester(options: UseSkillTesterOptions = {}) {
  const [testResult, setTestResult] = useState<SkillTestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // 复用现有的 useBattleDirector
  const director = useBattleDirector(testResult?.replay ?? null);

  /**
   * 运行技能测试
   */
  const runTest = useCallback(async (config: SkillTestConfig) => {
    setIsRunning(true);
    try {
      const result = await runSkillTest(config);
      setTestResult(result);

      if (result.success) {
        // 自动开始播放
        director.controls.play();
      }
    } finally {
      setIsRunning(false);
    }
  }, [director.controls]);

  /**
   * 重新运行当前测试
   */
  const rerun = useCallback(() => {
    director.controls.reset();
    director.controls.play();
  }, [director.controls]);

  return {
    // 测试状态
    testResult,
    isRunning,

    // 测试控制
    runTest,
    rerun,

    // 回放状态和控制（来自 useBattleDirector）
    renderState: director.state.renderState,
    playbackControls: director.controls,
    playbackState: {
      isPlaying: director.state.isPlaying,
      currentFrame: director.state.currentFrame,
      totalFrames: director.state.totalFrames,
      speed: director.state.speed,
    },
  };
}
```

---

## 文件结构

```
inkmon-pokedex/
├── app/
│   └── tools/
│       └── ability-tester/
│           └── page.tsx              # 技能测试页面
├── lib/
│   ├── ability-tester/               # 新增模块
│   │   ├── index.ts
│   │   ├── config/
│   │   │   ├── types.ts              # JSON 类型定义
│   │   │   ├── schema.ts             # Zod Schema
│   │   │   └── parser.ts             # JSON → AbilityConfig
│   │   ├── mock/
│   │   │   └── createMockInkMon.ts   # Mock 数据工具
│   │   ├── runner/
│   │   │   └── runSkillTest.ts       # 技能测试运行器
│   │   └── hooks/
│   │       └── useSkillTester.ts     # React Hook
│   └── battle-replay/                # 现有模块（复用）
│       ├── hooks/
│       │   └── useBattleDirector.ts
│       ├── world/
│       │   └── RenderWorld.ts
│       └── visualizers/
└── components/
    └── battle-stage/                 # 现有组件（复用）
        └── BattleStage.tsx
```

---

## 与旧设计的对比

| 方面 | 旧设计（错误） | 新设计（正确） |
|------|---------------|---------------|
| GameWorld | 重新实现 TestGameWorld | 复用 InkMonBattle 内部的 GameWorld |
| Actor | 重新实现 TestActor | 复用 InkMonActor |
| 属性系统 | 重新实现 SimpleAttributeSet | 复用框架 defineAttributes |
| 事件收集 | 重新实现 | 复用 BattleRecorder |
| 回放播放 | 重新实现 useAbilityTester | 复用 useBattleDirector |
| 渲染状态 | 重新实现 | 复用 RenderWorld |
| 代码量 | ~2000 行新代码 | ~300 行新代码 |

---

## 里程碑

### M1: 基础技能测试可用
- [ ] `createMockInkMon()` 工具函数
- [ ] `runSkillTest()` 运行器
- [ ] `useSkillTester()` Hook
- [ ] 基础测试页面（硬编码技能）

### M2: JSON 配置编辑
- [ ] JSON → AbilityConfig 解析器
- [ ] Monaco Editor 集成
- [ ] 实时验证和错误提示

### M3: LLM 生成
- [ ] LLM Provider 集成
- [ ] Prompt 模板
- [ ] 生成 → 测试 → 修正循环

---

## 依赖

### 现有依赖（已有）
- `@inkmon/battle`
- `@lomo/logic-game-framework`
- `@inkmon/core`

### 新增依赖
- `zod` - JSON Schema 验证
- `@monaco-editor/react` - JSON 编辑器（Phase 2）
