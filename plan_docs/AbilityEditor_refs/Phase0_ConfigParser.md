# Phase 0: JSON 配置解析层

## 概述

在框架实际 API 和用户友好的 JSON 配置之间建立转换层。

**核心职责**：`AbilityConfigJSON` → `AbilityConfig`

---

## 背景

框架的 `AbilityConfig` 需要传入**类实例工厂函数**：

```typescript
// 框架实际 API
const config: AbilityConfig = {
  configId: 'skill_fireball',
  activeUseComponents: [
    () => new ActiveUseComponent({
      timelineId: 'timeline_aoe',
      tagActions: {
        impact: [new DamageAction({ ... })],
      },
    }),
  ],
  components: [
    () => new TimeDurationComponent(10000),
  ],
};
```

但用户需要一个可序列化的 JSON 格式来编辑和存储：

```json
{
  "configId": "skill_fireball",
  "activeUseComponents": [{
    "type": "ActiveUse",
    "timelineId": "timeline_aoe",
    "tagActions": {
      "impact": [{ "type": "Damage", "target": "eventTarget", "formula": "source.atk * 1.5" }]
    }
  }],
  "components": [{
    "type": "TimeDurationComponent",
    "duration": 10000
  }]
}
```

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                      配置解析层                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐          ┌─────────────────┐              │
│  │ AbilityConfigJSON│  parse  │  AbilityConfig   │              │
│  │   (用户编辑)      │ ──────→ │   (框架类实例)    │              │
│  └─────────────────┘          └─────────────────┘              │
│           ↑                            │                        │
│           │                            │ 运行时使用              │
│           │                            ↓                        │
│  ┌─────────────────┐          ┌─────────────────┐              │
│  │   JSON 编辑器    │          │  InkMonBattle   │              │
│  │   LLM 生成      │          │  (复用现有战斗)   │              │
│  └─────────────────┘          └─────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**关键点**：
- 解析器只负责 JSON → AbilityConfig 转换
- Action/Component/Condition/Cost 类**全部复用框架和 @inkmon/battle 现有实现**
- 不在项目层重新实现任何逻辑类

---

## 类型定义

```typescript
// lib/ability-tester/config/types.ts

// ========== 基础类型 ==========

export type TargetSelectorType =
  | 'eventTarget'    // 事件目标
  | 'self'           // 自己
  | 'allEnemies'     // 所有敌人
  | 'allAllies';     // 所有盟友

export type DamageType = 'physical' | 'magical' | 'true';

// ========== Action JSON 类型 ==========

export interface DamageActionJSON {
  type: 'Damage';
  target: TargetSelectorType;
  formula: string;
  damageType?: DamageType;
}

export interface HealActionJSON {
  type: 'Heal';
  target: TargetSelectorType;
  formula: string;
}

export interface ApplyBuffActionJSON {
  type: 'ApplyBuff';
  target: TargetSelectorType;
  buffConfigId: string;
  stacks?: number;
}

export interface StageCueActionJSON {
  type: 'StageCue';
  cueId: string;
  params?: Record<string, unknown>;
}

export interface AddTagActionJSON {
  type: 'AddTag';
  target: TargetSelectorType;
  tag: string;
  stacks?: number;
  duration?: number;
}

export interface RemoveTagActionJSON {
  type: 'RemoveTag';
  target: TargetSelectorType;
  tag: string;
  stacks?: number;
}

export type ActionJSON =
  | DamageActionJSON
  | HealActionJSON
  | ApplyBuffActionJSON
  | StageCueActionJSON
  | AddTagActionJSON
  | RemoveTagActionJSON;

// ========== Component JSON 类型 ==========

export interface TimeDurationComponentJSON {
  type: 'TimeDurationComponent';
  duration: number;
}

export interface StackComponentJSON {
  type: 'StackComponent';
  initialStacks?: number;
  maxStacks?: number;
  overflowPolicy?: 'cap' | 'refresh' | 'reject';
}

export interface StatModifierConfigJSON {
  attributeName: string;
  modifierType: 'AddBase' | 'MulBase' | 'AddFinal' | 'MulFinal';
  value: number;
}

export interface StatModifierComponentJSON {
  type: 'StatModifierComponent';
  modifiers: StatModifierConfigJSON[];
}

export interface TagComponentJSON {
  type: 'TagComponent';
  tags: Record<string, number>;
}

export type ComponentJSON =
  | TimeDurationComponentJSON
  | StackComponentJSON
  | StatModifierComponentJSON
  | TagComponentJSON;

// ========== Condition JSON 类型 ==========

export interface HasTagConditionJSON {
  type: 'HasTag';
  tag: string;
}

export interface NoTagConditionJSON {
  type: 'NoTag';
  tag: string;
}

export interface TagStacksConditionJSON {
  type: 'TagStacks';
  tag: string;
  minStacks: number;
}

export type ConditionJSON =
  | HasTagConditionJSON
  | NoTagConditionJSON
  | TagStacksConditionJSON;

// ========== Cost JSON 类型 ==========

export interface ConsumeTagCostJSON {
  type: 'ConsumeTag';
  tag: string;
  stacks?: number;
}

export interface AddTagCostJSON {
  type: 'AddTag';
  tag: string;
  stacks?: number;
  duration?: number;
}

export interface CooldownCostJSON {
  type: 'Cooldown';
  duration: number;
}

export type CostJSON =
  | ConsumeTagCostJSON
  | AddTagCostJSON
  | CooldownCostJSON;

// ========== ActiveUseComponent JSON 类型 ==========

export interface ActiveUseComponentJSON {
  type: 'ActiveUse';
  timelineId: string;
  tagActions: Record<string, ActionJSON[]>;
  conditions?: ConditionJSON[];
  costs?: CostJSON[];
}

// ========== AbilityConfig JSON 类型 ==========

export interface AbilityConfigJSON {
  configId: string;
  displayName?: string;
  description?: string;
  icon?: string;
  tags?: string[];
  activeUseComponents?: ActiveUseComponentJSON[];
  components?: ComponentJSON[];
}
```

