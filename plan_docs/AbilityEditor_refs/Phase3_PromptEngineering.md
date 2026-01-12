# Phase 3: Prompt 工程方案

## 概述

设计高质量的 Prompt 模板，确保 LLM 能够准确生成符合 Schema 的 AbilityConfig。

## 目标

- 提供完整的 Schema 上下文
- Few-shot 示例提高生成质量
- 模块化 Prompt 便于维护
- 支持动态内容注入

---

## 前置依赖

- [Phase0_ConfigParser.md](./Phase0_ConfigParser.md) - JSON 配置类型和 Schema 定义
- [Phase3_LLMIntegration.md](./Phase3_LLMIntegration.md) - LLM Provider 实现

**重要**：
- Prompt 中的类型名称必须与 Phase 0 一致（如 `TimeDurationComponent` 而非 `Duration`）
- 使用 `timelineId` + `tagActions` 结构，而非嵌套的 `timeline: { id, tags }` 结构

---

## Prompt 结构设计

```
┌─────────────────────────────────────────────────────────────────┐
│  Prompt 组成                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. System Message (角色定义)                                   │
│     └─────────────────────────────────────────────────────┐    │
│     │ 你是一个游戏技能配置生成器...                        │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  2. Schema 定义 (数据结构)                                      │
│     └─────────────────────────────────────────────────────┐    │
│     │ AbilityConfig JSON Schema...                        │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  3. Component 说明 (可用的组件)                                 │
│     └─────────────────────────────────────────────────────┐    │
│     │ - Duration: 持续时间...                              │    │
│     │ - StatModifier: 属性修改...                          │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  4. Action 说明 (可用的动作)                                   │
│     └─────────────────────────────────────────────────────┐    │
│     │ - Damage: 造成伤害...                                │    │
│     │ - Heal: 治疗...                                      │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  5. 可用 Timeline (时间轴)                                     │
│     └─────────────────────────────────────────────────────┐    │
│     │ - timeline_basic_attack: 500ms...                    │    │
│     │ - timeline_aoe: 800ms...                             │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  6. Few-shot 示例 (参考案例)                                   │
│     └─────────────────────────────────────────────────────┐    │
│     │ 示例 1: 普通攻击                                     │    │
│     │ 示例 2: AOE 伤害                                     │    │
│     │ 示例 3: 治疗技能                                     │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  7. 用户输入 (自然语言描述)                                    │
│     └─────────────────────────────────────────────────────┐    │
│     │ "一个造成 100 点物理伤害的攻击技能"                  │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  8. 输出要求                                                    │
│     └─────────────────────────────────────────────────────┐    │
│     │ 请严格按照上述 Schema 生成 JSON 格式的 AbilityConfig  │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PromptBuilder 实现

```typescript
// lib/ability-tester/llm/PromptBuilder.ts

import type { LLMMessage } from './types';
import { abilityConfigSchema } from '../schema/abilityConfigSchema';
import { componentDescriptions } from './componentDescriptions';
import { actionDescriptions } from './actionDescriptions';
import { timelineDescriptions } from './timelineDescriptions';
import { fewShotExamples } from './fewShotExamples';

/**
 * Prompt 构建选项
 */
export interface PromptBuilderOptions {
  /**
   * 用户自然语言输入
   */
  userInput: string;

  /**
   * 是否包含示例
   */
  includeExamples?: boolean;

  /**
   * 示例数量
   */
  exampleCount?: number;

  /**
   * 自定义 System Message
   */
  customSystemMessage?: string;
}

/**
 * Prompt Builder
 */
