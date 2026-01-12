# Phase 2: Component 编辑器方案

## 概述

提供 AbilityConfig 中 Component 的可视化编辑界面，支持添加、删除、编辑各类 Component。

## 目标

- 列表展示所有 Component
- 表单化编辑界面
- 支持添加/删除 Component
- 类型安全的编辑体验

---

## 前置依赖

- [Phase0_ConfigParser.md](./Phase0_ConfigParser.md) - JSON 配置类型定义

**重要**：Component 类型名称必须与 Phase 0 定义一致（如 `TimeDurationComponent` 而非 `Duration`）。

---

## UI 设计

### 整体布局

```
┌─────────────────────────────────────────────────────────────────┐
│  Components                                        [+ Add]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📦 Duration                                         [×]   │  │
│  │    time: 10000ms                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📊 StatModifier                                     [×]   │  │
│  │    attribute: atk                                         │  │
│  │    layer: mulBase                                         │  │
│  │    value: 0.5                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🏷️ Tag                                              [×]   │  │
│  │    tagId: burning                                         │  │
│  │    initialStacks: 1                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 添加 Component 对话框

```
┌─────────────────────────────────────────────────────────────────┐
│  Add Component                                           [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Select Type:                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Duration   │ │   Stack     │ │ StatModifier│               │
│  │  ⏱️ 持续时间 │ │  📚 层数    │ │  📊 属性修改 │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│  ┌─────────────┐                                               │
│  │    Tag      │                                               │
│  │  🏷️ 标签    │                                               │
│  └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 编辑 Component 表单

```
┌─────────────────────────────────────────────────────────────────┐
│  Edit: StatModifier                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Attribute:                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ atk                                                  ▼  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Layer:                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ mulBase (乘法基础)                                   ▼  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Value:                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 0.5                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Preview: ATK × 1.5 (增加 50%)                                  │
│                                                                 │
│                                    [Cancel]  [Save]             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 组件设计

### ComponentList 组件

```typescript
// components/ability-editor/ComponentList.tsx

import { useState, useCallback } from 'react';
import styles from './ComponentList.module.css';

// ========== 类型定义 ==========

export interface ComponentData {
  type: string;
  [key: string]: unknown;
}

export interface ComponentListProps {
  /** Component 列表 */
  components: ComponentData[];
  /** 变更回调 */
  onChange: (components: ComponentData[]) => void;
  /** 是否只读 */
  readOnly?: boolean;
}

// ========== Component 类型配置（使用 Phase 0 定义的类型名） ==========

const COMPONENT_TYPES = {
  TimeDurationComponent: {
    icon: '⏱️',
    label: '持续时间',
    description: '设置 Ability 的持续时间',
    fields: [
      { name: 'duration', type: 'number', label: '时间 (ms)', required: true },
    ],
  },
  StackComponent: {
    icon: '📚',
    label: '层数',
    description: '设置 Ability 的最大层数',
    fields: [
      { name: 'maxStacks', type: 'number', label: '最大层数', required: true },
      { name: 'initialStacks', type: 'number', label: '初始层数', required: false },
    ],
  },
  StatModifierComponent: {
    icon: '📊',
    label: '属性修改',
    description: '修改目标的属性值',
    fields: [
      { name: 'attribute', type: 'select', label: '属性', required: true, options: () => getAvailableAttributes() },
      { name: 'layer', type: 'select', label: '修改层', required: true, options: ['addBase', 'mulBase', 'addFinal', 'mulFinal'] },
      { name: 'value', type: 'number', label: '数值', required: true },
    ],
  },
  TagComponent: {
    icon: '🏷️',
    label: '标签',
    description: '为目标添加标签',
    fields: [
      { name: 'tags', type: 'tagMap', label: 'Tags', required: true },
    ],
  },
} as const;

// 动态获取可用属性列表
function getAvailableAttributes(): string[] {
  // 可以从项目配置或框架获取
  return ['hp', 'maxHp', 'atk', 'def', 'spd', 'critRate', 'critDamage'];
}

type ComponentType = keyof typeof COMPONENT_TYPES;

// ========== 组件实现 ==========

export function ComponentList({
  components,
  onChange,
  readOnly = false,
}: ComponentListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // ========== 操作处理 ==========

  const handleAdd = useCallback(
    (type: ComponentType) => {
      const newComponent: ComponentData = { type };

      // 设置默认值
      const config = COMPONENT_TYPES[type];
      for (const field of config.fields) {
        if (field.required) {
          newComponent[field.name] = field.type === 'number' ? 0 : '';
        }
      }

      onChange([...components, newComponent]);
      setShowAddDialog(false);
      setEditingIndex(components.length);
    },
    [components, onChange]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newComponents = [...components];
      newComponents.splice(index, 1);
      onChange(newComponents);

      if (editingIndex === index) {
        setEditingIndex(null);
      }
    },
    [components, onChange, editingIndex]
  );

  const handleUpdate = useCallback(
    (index: number, updated: ComponentData) => {
      const newComponents = [...components];
      newComponents[index] = updated;
      onChange(newComponents);
    },
    [components, onChange]
  );

  // ========== 渲染 ==========

  return (
    <div className={styles.container}>
      {/* 标题栏 */}
      <div className={styles.header}>
        <span className={styles.title}>Components</span>
        {!readOnly && (
          <button
            className={styles.addButton}
            onClick={() => setShowAddDialog(true)}
          >
            + Add
          </button>
        )}
      </div>

      {/* Component 列表 */}
      <div className={styles.list}>
        {components.length === 0 ? (
          <div className={styles.empty}>No components</div>
        ) : (
          components.map((component, index) => (
            <ComponentItem
              key={index}
              component={component}
              isEditing={editingIndex === index}
              readOnly={readOnly}
              onEdit={() => setEditingIndex(index)}
              onDelete={() => handleDelete(index)}
              onUpdate={(updated) => handleUpdate(index, updated)}
              onClose={() => setEditingIndex(null)}
            />
          ))
        )}
      </div>

      {/* 添加对话框 */}
      {showAddDialog && (
        <AddComponentDialog
          onSelect={handleAdd}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

// ========== ComponentItem 组件 ==========

interface ComponentItemProps {
  component: ComponentData;
  isEditing: boolean;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updated: ComponentData) => void;
  onClose: () => void;
}

function ComponentItem({
  component,
  isEditing,
  readOnly,
  onEdit,
  onDelete,
  onUpdate,
  onClose,
}: ComponentItemProps) {
  const config = COMPONENT_TYPES[component.type as ComponentType];

  if (!config) {
    return (
      <div className={styles.item}>
        <span className={styles.unknownType}>Unknown: {component.type}</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <ComponentEditor
        component={component}
        config={config}
        onSave={onUpdate}
        onCancel={onClose}
      />
    );
  }

  return (
    <div className={styles.item} onClick={readOnly ? undefined : onEdit}>
      <div className={styles.itemHeader}>
        <span className={styles.itemIcon}>{config.icon}</span>
        <span className={styles.itemType}>{component.type}</span>
        {!readOnly && (
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ×
          </button>
        )}
      </div>
      <div className={styles.itemContent}>
        {config.fields.map((field) => {
          const value = component[field.name];
          if (value === undefined) return null;
          return (
            <div key={field.name} className={styles.itemField}>
              <span className={styles.fieldName}>{field.name}:</span>
              <span className={styles.fieldValue}>{String(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== ComponentEditor 组件 ==========

interface ComponentEditorProps {
  component: ComponentData;
  config: typeof COMPONENT_TYPES[ComponentType];
  onSave: (updated: ComponentData) => void;
  onCancel: () => void;
}

function ComponentEditor({
  component,
  config,
  onSave,
  onCancel,
}: ComponentEditorProps) {
  const [draft, setDraft] = useState<ComponentData>({ ...component });

  const handleFieldChange = (name: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(draft);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <span className={styles.editorTitle}>Edit: {component.type}</span>
      </div>
      <div className={styles.editorContent}>
        {config.fields.map((field) => (
          <div key={field.name} className={styles.editorField}>
            <label className={styles.fieldLabel}>
              {field.label}
              {field.required && <span className={styles.required}>*</span>}
            </label>
            <FieldInput
              field={field}
              value={draft[field.name]}
              onChange={(value) => handleFieldChange(field.name, value)}
            />
          </div>
        ))}
      </div>
      <div className={styles.editorActions}>
        <button className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
        <button className={styles.saveButton} onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}

// ========== FieldInput 组件 ==========

interface FieldInputProps {
  field: {
    name: string;
    type: string;
    label: string;
    required: boolean;
    options?: readonly string[];
  };
  value: unknown;
  onChange: (value: unknown) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  switch (field.type) {
    case 'number':
      return (
        <input
          type="number"
          className={styles.input}
          value={value as number ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      );

    case 'string':
      return (
        <input
          type="text"
          className={styles.input}
          value={value as string ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'select':
      return (
        <select
          className={styles.select}
          value={value as string ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">-- Select --</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    default:
      return (
        <input
          type="text"
          className={styles.input}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

// ========== AddComponentDialog 组件 ==========

interface AddComponentDialogProps {
  onSelect: (type: ComponentType) => void;
  onClose: () => void;
}

function AddComponentDialog({ onSelect, onClose }: AddComponentDialogProps) {
  return (
    <div className={styles.dialogOverlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span>Add Component</span>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.dialogContent}>
          <div className={styles.typeGrid}>
            {(Object.entries(COMPONENT_TYPES) as [ComponentType, typeof COMPONENT_TYPES[ComponentType]][]).map(
              ([type, config]) => (
                <button
                  key={type}
                  className={styles.typeCard}
                  onClick={() => onSelect(type)}
                >
                  <span className={styles.typeIcon}>{config.icon}</span>
                  <span className={styles.typeName}>{type}</span>
                  <span className={styles.typeDesc}>{config.label}</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### CSS 样式

```css
/* components/ability-editor/ComponentList.module.css */

.container {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.title {
  font-weight: 600;
  color: var(--text-primary);
}

.addButton {
  padding: 4px 12px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.addButton:hover {
  background: var(--accent-color-dark);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.empty {
  color: var(--text-tertiary);
  text-align: center;
  padding: 20px;
  font-style: italic;
}

.item {
  background: var(--bg-tertiary);
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.item:hover {
  background: var(--bg-hover);
}

.itemHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.itemIcon {
  font-size: 1.2em;
}

.itemType {
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.deleteButton {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 1.2em;
  line-height: 1;
}

.deleteButton:hover {
  color: var(--error-color);
}

.itemContent {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.9em;
}

.itemField {
  display: flex;
  gap: 8px;
}

.fieldName {
  color: var(--text-secondary);
}

.fieldValue {
  color: var(--text-primary);
  font-family: monospace;
}

/* Editor */
.editor {
  background: var(--bg-tertiary);
  border-radius: 6px;
  border: 2px solid var(--accent-color);
}

.editorHeader {
  padding: 8px 12px;
  background: var(--accent-color);
  color: white;
}

.editorTitle {
  font-weight: 600;
}

.editorContent {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editorField {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fieldLabel {
  font-size: 0.9em;
  color: var(--text-secondary);
}

.required {
  color: var(--error-color);
  margin-left: 2px;
}

.input,
.select {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1em;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: var(--accent-color);
}

.editorActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--border-color);
}

.cancelButton,
.saveButton {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancelButton {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.saveButton {
  background: var(--accent-color);
  color: white;
}

/* Dialog */
.dialogOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
}

.dialogHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
}

.closeButton {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: var(--text-tertiary);
}

.dialogContent {
  padding: 16px;
}

.typeGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.typeCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.typeCard:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-color);
}

.typeIcon {
  font-size: 2em;
}

.typeName {
  font-weight: 600;
  color: var(--text-primary);
}

.typeDesc {
  font-size: 0.8em;
  color: var(--text-secondary);
}
```

---

## 与 ConfigEditor 联动

### 双向同步

```typescript
// app/tools/ability-tester/page.tsx

function AbilityTesterPage() {
  const [configJson, setConfigJson] = useState(defaultConfig);
  const [parsedConfig, setParsedConfig] = useState<AbilityConfig | null>(null);

  // 从 JSON 解析 components
  const components = useMemo(() => {
    return parsedConfig?.components ?? [];
  }, [parsedConfig]);

  // Component 变更时更新 JSON
  const handleComponentsChange = useCallback(
    (newComponents: ComponentData[]) => {
      if (!parsedConfig) return;

      const updated = {
        ...parsedConfig,
        components: newComponents,
      };

      setConfigJson(JSON.stringify(updated, null, 2));
      setParsedConfig(updated);
    },
    [parsedConfig]
  );

  return (
    <div className="ability-tester-page">
      <div className="editor-panel">
        <ConfigEditor
          value={configJson}
          onChange={setConfigJson}
          onValidationSuccess={setParsedConfig}
        />
      </div>

      <div className="component-panel">
        <ComponentList
          components={components}
          onChange={handleComponentsChange}
        />
      </div>
    </div>
  );
}
```

---

## 文件结构

```
inkmon-pokedex/
└── components/
    └── ability-editor/
        ├── ComponentList.tsx
        ├── ComponentList.module.css
        └── componentTypes.ts
```

---

## 验收标准

- [ ] Component 列表正确显示
- [ ] 添加 Component 功能正常
- [ ] 删除 Component 功能正常
- [ ] 编辑 Component 功能正常
- [ ] 与 ConfigEditor 双向同步
- [ ] 表单验证正确

---

## 下一步

完成 Component 编辑器后，进入 [Phase3_LLMIntegration.md](./Phase3_LLMIntegration.md) 实现自然语言生成。