---

## Zod Schema 定义

```typescript
// lib/ability-tester/config/schema.ts

import { z } from 'zod';

// ========== 基础 Schema ==========

const TargetSelectorSchema = z.enum([
  'eventTarget',
  'self',
  'allEnemies',
  'allAllies',
]);

const DamageTypeSchema = z.enum(['physical', 'magical', 'true']);

// ========== Action Schema ==========

const DamageActionSchema = z.object({
  type: z.literal('Damage'),
  target: TargetSelectorSchema,
  formula: z.string().min(1),
  damageType: DamageTypeSchema.optional(),
});

const HealActionSchema = z.object({
  type: z.literal('Heal'),
  target: TargetSelectorSchema,
  formula: z.string().min(1),
});

const ApplyBuffActionSchema = z.object({
  type: z.literal('ApplyBuff'),
  target: TargetSelectorSchema,
  buffConfigId: z.string().min(1),
  stacks: z.number().int().positive().optional(),
});

const StageCueActionSchema = z.object({
  type: z.literal('StageCue'),
  cueId: z.string().min(1),
  params: z.record(z.unknown()).optional(),
});

const AddTagActionSchema = z.object({
  type: z.literal('AddTag'),
  target: TargetSelectorSchema,
  tag: z.string().min(1),
  stacks: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
});

const RemoveTagActionSchema = z.object({
  type: z.literal('RemoveTag'),
  target: TargetSelectorSchema,
  tag: z.string().min(1),
  stacks: z.number().int().positive().optional(),
});

export const ActionSchema = z.discriminatedUnion('type', [
  DamageActionSchema,
  HealActionSchema,
  ApplyBuffActionSchema,
  StageCueActionSchema,
  AddTagActionSchema,
  RemoveTagActionSchema,
]);

// ========== Component Schema ==========

const TimeDurationComponentSchema = z.object({
  type: z.literal('TimeDurationComponent'),
  duration: z.number().positive(),
});

const StackComponentSchema = z.object({
  type: z.literal('StackComponent'),
  initialStacks: z.number().int().min(0).optional(),
  maxStacks: z.number().int().positive().optional(),
  overflowPolicy: z.enum(['cap', 'refresh', 'reject']).optional(),
});

const StatModifierConfigSchema = z.object({
  attributeName: z.string().min(1),
  modifierType: z.enum(['AddBase', 'MulBase', 'AddFinal', 'MulFinal']),
  value: z.number(),
});

const StatModifierComponentSchema = z.object({
  type: z.literal('StatModifierComponent'),
  modifiers: z.array(StatModifierConfigSchema).min(1),
});

const TagComponentSchema = z.object({
  type: z.literal('TagComponent'),
  tags: z.record(z.number().int().min(0)),
});

export const ComponentSchema = z.discriminatedUnion('type', [
  TimeDurationComponentSchema,
  StackComponentSchema,
  StatModifierComponentSchema,
  TagComponentSchema,
]);

// ========== Condition Schema ==========

const HasTagConditionSchema = z.object({
  type: z.literal('HasTag'),
  tag: z.string().min(1),
});

const NoTagConditionSchema = z.object({
  type: z.literal('NoTag'),
  tag: z.string().min(1),
});

const TagStacksConditionSchema = z.object({
  type: z.literal('TagStacks'),
  tag: z.string().min(1),
  minStacks: z.number().int().positive(),
});

export const ConditionSchema = z.discriminatedUnion('type', [
  HasTagConditionSchema,
  NoTagConditionSchema,
  TagStacksConditionSchema,
]);

// ========== Cost Schema ==========

const ConsumeTagCostSchema = z.object({
  type: z.literal('ConsumeTag'),
  tag: z.string().min(1),
  stacks: z.number().int().positive().optional(),
});

const AddTagCostSchema = z.object({
  type: z.literal('AddTag'),
  tag: z.string().min(1),
  stacks: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
});

const CooldownCostSchema = z.object({
  type: z.literal('Cooldown'),
  duration: z.number().positive(),
});

export const CostSchema = z.discriminatedUnion('type', [
  ConsumeTagCostSchema,
  AddTagCostSchema,
  CooldownCostSchema,
]);

// ========== ActiveUseComponent Schema ==========

export const ActiveUseComponentSchema = z.object({
  type: z.literal('ActiveUse'),
  timelineId: z.string().min(1),
  tagActions: z.record(z.array(ActionSchema)),
  conditions: z.array(ConditionSchema).optional(),
  costs: z.array(CostSchema).optional(),
});

// ========== AbilityConfigJSON Schema ==========

export const AbilityConfigJSONSchema = z.object({
  configId: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
  activeUseComponents: z.array(ActiveUseComponentSchema).optional(),
  components: z.array(ComponentSchema).optional(),
});

export type AbilityConfigJSON = z.infer<typeof AbilityConfigJSONSchema>;
```