export class PromptBuilder {
  /**
   * 构建完整的 Prompt 消息列表
   */
  buildMessages(options: PromptBuilderOptions): LLMMessage[] {
    const messages: LLMMessage[] = [];

    // 1. System Message
    messages.push({
      role: 'system',
      content: options.customSystemMessage ?? this.getDefaultSystemMessage(),
    });

    // 2. Schema 定义
    messages.push({
      role: 'user',
      content: this.getSchemaSection(),
    });

    // 3. Component 说明
    messages.push({
      role: 'user',
      content: this.getComponentSection(),
    });

    // 4. Action 说明
    messages.push({
      role: 'user',
      content: this.getActionSection(),
    });

    // 5. Timeline 说明
    messages.push({
      role: 'user',
      content: this.getTimelineSection(),
    });

    // 6. Few-shot 示例 (可选)
    if (options.includeExamples !== false) {
      const examples = this.getExamplesSection(options.exampleCount ?? 3);
      messages.push({
        role: 'user',
        content: examples,
      });
    }

    // 7. 用户输入
    messages.push({
      role: 'user',
      content: this.getUserInputSection(options.userInput),
    });

    // 8. 输出要求
    messages.push({
      role: 'user',
      content: this.getOutputRequirement(),
    });

    return messages;
  }

  /**
   * 默认 System Message
   */
  private getDefaultSystemMessage(): string {
    return `你是一个专业的游戏技能配置生成器。你的任务是根据用户的自然语言描述，生成符合特定 Schema 的 AbilityConfig JSON 对象。

你需要：
1. 仔细理解用户的需求
2. 严格按照提供的 Schema 生成配置
3. 确保生成的 JSON 格式正确且可以被解析
4. 合理选择 Component 和 Action 类型
5. 设置合理的数值参数

只返回 JSON 对象，不要包含任何额外的解释文字。`;
  }

  /**
   * Schema 定义部分
   */
  private getSchemaSection(): string {
    return `## AbilityConfig Schema

请严格按照以下 TypeScript 类型定义生成配置：

\`\`\`typescript
interface AbilityConfig {
  configId: string;           // 配置 ID（唯一标识符，使用 snake_case）
  displayName?: string;        // 显示名称
  description?: string;        // 技能描述
  icon?: string;              // 图标路径
  tags?: string[];            // 标签列表
  activeUseComponents?: Array<{  // 主动使用组件
    type: 'ActiveUse';
    conditions?: Array<{ type: string; params?: Record<string, unknown> }>;
    costs?: Array<{ type: string; amount: number }>;
    timeline: {
      id: string;             // Timeline ID
      tags: Record<string, Array<{  // Tag -> Actions 映射
        type: string;
        [key: string]: unknown;
      }>>;
    };
  }>;
  components?: Array<{        // 效果组件
    type: string;
    [key: string]: unknown;
  }>;
}
\`\`\``;
  }

  /**
   * Component 说明部分
   */
  private getComponentSection(): string {
    const sections = Object.entries(componentDescriptions).map(
      ([type, desc]) => `
### ${type}

${desc.description}

**字段：**
${desc.fields.map(f => `- \`${f.name}\` (${f.type}): ${f.description}`).join('\n')}

**示例：**
\`\`\`json
${JSON.stringify(desc.example, null, 2)}
\`\`\`
`
    );

    return `## 可用的 Component 类型

${sections.join('\n---\n')}`;
  }

  /**
   * Action 说明部分
   */
  private getActionSection(): string {
    const sections = Object.entries(actionDescriptions).map(
      ([type, desc]) => `
### ${type}

${desc.description}

**字段：**
${desc.fields.map(f => `- \`${f.name}\` (${f.type}): ${f.description}`).join('\n')}

