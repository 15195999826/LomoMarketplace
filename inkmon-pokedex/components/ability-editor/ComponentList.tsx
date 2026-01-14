'use client';

import { useState, useCallback } from 'react';
import styles from './ComponentList.module.css';

export interface ComponentData {
  type: string;
  [key: string]: unknown;
}

export interface ComponentListProps {
  components: ComponentData[];
  onChange: (components: ComponentData[]) => void;
  readOnly?: boolean;
}

interface FieldConfig {
  name: string;
  type: 'number' | 'string' | 'select' | 'tagMap';
  label: string;
  required: boolean;
  options?: readonly string[] | (() => string[]);
}

interface ComponentTypeConfig {
  icon: string;
  label: string;
  description: string;
  fields: FieldConfig[];
}

const COMPONENT_TYPES: Record<string, ComponentTypeConfig> = {
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
      { name: 'modifiers', type: 'string', label: '修改器 (JSON)', required: true },
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
};

type ComponentType = keyof typeof COMPONENT_TYPES;

export function ComponentList({
  components,
  onChange,
  readOnly = false,
}: ComponentListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAdd = useCallback(
    (type: ComponentType) => {
      const newComponent: ComponentData = { type };
      const config = COMPONENT_TYPES[type];
      
      for (const field of config.fields) {
        if (field.required) {
          if (field.type === 'number') {
            newComponent[field.name] = 0;
          } else if (field.type === 'tagMap') {
            newComponent[field.name] = {};
          } else {
            newComponent[field.name] = '';
          }
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

  return (
    <div className={styles.container}>
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

      {showAddDialog && (
        <AddComponentDialog
          onSelect={handleAdd}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

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
  const config = COMPONENT_TYPES[component.type];

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
        onSave={(updated) => {
          onUpdate(updated);
          onClose();
        }}
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
              <span className={styles.fieldValue}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ComponentEditorProps {
  component: ComponentData;
  config: ComponentTypeConfig;
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

interface FieldInputProps {
  field: FieldConfig;
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
          value={(value as number) ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      );

    case 'string':
      return (
        <input
          type="text"
          className={styles.input}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'select': {
      const options = typeof field.options === 'function' ? field.options() : field.options ?? [];
      return (
        <select
          className={styles.select}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">-- Select --</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    case 'tagMap':
      return (
        <input
          type="text"
          className={styles.input}
          value={typeof value === 'object' ? JSON.stringify(value) : '{}'}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              // Keep current value on parse error
            }
          }}
          placeholder='{"tagName": 1}'
        />
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
            {Object.entries(COMPONENT_TYPES).map(([type, config]) => (
              <button
                key={type}
                className={styles.typeCard}
                onClick={() => onSelect(type)}
              >
                <span className={styles.typeIcon}>{config.icon}</span>
                <span className={styles.typeName}>{type}</span>
                <span className={styles.typeDesc}>{config.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