---

## 解析器实现

```typescript
// lib/ability-tester/config/parser.ts

import type {
  AbilityConfigJSON,
  ActionJSON,
  ComponentJSON,
  ConditionJSON,
  CostJSON,
  ActiveUseComponentJSON,
} from './types';
import type { AbilityConfig, ComponentInput, IAbilityComponent } from '@lomo/logic-game-framework';
import {
  ActiveUseComponent,
  TimeDurationComponent,
  StackComponent,
  StatModifierComponent,
  TagComponent,
  ModifierType,
  HasTagCondition,
  NoTagCondition,
  TagStacksCondition,
  ConsumeTagCost,
  AddTagCost,
  type Condition,
  type Cost,
  type IAction,
} from '@lomo/logic-game-framework';
import { CooldownCost } from '@inkmon/battle';

// 复用 @inkmon/battle 的 Action 实现
import {
  DamageAction,
  HealAction,
  StageCueAction,
  ApplyBuffAction,
  AddTagAction,
  RemoveTagAction,
} from '@inkmon/battle';

// ========== ModifierType 映射 ==========

const MODIFIER_TYPE_MAP: Record<string, ModifierType> = {
  'AddBase': ModifierType.AddBase,
  'MulBase': ModifierType.MulBase,
  'AddFinal': ModifierType.AddFinal,
  'MulFinal': ModifierType.MulFinal,
};

// ========== Action 解析器 ==========

export function parseAction(json: ActionJSON): IAction {
  switch (json.type) {
    case 'Damage':
      return new DamageAction({
        target: json.target,
        formula: json.formula,
        damageType: json.damageType,
      });

    case 'Heal':
      return new HealAction({
        target: json.target,
        formula: json.formula,
      });

    case 'ApplyBuff':
      return new ApplyBuffAction({
        target: json.target,
        buffConfigId: json.buffConfigId,
        stacks: json.stacks,
      });

    case 'StageCue':
      return new StageCueAction({
        cueId: json.cueId,
        params: json.params,
      });

    case 'AddTag':
      return new AddTagAction({
        target: json.target,
        tag: json.tag,
        stacks: json.stacks,
        duration: json.duration,
      });

    case 'RemoveTag':
      return new RemoveTagAction({
        target: json.target,
        tag: json.tag,
        stacks: json.stacks,
      });

    default:
      throw new Error(`Unknown action type: ${(json as ActionJSON).type}`);
  }
}

// ========== TagActions 解析器 ==========

export function parseTagActions(
  tagActionsJson: Record<string, ActionJSON[]>
): Record<string, IAction[]> {
  const result: Record<string, IAction[]> = {};
  for (const [tag, actions] of Object.entries(tagActionsJson)) {
    result[tag] = actions.map(parseAction);
  }
  return result;
}

// ========== Component 解析器 ==========

export function parseComponent(json: ComponentJSON): ComponentInput<IAbilityComponent> {
  switch (json.type) {
    case 'TimeDurationComponent':
      return () => new TimeDurationComponent(json.duration);

    case 'StackComponent':
      return () => new StackComponent(
        json.initialStacks ?? 1,
        json.maxStacks ?? 1,
        json.overflowPolicy ?? 'cap'
      );

    case 'StatModifierComponent':
      return () => new StatModifierComponent(
        json.modifiers.map(m => ({
          attributeName: m.attributeName,
          modifierType: MODIFIER_TYPE_MAP[m.modifierType],
          value: m.value,
        }))
      );

    case 'TagComponent':
      return () => new TagComponent({ tags: json.tags });

    default:
      throw new Error(`Unknown component type: ${(json as ComponentJSON).type}`);
  }
}

// ========== Condition 解析器 ==========

export function parseCondition(json: ConditionJSON): Condition {
  switch (json.type) {
    case 'HasTag':
      return new HasTagCondition(json.tag);

    case 'NoTag':
      return new NoTagCondition(json.tag);

    case 'TagStacks':
      return new TagStacksCondition(json.tag, json.minStacks);

    default:
      throw new Error(`Unknown condition type: ${(json as ConditionJSON).type}`);
  }
}

// ========== Cost 解析器 ==========

export function parseCost(json: CostJSON): Cost {
  switch (json.type) {
    case 'ConsumeTag':
      return new ConsumeTagCost(json.tag, json.stacks ?? 1);

    case 'AddTag':
      return new AddTagCost(json.tag, {
        stacks: json.stacks,
        duration: json.duration,
      });

    case 'Cooldown':
      return new CooldownCost(json.duration);

    default:
      throw new Error(`Unknown cost type: ${(json as CostJSON).type}`);
  }
}

// ========== ActiveUseComponent 解析器 ==========

export function parseActiveUseComponent(
  json: ActiveUseComponentJSON
): ComponentInput<ActiveUseComponent> {
  return () => new ActiveUseComponent({
    timelineId: json.timelineId,
    tagActions: parseTagActions(json.tagActions),
    conditions: json.conditions?.map(parseCondition),
    costs: json.costs?.map(parseCost),
  });
}

// ========== AbilityConfig 解析器 ==========

export function parseAbilityConfig(json: AbilityConfigJSON): AbilityConfig {
  return {
    configId: json.configId,
    displayName: json.displayName,
    description: json.description,
    icon: json.icon,
    tags: json.tags,
    activeUseComponents: json.activeUseComponents?.map(parseActiveUseComponent),
    components: json.components?.map(parseComponent),
  };
}

// ========== 验证并解析 ==========

import { AbilityConfigJSONSchema } from './schema';

export function validateAndParse(input: unknown): {
  success: true;
  config: AbilityConfig;
  json: AbilityConfigJSON;
} | {
  success: false;
  errors: Array<{ path: string; message: string }>;
} {
  // 如果是字符串，先解析
  let jsonObj: unknown;
  if (typeof input === 'string') {
    try {
      jsonObj = JSON.parse(input);
    } catch (e) {
      return {
        success: false,
        errors: [{ path: '', message: `JSON 解析错误: ${(e as Error).message}` }],
      };
    }
  } else {
    jsonObj = input;
  }

  // Zod 验证
  const result = AbilityConfigJSONSchema.safeParse(jsonObj);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    };
  }

  // 解析为框架类型
  try {
    const config = parseAbilityConfig(result.data);
    return {
      success: true,
      config,
      json: result.data,
    };
  } catch (e) {
    return {
      success: false,
      errors: [{ path: '', message: `解析错误: ${(e as Error).message}` }],
    };
  }
}
```