**示例：**
\`\`\`json
${JSON.stringify(desc.example, null, 2)}
\`\`\`
`
    );

    return `## 可用的 Action 类型

${sections.join('\n---\n')}`;
  }

  /**
   * Timeline 说明部分
   */
  private getTimelineSection(): string {
    const lines = Object.entries(timelineDescriptions).map(
      ([id, desc]) => `- \`${id}\`: ${desc.duration}ms - ${desc.description}\n  Tags: ${Object.keys(desc.tags).join(', ')}`
    );

    return `## 可用的 Timeline

${lines.join('\n')}`;
  }

  /**
   * Few-shot 示例部分
   */
  private getExamplesSection(count: number): string {
    const selectedExamples = fewShotExamples.slice(0, count);

    const sections = selectedExamples.map((example, index) => {
      return `
### 示例 ${index + 1}: ${example.title}

**用户描述：**
> ${example.userInput}

**生成的配置：**
\`\`\`json
${JSON.stringify(example.config, null, 2)}
\`\`\`
`;
    });

    return `## 参考示例

${sections.join('\n---\n')}`;
  }

  /**
   * 用户输入部分
   */
  private getUserInputSection(userInput: string): string {
    return `## 用户需求

请根据以下描述生成技能配置：

> ${userInput}`;
  }

  /**
   * 输出要求部分
   */
  private getOutputRequirement(): string {
    return `## 输出要求

1. 只输出 JSON 对象，不要包含任何额外的文字说明
2. 确保 JSON 格式正确，可以被 JSON.parse() 解析
3. configId 必须是唯一的 snake_case 格式
4. 数值参数要合理（不要过大或过小）
5. 如果用户没有明确指定的参数，使用合理的默认值

现在请生成 AbilityConfig JSON：`;
  }
}

// 单例
export const promptBuilder = new PromptBuilder();
```

---

## Component 描述定义

```typescript
// lib/ability-tester/llm/componentDescriptions.ts

import type { ComponentData } from '../schema/abilityConfigSchema';

export interface ComponentDescription {
  description: string;
  fields: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
  example: ComponentData;
}

export const componentDescriptions: Record<string, ComponentDescription> = {
  Duration: {
    description: '设置 Ability 的持续时间（毫秒）。',
    fields: [
      {
        name: 'time',
        type: 'number',
        description: '持续时间，单位毫秒。通常：即时效果 100-500，短期效果 5000-10000，长期效果 15000-30000',
        required: true,
      },
    ],
    example: { type: 'Duration', time: 10000 },
  },

  Stack: {
    description: '设置 Ability 的最大层数和初始层数。用于可叠加的效果。',
    fields: [
      {
        name: 'maxStacks',
        type: 'number',
        description: '最大层数。通常：1-10 层',
        required: true,
      },
      {
        name: 'initialStacks',
        type: 'number',
        description: '初始层数。默认为 0 或 1',
        required: false,
      },
    ],
    example: { type: 'Stack', maxStacks: 5, initialStacks: 1 },
  },

  StatModifier: {
    description: '修改目标的属性值。支持四层修改：addBase（加法基础）、mulBase（乘法基础）、addFinal（加法最终）、mulFinal（乘法最终）。',
    fields: [
      {
        name: 'attribute',
        type: 'string',
        description: '属性名。可选：hp（生命值）、atk（攻击力）、def（防御力）、spd（速度）',
        required: true,
      },
      {
        name: 'layer',
        type: 'string',
        description: '修改层。addBase：加到基础值；mulBase：乘以基础值；addFinal：加到最终值；mulFinal：乘以最终值',
        required: true,
      },
      {
        name: 'value',
        type: 'number',
        description: '修改值。加法层使用绝对值（如 +50），乘法层使用小数（如 0.5 表示 +50%）',
        required: true,
      },
    ],
    example: { type: 'StatModifier', attribute: 'atk', layer: 'mulBase', value: 0.5 },
  },

  Tag: {
    description: '为目标添加标签，用于标记特殊状态。',
    fields: [
      {
        name: 'tagId',
        type: 'string',
        description: '标签 ID。使用 snake_case 格式，如：burning、frozen、poisoned',
        required: true,
      },
      {
        name: 'initialStacks',
        type: 'number',
        description: '初始层数，默认为 1',
        required: false,
      },
    ],
    example: { type: 'Tag', tagId: 'burning', initialStacks: 1 },
  },
};
```

---

## Action 描述定义

```typescript
// lib/ability-tester/llm/actionDescriptions.ts

import type { ActionData } from '../schema/abilityConfigSchema';

export interface ActionDescription {
  description: string;
  fields: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
  example: ActionData;
}

