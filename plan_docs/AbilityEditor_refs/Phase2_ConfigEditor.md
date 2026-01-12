# Phase 2: AbilityConfig JSON 编辑器方案

## 概述

提供一个功能完善的 JSON 编辑器，支持 AbilityConfig 的编辑、验证和实时预览。

## 目标

- 集成 Monaco Editor 提供专业的编辑体验
- JSON Schema 验证确保配置正确性
- 实时错误提示和自动补全
- 与测试场景联动

---

## 前置依赖

- [Phase0_ConfigParser.md](./Phase0_ConfigParser.md) - JSON 配置类型和 Schema 定义

**重要**：本文档使用 Phase 0 中定义的类型和 Schema，确保一致性。

---

## 技术选型

### Monaco Editor

选择 Monaco Editor 的原因：
- VS Code 同款编辑器，用户熟悉
- 原生支持 JSON Schema 验证
- 支持自动补全、语法高亮、错误提示
- React 集成成熟（`@monaco-editor/react`）

### 依赖

```json
{
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",
    "monaco-editor": "^0.45.0",
    "zod-to-json-schema": "^3.22.0"
  }
}
```

---

## Schema 生成

### 从 Zod 自动生成 JSON Schema

使用 `zod-to-json-schema` 从 Phase 0 的 Zod Schema 自动生成 JSON Schema：

```typescript
// lib/ability-tester/config/jsonSchema.ts

import { zodToJsonSchema } from 'zod-to-json-schema';
import { AbilityConfigJSONSchema } from './schema';

/**
 * 自动生成的 JSON Schema（供 Monaco Editor 使用）
 */
export const abilityConfigJsonSchema = zodToJsonSchema(AbilityConfigJSONSchema, {
  name: 'AbilityConfigJSON',
  definitions: {
    // 自动从 Zod Schema 推导
  },
});

/**
 * 带描述信息的增强版 JSON Schema
 */
export const abilityConfigJsonSchemaEnhanced = {
  ...abilityConfigJsonSchema,
  title: 'AbilityConfig',
  description: '技能配置 JSON 格式',
  // 添加额外的描述信息
  properties: {
    ...(abilityConfigJsonSchema as any).properties,
    configId: {
      type: 'string',
      minLength: 1,
      description: '配置 ID（唯一标识，使用 snake_case 格式）',
      pattern: '^[a-z][a-z0-9_]*$',
    },
    displayName: {
      type: 'string',
      description: '显示名称（用于 UI 展示）',
    },
    description: {
      type: 'string',
      description: '技能描述文本',
    },
  },
};
```

---

## 组件设计

### ConfigEditor 组件

```typescript
// components/ability-editor/ConfigEditor.tsx

import { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { OnMount, OnChange, BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

import { abilityConfigJsonSchemaEnhanced } from '@/lib/ability-tester/config/jsonSchema';
import { validateAndParse } from '@/lib/ability-tester/config/parser';
import type { AbilityConfigJSON } from '@/lib/ability-tester/config/types';
import type { AbilityConfig } from '@lomo/logic-game-framework';

import styles from './ConfigEditor.module.css';

// ========== 类型定义 ==========

export interface ConfigEditorProps {
  /** 当前配置值（JSON 字符串） */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 验证错误回调 */
  onValidationError?: (errors: ValidationError[]) => void;
  /** 验证通过回调（返回解析后的框架 AbilityConfig） */
  onValidationSuccess?: (config: AbilityConfig, json: AbilityConfigJSON) => void;
  /** 高度 */
  height?: string | number;
  /** 是否只读 */
  readOnly?: boolean;
  /** 主题 */
  theme?: 'vs-dark' | 'light';
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

// ========== 组件实现 ==========

export function ConfigEditor({
  value,
  onChange,
  onValidationError,
  onValidationSuccess,
  height = '400px',
  readOnly = false,
  theme = 'vs-dark',
}: ConfigEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const [isValid, setIsValid] = useState(true);

  // ========== 编辑器初始化配置 ==========

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    // 配置 JSON Schema（在挂载前）
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'http://ability-config-schema.json',
          fileMatch: ['*'],
          schema: abilityConfigJsonSchemaEnhanced as any,
        },
      ],
      enableSchemaRequest: false,
      allowComments: false,
      trailingCommas: 'error',
    });
  }, []);

  // ========== 编辑器挂载 ==========

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 配置编辑器选项
    editor.updateOptions({
      minimap: { enabled: false },
      lineNumbers: 'on',
      folding: true,
      foldingStrategy: 'indentation',
      formatOnPaste: true,
      formatOnType: true,
      tabSize: 2,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
    });

    // 添加快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Ctrl+S 触发保存（可以在父组件处理）
      editor.trigger('keyboard', 'editor.action.formatDocument', null);
    });
  }, []);

  // ========== 值变化处理 ==========

  const handleChange: OnChange = useCallback(
    (newValue) => {
      if (newValue === undefined) return;

      onChange(newValue);

      // 使用 Phase 0 的 validateAndParse 进行验证
      const result = validateAndParse(newValue);

      if (result.success) {
        setIsValid(true);
        onValidationSuccess?.(result.config, result.json);
        onValidationError?.([]);
      } else {
        setIsValid(false);
        const errors: ValidationError[] = result.errors.map((err) => ({
          path: err.path || 'root',
          message: err.message,
          severity: 'error',
        }));
        onValidationError?.(errors);
      }
    },
    [onChange, onValidationError, onValidationSuccess]
  );

  // ========== 公共方法 ==========

  const formatDocument = useCallback(() => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run();
  }, []);

  const insertSnippet = useCallback((snippet: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (selection) {
      editor.executeEdits('snippet', [
        {
          range: selection,
          text: snippet,
        },
      ]);
    }
  }, []);

  // ========== 渲染 ==========

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          className={styles.toolbarButton}
          onClick={formatDocument}
          title="格式化 (Ctrl+Shift+F)"
        >
          📝 格式化
        </button>
        <div className={styles.status}>
          {isValid ? (
            <span className={styles.statusValid}>✓ 有效</span>
          ) : (
            <span className={styles.statusInvalid}>✗ 有错误</span>
          )}
        </div>
      </div>
      <Editor
        height={height}
        language="json"
        theme={theme}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        beforeMount={handleBeforeMount}
        options={{
          readOnly,
        }}
        loading={<div className={styles.loading}>加载编辑器...</div>}
      />
    </div>
  );
}
```