---

## 使用示例

```typescript
import { validateAndParse } from '@/lib/ability-tester/config/parser';
import { Ability } from '@lomo/logic-game-framework';

const jsonConfig = {
  configId: 'skill_fireball',
  displayName: '火球术',
  activeUseComponents: [{
    type: 'ActiveUse',
    timelineId: 'timeline_aoe',
    tagActions: {
      cast: [{ type: 'StageCue', cueId: 'cast_magic' }],
      impact: [
        { type: 'Damage', target: 'allEnemies', formula: 'source.atk * 1.5', damageType: 'magical' },
        { type: 'StageCue', cueId: 'explosion' },
      ],
    },
  }],
};

const result = validateAndParse(jsonConfig);

if (result.success) {
  // 创建 Ability 实例
  const ability = new Ability(result.config, ownerRef);
  abilitySet.grantAbility(ability);
} else {
  console.error('Validation errors:', result.errors);
}
```

---

## 文件结构

```
inkmon-pokedex/
└── lib/
    └── ability-tester/
        └── config/
            ├── index.ts      # 导出
            ├── types.ts      # JSON 类型定义
            ├── schema.ts     # Zod Schema
            └── parser.ts     # 解析器（复用现有 Action 类）
```

---

## 验收标准

- [ ] JSON 类型定义完整
- [ ] Zod Schema 正确验证
- [ ] 解析器正确调用框架和 @inkmon/battle 的类
- [ ] 验证错误信息清晰
- [ ] 与框架 AbilityConfig 兼容

---

## 下一步

完成配置解析层后，进入 [Phase1_SkillTestRunner.md](./Phase1_SkillTestRunner.md) 实现技能测试运行器。