export const actionDescriptions: Record<string, ActionDescription> = {
  Damage: {
    description: '对目标造成伤害。可以指定伤害类型（物理、魔法、真实伤害）。',
    fields: [
      {
        name: 'target',
        type: 'string',
        description: '目标选择。eventTarget：事件目标；self：自己；allEnemies：所有敌人',
        required: true,
      },
      {
        name: 'formula',
        type: 'string',
        description: '伤害公式。支持：source.atk（攻击力）、source.def（防御力）、target.hp（目标生命值）等。例如："source.atk * 1.5" 表示 1.5 倍攻击力',
        required: true,
      },
      {
        name: 'damageType',
        type: 'string',
        description: '伤害类型。physical：物理（会被防御减免）；magical：魔法（会被魔抗减免）；true：真实伤害（无视防御）',
        required: false,
      },
    ],
    example: {
      type: 'Damage',
      target: 'eventTarget',
      formula: 'source.atk * 1.2',
      damageType: 'physical',
    },
  },

  Heal: {
    description: '恢复目标的生命值。',
    fields: [
      {
        name: 'target',
        type: 'string',
        description: '目标选择。eventTarget：事件目标；self：自己；allAllies：所有盟友',
        required: true,
      },
      {
        name: 'formula',
        type: 'string',
        description: '治疗公式。例如："source.maxHp * 0.3" 表示恢复 30% 最大生命值',
        required: true,
      },
    ],
    example: {
      type: 'Heal',
      target: 'self',
      formula: 'source.maxHp * 0.2',
    },
  },

  ApplyBuff: {
    description: '为目标施加 Buff 效果。',
    fields: [
      {
        name: 'target',
        type: 'string',
        description: '目标选择。eventTarget：事件目标；self：自己',
        required: true,
      },
      {
        name: 'buffConfigId',
        type: 'string',
        description: 'Buff 配置 ID。必须是已存在的 AbilityConfig 的 configId',
        required: true,
      },
    ],
    example: {
      type: 'ApplyBuff',
      target: 'eventTarget',
      buffConfigId: 'buff_attack_up',
    },
  },

  StageCue: {
    description: '触发舞台提示，用于播放视觉效果（动画、特效等）。',
    fields: [
      {
        name: 'cueId',
        type: 'string',
        description: '舞台提示 ID。例如：melee_slash（近战挥砍）、cast_magic（魔法咏唱）、explosion（爆炸）、heal_sparkle（治疗闪光）',
        required: true,
      },
      {
        name: 'params',
        type: 'object',
        description: '额外参数，可选。例如：{"color": "red"} 用于指定特效颜色',
        required: false,
      },
    ],
    example: {
      type: 'StageCue',
      cueId: 'melee_slash',
    },
  },
};
```

---

## Timeline 描述定义

```typescript
// lib/ability-tester/llm/timelineDescriptions.ts

export interface TimelineDescription {
  duration: number;
  description: string;
  tags: Record<string, number>;
}

export const timelineDescriptions: Record<string, TimelineDescription> = {
  timeline_basic_attack: {
    duration: 500,
    description: '基础攻击时间轴，适用于普通攻击',
    tags: {
      start: 0,
      impact: 250,
      complete: 500,
    },
  },

  timeline_quick_attack: {
    duration: 300,
    description: '快速攻击时间轴，适用于快速连击',
    tags: {
      start: 0,
      impact: 150,
      complete: 300,
    },
  },

  timeline_heavy_attack: {
    duration: 1000,
    description: '重击时间轴，适用于强力单次攻击',
    tags: {
      start: 0,
      windup: 400,
      impact: 600,
      recover: 1000,
    },
  },

  timeline_aoe: {
    duration: 800,
    description: 'AOE 攻击时间轴，适用于范围伤害技能',
    tags: {
      start: 0,
      cast: 200,
      impact: 500,
      complete: 800,
    },
  },

  timeline_instant: {
    duration: 100,
    description: '即时效果时间轴，适用于 Buff、治疗等',
    tags: {
      start: 0,
      apply: 0,
      complete: 100,
    },
  },

  timeline_dot: {
    duration: 3000,
    description: '持续伤害时间轴，适用于 DoT 效果',
    tags: {
      start: 0,
      tick_1: 1000,
      tick_2: 2000,
      tick_3: 3000,
    },
  },

  timeline_channel: {
    duration: 2000,
    description: '引导时间轴，适用于需要持续引导的技能',
    tags: {
      start: 0,
      channel_tick_1: 500,
      channel_tick_2: 1000,
      channel_tick_3: 1500,
      complete: 2000,
    },
  },
};
```

---

## Few-shot 示例定义

```typescript
// lib/ability-tester/llm/fewShotExamples.ts

