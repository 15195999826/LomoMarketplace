'use client';

import { useRef, useCallback, useState } from 'react';
import Editor, { OnMount, OnChange, BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

import { abilityConfigJsonSchemaEnhanced } from '@/lib/ability-editor/config/jsonSchema';
import { validateAndParse } from '@/lib/ability-editor/config/parser';
import type { AbilityConfigJSON } from '@/lib/ability-editor/config/types';

import styles from './ConfigEditor.module.css';

// ========== 类型定义 ==========

export interface ConfigEditorProps {
  /** 当前配置值（JSON 字符串） */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 验证错误回调 */
  onValidationError?: (errors: ValidationError[]) => void;
  /** 验证通过回调 */
  onValidationSuccess?: (json: AbilityConfigJSON) => void;
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
          schema: abilityConfigJsonSchemaEnhanced as object,
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
        onValidationSuccess?.(result.json);
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

  // ========== 渲染 ==========

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          className={styles.toolbarButton}
          onClick={formatDocument}
          title="格式化 (Ctrl+S)"
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