---

## 验证面板组件

```typescript
// components/ability-editor/ValidationPanel.tsx

import type { ValidationError } from './ConfigEditor';
import styles from './ValidationPanel.module.css';

export interface ValidationPanelProps {
  errors: ValidationError[];
  onErrorClick?: (error: ValidationError) => void;
}

export function ValidationPanel({ errors, onErrorClick }: ValidationPanelProps) {
  if (errors.length === 0) {
    return (
      <div className={`${styles.panel} ${styles.success}`}>
        <span className={styles.icon}>✓</span>
        <span>配置有效</span>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${styles.error}`}>
      <div className={styles.header}>
        <span className={styles.icon}>✗</span>
        <span>{errors.length} 个错误</span>
      </div>
      <ul className={styles.list}>
        {errors.map((error, index) => (
          <li
            key={index}
            className={`${styles.item} ${styles[error.severity]}`}
            onClick={() => onErrorClick?.(error)}
            role="button"
            tabIndex={0}
          >
            <span className={styles.path}>{error.path}</span>
            <span className={styles.message}>{error.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 预设模板

模板使用 Phase 0 定义的 `AbilityConfigJSON` 类型：

```typescript
// lib/ability-tester/templates/abilityTemplates.ts

import type { AbilityConfigJSON } from '../config/types';

/**
 * 预设模板集合
 */
export const abilityTemplates: Record<string, AbilityConfigJSON> = {
  basicAttack: {
    configId: 'skill_basic_attack',
    displayName: '普通攻击',
    description: '对单个目标造成物理伤害',
    tags: ['attack', 'physical', 'single_target'],
    activeUseComponents: [
      {
        type: 'ActiveUse',
        timelineId: 'timeline_basic_attack',
        tagActions: {
          impact: [
            {
              type: 'Damage',
              target: 'eventTarget',
              formula: 'source.atk * 1.0',
              damageType: 'physical',
            },
            {
              type: 'StageCue',
              cueId: 'melee_slash',
            },
          ],
        },
      },
    ],
  },

  aoeDamage: {
    configId: 'skill_aoe_damage',
    displayName: 'AOE 伤害',
    description: '对所有敌人造成魔法伤害',
    tags: ['magic', 'aoe'],
    activeUseComponents: [
      {
        type: 'ActiveUse',
        timelineId: 'timeline_aoe',
        tagActions: {
          cast: [
            {
              type: 'StageCue',
              cueId: 'cast_magic',
            },
          ],
          impact: [
            {
              type: 'Damage',
              target: 'allEnemies',
              formula: 'source.atk * 0.8',
              damageType: 'magical',
            },
            {
              type: 'StageCue',
              cueId: 'explosion',
            },
          ],
        },
      },
    ],
  },

  healSelf: {
    configId: 'skill_heal_self',
    displayName: '自我治疗',
    description: '恢复自身生命值',
    tags: ['heal', 'self'],
    activeUseComponents: [
      {
        type: 'ActiveUse',
        timelineId: 'timeline_instant',
        tagActions: {
          apply: [
            {
              type: 'Heal',
              target: 'self',
              formula: 'source.maxHp * 0.2',
            },
            {
              type: 'StageCue',
              cueId: 'heal_sparkle',
            },
          ],
        },
      },
    ],
  },

  attackBuff: {
    configId: 'buff_attack_up',
    displayName: '攻击力提升',
    description: '提升攻击力 50%，持续 10 秒',
    tags: ['buff', 'attack'],
    components: [
      {
        type: 'TimeDurationComponent',
        duration: 10000,
      },
      {
        type: 'StatModifierComponent',
        attribute: 'atk',
        layer: 'mulBase',
        value: 0.5,
      },
    ],
  },

  burnDebuff: {
    configId: 'debuff_burn',
    displayName: '燃烧',
    description: '持续受到火焰伤害',
    tags: ['debuff', 'dot', 'fire'],
    components: [
      {
        type: 'TimeDurationComponent',
        duration: 3000,
      },
      {
        type: 'TagComponent',
        tags: { burning: 1 },
      },
    ],
    activeUseComponents: [
      {
        type: 'ActiveUse',
        timelineId: 'timeline_dot',
        tagActions: {
          tick_1: [
            {
              type: 'Damage',
              target: 'owner',  // DoT 对持有者造成伤害
              formula: '20',
              damageType: 'true',
            },
          ],
          tick_2: [
            {
              type: 'Damage',
              target: 'owner',
              formula: '20',
              damageType: 'true',
            },
          ],
          tick_3: [
            {
              type: 'Damage',
              target: 'owner',
              formula: '20',
              damageType: 'true',
            },
          ],
        },
      },
    ],
  },
};

export type TemplateKey = keyof typeof abilityTemplates;

/**
 * 获取模板的 JSON 字符串
 */
export function getTemplateJSON(key: TemplateKey): string {
  return JSON.stringify(abilityTemplates[key], null, 2);
}

/**
 * 模板元信息（用于 UI 展示）
 */
export const templateMeta: Record<TemplateKey, { name: string; description: string; icon: string }> = {
  basicAttack: {
    name: '普通攻击',
    description: '单体物理伤害',
    icon: '⚔️',
  },
  aoeDamage: {
    name: 'AOE 伤害',
    description: '范围魔法伤害',
    icon: '💥',
  },
  healSelf: {
    name: '自我治疗',
    description: '恢复生命值',
    icon: '💚',
  },
  attackBuff: {
    name: '攻击力 Buff',
    description: '持续时间型属性增益',
    icon: '⬆️',
  },
  burnDebuff: {
    name: '燃烧 DoT',
    description: '持续伤害效果',
    icon: '🔥',
  },
};
```

---

## 模板选择器组件

```typescript
// components/ability-editor/TemplateSelector.tsx

import { abilityTemplates, templateMeta, getTemplateJSON, type TemplateKey } from '@/lib/ability-tester/templates/abilityTemplates';
import styles from './TemplateSelector.module.css';

export interface TemplateSelectorProps {
  onSelect: (json: string) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const templateKeys = Object.keys(abilityTemplates) as TemplateKey[];

  return (
    <div className={styles.container}>
      <div className={styles.header}>选择模板</div>
      <div className={styles.grid}>
        {templateKeys.map((key) => {
          const meta = templateMeta[key];
          return (
            <button
              key={key}
              className={styles.templateCard}
              onClick={() => onSelect(getTemplateJSON(key))}
            >
              <span className={styles.icon}>{meta.icon}</span>
              <span className={styles.name}>{meta.name}</span>
              <span className={styles.description}>{meta.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 类型一致性说明

### Component 类型名称

| Phase 0 类型名 | 框架实际类 | 说明 |
|---------------|-----------|------|
| `TimeDurationComponent` | `TimeDurationComponent` | 时间持续 |
| `StackComponent` | `StackComponent` | 层数 |
| `StatModifierComponent` | `StatModifierComponent` | 属性修改 |
| `TagComponent` | `TagComponent` | 标签 |

### ActiveUseComponent 结构

```typescript
// Phase 0 定义的正确结构
interface ActiveUseComponentJSON {
  type: 'ActiveUse';
  timelineId: string;  // Timeline ID（引用 TimelineRegistry 中的定义）
  tagActions: Record<string, ActionJSON[]>;  // Tag 到 Actions 的映射
  conditions?: ConditionJSON[];
  costs?: CostJSON[];
}
```

**注意**：`timelineId` 和 `tagActions` 是分离的，不是嵌套在 `timeline` 对象中。

---

## 文件结构

```
inkmon-pokedex/
├── components/
│   └── ability-editor/
│       ├── index.ts
│       ├── ConfigEditor.tsx
│       ├── ConfigEditor.module.css
│       ├── ValidationPanel.tsx
│       ├── ValidationPanel.module.css
│       ├── TemplateSelector.tsx
│       └── TemplateSelector.module.css
└── lib/
    └── ability-tester/
        ├── config/                  # Phase 0 定义
        │   ├── types.ts
        │   ├── schema.ts
        │   ├── parser.ts
        │   └── jsonSchema.ts        # 自动生成的 JSON Schema
        └── templates/
            └── abilityTemplates.ts
```

---

## 验收标准

- [ ] Monaco Editor 正确加载
- [ ] JSON Schema 验证工作（使用自动生成的 Schema）
- [ ] 自动补全功能正常
- [ ] 错误实时提示（使用 Phase 0 的 validateAndParse）
- [ ] 格式化功能正常
- [ ] 预设模板可选择
- [ ] 模板使用正确的类型名称（与 Phase 0 一致）
- [ ] 与测试场景联动

---

## 下一步

完成 JSON 编辑器后，进入 [Phase2_TimelineVisualizer.md](./Phase2_TimelineVisualizer.md) 实现 Timeline 可视化。