import type { AbilityConfig } from '../schema/abilityConfigSchema';

export interface FewShotExample {
  title: string;
  userInput: string;
  config: AbilityConfig;
}

export const fewShotExamples: FewShotExample[] = [
  {
    title: '普通攻击',
    userInput: '一个普通攻击技能，对单个敌人造成 100 点物理伤害',
    config: {
      configId: 'skill_basic_attack',
      displayName: '普通攻击',
      description: '对单个目标造成物理伤害',
      tags: ['attack', 'physical', 'single_target'],
      activeUseComponents: [
        {
          type: 'ActiveUse',
          timeline: {
            id: 'timeline_basic_attack',
            tags: {
              impact: [
                {
                  type: 'Damage',
                  target: 'eventTarget',
                  formula: '100',
                  damageType: 'physical',
                },
                {
                  type: 'StageCue',
                  cueId: 'melee_slash',
                },
              ],
            },
          },
        },
      ],
    },
  },

  {
    title: 'AOE 伤害技能',
    userInput: '一个火球术，对所有敌人造成 150 点魔法伤害，有施法动作',
    config: {
      configId: 'skill_fireball',
      displayName: '火球术',
      description: '释放火球对所有敌人造成魔法伤害',
      tags: ['magic', 'aoe', 'fire'],
      activeUseComponents: [
        {
          type: 'ActiveUse',
          timeline: {
            id: 'timeline_aoe',
            tags: {
              cast: [
                {
                  type: 'StageCue',
                  cueId: 'cast_magic',
                  params: { color: 'orange' },
                },
              ],
              impact: [
                {
                  type: 'Damage',
                  target: 'allEnemies',
                  formula: '150',
                  damageType: 'magical',
                },
                {
                  type: 'StageCue',
                  cueId: 'explosion',
                  params: { color: 'orange', size: 'large' },
                },
              ],
            },
          },
        },
      ],
    },
  },

  {
    title: '自我治疗技能',
    userInput: '一个治疗术，恢复自己 20% 最大生命值',
    config: {
      configId: 'skill_heal_self',
      displayName: '治疗术',
      description: '恢复自身生命值',
      tags: ['heal', 'self'],
      activeUseComponents: [
        {
          type: 'ActiveUse',
          timeline: {
            id: 'timeline_instant',
            tags: {
              apply: [
                {
                  type: 'Heal',
                  target: 'self',
                  formula: 'source.maxHp * 0.2',
                },
                {
                  type: 'StageCue',
                  cueId: 'heal_sparkle',
                  params: { color: 'green' },
                },
              ],
            },
          },
        },
      ],
    },
  },

  {
    title: '攻击力 Buff',
    userInput: '一个持续 10 秒的 Buff，提升攻击力 50%',
    config: {
      configId: 'buff_attack_up',
      displayName: '攻击力提升',
      description: '提升攻击力 50%，持续 10 秒',
      tags: ['buff', 'attack'],
      components: [
        {
          type: 'Duration',
          time: 10000,
        },
        {
          type: 'StatModifier',
          attribute: 'atk',
          layer: 'mulBase',
          value: 0.5,
        },
      ],
    },
  },

  {
    title: '重击技能',
    userInput: '一个蓄力重击，造成 2 倍攻击力的物理伤害',
    config: {
      configId: 'skill_power_strike',
      displayName: '蓄力重击',
      description: '蓄力后造成强力一击',
      tags: ['attack', 'physical', 'heavy'],
      activeUseComponents: [
        {
          type: 'ActiveUse',
          timeline: {
            id: 'timeline_heavy_attack',
            tags: {
              impact: [
                {
                  type: 'Damage',
                  target: 'eventTarget',
                  formula: 'source.atk * 2.0',
                  damageType: 'physical',
                },
                {
                  type: 'StageCue',
                  cueId: 'melee_slash',
                  params: { intensity: 'heavy' },
                },
              ],
            },
          },
        },
      ],
    },
  },

  {
    title: '燃烧 DoT',
    userInput: '一个燃烧效果，持续 3 秒，每秒造成 20 点伤害',
    config: {
      configId: 'debuff_burning',
      displayName: '燃烧',
      description: '持续受到火焰伤害',
      tags: ['dot', 'fire', 'debuff'],
      components: [
        {
          type: 'Duration',
          time: 3000,
        },
        {
          type: 'Tag',
          tagId: 'burning',
        },
      ],
      activeUseComponents: [
        {
          type: 'ActiveUse',
          timeline: {
            id: 'timeline_dot',
            tags: {
              tick_1: [
                {
                  type: 'Damage',
                  target: 'self',
                  formula: '20',
                  damageType: 'true',
                },
              ],
              tick_2: [
                {
                  type: 'Damage',
                  target: 'self',
                  formula: '20',
                  damageType: 'true',
                },
              ],
              tick_3: [
                {
                  type: 'Damage',
                  target: 'self',
                  formula: '20',
                  damageType: 'true',
                },
              ],
            },
          },
        },
      ],
    },
  },
];
```

---

## 使用示例

```typescript
// 在 NaturalLanguageInput 组件中使用

