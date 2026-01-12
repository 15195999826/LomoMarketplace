# Phase 1: 技能测试运行器

## 概述

创建技能测试运行器，**复用现有 InkMonBattle 战斗系统**运行单次技能释放，生成回放数据供可视化。

**核心原则**：不重新实现任何战斗逻辑，只是对现有系统的简单封装。

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                     技能测试运行器                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                            │
│  │ AbilityConfig   │  (来自 Phase 0 解析器)                      │
│  └────────┬────────┘                                            │
│           ↓                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   runSkillTest()                         │   │
│  │  1. 创建 Mock InkMon (caster + dummies)                  │   │
│  │  2. 创建 InkMonBattle 实例                               │   │
│  │  3. 授予测试技能给 caster                                 │   │
│  │  4. 触发技能释放                                          │   │
│  │  5. 推进时间直到技能完成                                   │   │
│  │  6. 返回 IBattleRecord                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│           ↓                                                     │
│  ┌─────────────────┐                                            │
│  │ IBattleRecord   │  (回放数据)                                │
│  └────────┬────────┘                                            │
│           ↓                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              useBattleDirector (复用)                    │   │
│  │              BattleStage (复用)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 复用清单

| 模块 | 来源 | 说明 |
|------|------|------|
| `InkMonBattle` | `@inkmon/battle` | 战斗逻辑 |
| `InkMonActor` | `@inkmon/battle` | 战斗单位 |
| `BattleRecorder` | `@lomo/logic-game-framework/stdlib` | 自动录制 |
| `useBattleDirector` | `inkmon-pokedex/lib/battle-replay` | 回放控制 |
| `RenderWorld` | `inkmon-pokedex/lib/battle-replay` | 渲染状态 |
| `BattleStage` | `inkmon-pokedex/components` | React 渲染 |
| 所有 Visualizers | `inkmon-pokedex/lib/battle-replay/visualizers` | 事件可视化 |

---

## 核心实现

### 1. Mock InkMon 工具

```typescript
// lib/ability-tester/mock/createMockInkMon.ts

import type { InkMon, Element } from '@inkmon/core';

/**
 * 创建测试用 Mock InkMon
 *
 * 不需要从数据库加载，直接构造最小化的 InkMon 对象
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
    description: 'Test InkMon',
    category: 'Test',
    height: 1.0,
    weight: 10.0,
    abilities: [],
    evolution: null,
  };
}
```

### 2. 技能测试运行器

```typescript
// lib/ability-tester/runner/runSkillTest.ts

import {
  InkMonBattle,
  type InkMonBattleConfig,
} from '@inkmon/battle';
import { Ability, type AbilityConfig } from '@lomo/logic-game-framework';
import type { IBattleRecord } from '@lomo/logic-game-framework/stdlib';
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

### 3. React Hook 封装

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

## 使用示例

```typescript
// app/tools/ability-tester/page.tsx

'use client';

import { useSkillTester } from '@/lib/ability-tester/hooks/useSkillTester';
import { validateAndParse } from '@/lib/ability-tester/config/parser';
import { BattleStage } from '@/components/battle-stage/BattleStage';
import { useState } from 'react';

export default function AbilityTesterPage() {
  const { testResult, isRunning, runTest, renderState, playbackControls, playbackState } = useSkillTester();
  const [jsonInput, setJsonInput] = useState('');

  const handleTest = () => {
    const result = validateAndParse(jsonInput);
    if (result.success) {
      runTest({
        abilityConfig: result.config,
        casterStats: { hp: 1000, atk: 100 },
        dummyCount: 3,
        dummyStats: { hp: 500, def: 50 },
      });
    } else {
      alert('JSON 验证失败: ' + result.errors.map(e => e.message).join(', '));
    }
  };

  return (
    <div className="ability-tester-page">
      {/* JSON 编辑器 */}
      <textarea
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder="输入 AbilityConfig JSON..."
      />

      {/* 测试按钮 */}
      <button onClick={handleTest} disabled={isRunning}>
        {isRunning ? '运行中...' : '运行测试'}
      </button>

      {/* 战斗舞台（复用现有组件） */}
      {renderState && <BattleStage renderState={renderState} />}

      {/* 回放控制 */}
      <div className="controls">
        <button onClick={playbackControls.toggle}>
          {playbackState.isPlaying ? '暂停' : '播放'}
        </button>
        <button onClick={playbackControls.reset}>重置</button>
        <span>帧: {playbackState.currentFrame}/{playbackState.totalFrames}</span>
      </div>

      {/* 错误显示 */}
      {testResult?.error && (
        <div className="error">{testResult.error}</div>
      )}
    </div>
  );
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
│   ├── ability-tester/
│   │   ├── index.ts                  # 导出
│   │   ├── config/                   # Phase 0 配置解析
│   │   │   ├── types.ts
│   │   │   ├── schema.ts
│   │   │   └── parser.ts
│   │   ├── mock/
│   │   │   └── createMockInkMon.ts   # Mock 数据工具
│   │   ├── runner/
│   │   │   └── runSkillTest.ts       # 技能测试运行器
│   │   └── hooks/
│   │       └── useSkillTester.ts     # React Hook
│   └── battle-replay/                # 现有模块（完全复用）
│       ├── hooks/
│       │   └── useBattleDirector.ts
│       ├── world/
│       │   └── RenderWorld.ts
│       └── visualizers/
└── components/
    └── battle-stage/                 # 现有组件（完全复用）
        └── BattleStage.tsx
```

---

## 与旧设计的对比

| 方面 | 旧设计（错误） | 新设计（正确） |
|------|---------------|---------------|
| GameWorld | 重新实现 TestGameWorld | 复用 InkMonBattle |
| Actor | 重新实现 TestActor | 复用 InkMonActor |
| 属性系统 | 重新实现 | 复用框架 AttributeSet |
| 事件收集 | 重新实现 | 复用 BattleRecorder |
| 回放播放 | 重新实现 useAbilityTester | 复用 useBattleDirector |
| 渲染状态 | 扩展 RenderWorld | 直接复用 RenderWorld |
| 代码量 | ~2000 行新代码 | ~200 行新代码 |

---

## 验收标准

- [ ] `createMockInkMon()` 正确创建测试用 InkMon
- [ ] `runSkillTest()` 正确运行战斗并返回回放
- [ ] `useSkillTester()` 正确封装测试和回放逻辑
- [ ] 回放可以正常播放（复用 useBattleDirector）
- [ ] 可视化效果正确（复用 BattleStage）

---

## 下一步

完成技能测试运行器后，进入 Phase2_ConfigEditor.md 实现 Monaco Editor 集成。