import { promptBuilder } from '@/lib/ability-tester/llm/PromptBuilder';
import { llmService } from '@/lib/ability-tester/llm/LLMService';

async function generateAbility(userInput: string, providerType: LLMProvider) {
  // 1. 设置 Provider
  const provider = llmService.createProvider(providerType);
  llmService.setProvider(provider);

  // 2. 构建 Prompt
  const messages = promptBuilder.buildMessages({
    userInput,
    includeExamples: true,
    exampleCount: 3,
  });

  // 3. 调用 LLM
  const response = await llmService.generate(messages);

  // 4. 解析结果
  const config = JSON.parse(response);

  return config;
}
```

---

## 优化技巧

### 1. 温度调整

- **生成新技能**: temperature = 0.7 (创造力与准确性的平衡)
- **修改现有技能**: temperature = 0.3 (更保守，保持原有结构)

### 2. 示例选择

根据用户输入选择最相关的示例：
```typescript
const relevantExamples = selectRelevantExamples(userInput, fewShotExamples, 3);
```

### 3. 动态 Schema

根据用户意图只显示相关的 Component/Action 类型：
```typescript
const relevantActions = filterActionsByIntent(userInput, actionDescriptions);
```

### 4. 迭代优化

如果第一次生成失败，可以根据错误信息调整 Prompt 重试：
```typescript
if (validationError) {
  const correctedPrompt = promptBuilder.buildMessages({
    ...options,
    correctionHint: validationError.message,
  });
}
```

---

## 文件结构

```
inkmon-pokedex/
└── lib/
    └── ability-tester/
        └── llm/
            ├── PromptBuilder.ts
            ├── componentDescriptions.ts
            ├── actionDescriptions.ts
            ├── timelineDescriptions.ts
            └── fewShotExamples.ts
```

---

## 验收标准

- [ ] PromptBuilder 正确生成消息列表
- [ ] Component/Action/Timeline 描述完整准确
- [ ] Few-shot 示例覆盖常见场景
- [ ] 生成的 Prompt 易于 LLM 理解
- [ ] 生成结果符合 Schema
- [ ] 支持动态调整 Prompt 内容

---

## 下一步

完成 Prompt 工程后，进入 [Phase3_GenerationWorkflow.md](./Phase3_GenerationWorkflow.md) 实现生成→验证→修正循环。
