# Phase 3: 生成 -> 验证 -> 修正循环

## 概述

实现完整的自然语言生成工作流，包括生成、验证、错误处理、手动修正和重新生成的完整流程。

## 目标

- 流畅的生成体验（流式响应）
- 完善的错误处理和提示
- 手动编辑与重新生成的双向同步
- 生成历史记录和版本管理

---

## 前置依赖

- [Phase0_ConfigParser.md](./Phase0_ConfigParser.md) - `validateAndParse()` 用于验证生成的 JSON
- [Phase3_LLMIntegration.md](./Phase3_LLMIntegration.md) - LLM Provider
- [Phase3_PromptEngineering.md](./Phase3_PromptEngineering.md) - Prompt 构建

**验证流程**：
```
LLM 响应 (JSON 字符串)
    ↓ extractJSON()
AbilityConfigJSON (Phase 0 类型)
    ↓ validateAndParse()
AbilityConfig (框架类型) + 验证结果
    ↓ 成功则注册到 TestGameWorld
```

---

## 工作流设计

```
┌─────────────────────────────────────────────────────────────────┐
│  自然语言生成工作流                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. 用户输入                                                │  │
│  │    "一个火球术，造成 150 点魔法伤害"                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 2. 构建 Prompt                                            │  │
│  │    - 加载 Schema                                          │  │
│  │    - 选择相关示例                                          │  │
│  │    - 组装完整消息                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 3. 调用 LLM (流式)                                        │  │
│  │    ████████░░░░░░░░░░ 40%                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 4. 解析响应                                                │  │
│  │    - 提取 JSON                                            │  │
│  │    - 处理 Markdown 代码块                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 5. 验证 Schema                                            │  │
│  │    ✓ 通过 → 加载到编辑器                                  │  │
│  │    ✗ 失败 → 显示错误，允许修正                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 6. 加载到测试场景                                          │  │
│  │    - 用户测试效果                                          │  │
│  │    - 手动调整参数                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 7. 迭代优化                                                │  │
│  │    - 调整描述重新生成                                      │  │
│  │    - 或直接编辑 JSON                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心组件

### 1. NaturalLanguageInput 组件

```typescript
// components/ability-editor/NaturalLanguageInput.tsx

import { useState, useCallback } from 'react';
import styles from './NaturalLanguageInput.module.css';
import { promptBuilder } from '@/lib/ability-tester/llm/PromptBuilder';
import { llmService } from '@/lib/ability-tester/llm/LLMService';
import type { LLMProvider } from '@/lib/ability-tester/llm/types';
import { AbilityConfigSchema } from '@/lib/ability-tester/schema/abilityConfigSchema';
import type { AbilityConfig } from '@/lib/ability-tester/schema/abilityConfigSchema';

// ========== 类型定义 ==========

export interface GenerationResult {
  config: AbilityConfig;
  json: string;
  timestamp: number;
  userInput: string;
  provider: LLMProvider;
}

export interface NaturalLanguageInputProps {
  /** 生成完成回调 */
  onGenerated: (result: GenerationResult) => void;
  /** 生成错误回调 */
  onError: (error: GenerationError) => void;
  /** 默认提供商 */
  defaultProvider?: LLMProvider;
}

export interface GenerationError {
  type: 'api_error' | 'parse_error' | 'validation_error' | 'unknown';
  message: string;
  rawResponse?: string;
  validationErrors?: Array<{
    path: string[];
    message: string;
  }>;
}

// ========== 组件实现 ==========

export function NaturalLanguageInput({
  onGenerated,
  onError,
  defaultProvider = 'openai',
}: NaturalLanguageInputProps) {
  // ========== 状态 ==========

  const [userInput, setUserInput] = useState('');
  const [provider, setProvider] = useState<LLMProvider>(defaultProvider);
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [generationHistory, setGenerationHistory] = useState<GenerationResult[]>([]);

  // ========== 生成处理 ==========

  const handleGenerate = useCallback(async () => {
    if (!userInput.trim()) {
      onError({
        type: 'unknown',
        message: '请输入技能描述',
      });
      return;
    }

    setIsGenerating(true);
    setStreamContent('');

    try {
      // 1. 创建并设置 Provider
      const llmProvider = llmService.createProvider(provider, apiKey || undefined);
      llmService.setProvider(llmProvider);

      // 2. 构建 Prompt
      const messages = promptBuilder.buildMessages({
        userInput,
        includeExamples: true,
        exampleCount: 3,
      });

      // 3. 流式生成
      let fullContent = '';
      const response = await llmProvider.generateStream(
        messages,
        (chunk) => {
          fullContent += chunk;
          setStreamContent(fullContent);
        },
        { temperature: 0.7, maxTokens: 2000 }
      );

      // 4. 解析 JSON
      const jsonConfig = extractJSON(response.content);

      if (!jsonConfig) {
        throw new Error('无法从响应中提取 JSON');
      }

      // 5. 验证 Schema
      const parseResult = AbilityConfigSchema.safeParse(jsonConfig);

      if (!parseResult.success) {
        onError({
          type: 'validation_error',
          message: '生成的配置不符合 Schema',
          rawResponse: response.content,
          validationErrors: parseResult.error.errors.map((err) => ({
            path: err.path,
            message: err.message,
          })),
        });
        return;
      }

      // 6. 成功
      const result: GenerationResult = {
        config: parseResult.data,
        json: JSON.stringify(parseResult.data, null, 2),
        timestamp: Date.now(),
        userInput,
        provider,
      };

      setGenerationHistory((prev) => [...prev, result]);
      onGenerated(result);

    } catch (error) {
      const err = error as Error;

      // 判断错误类型
      let errorType: GenerationError['type'] = 'unknown';
      if (err.message.includes('API')) {
        errorType = 'api_error';
      } else if (err.message.includes('JSON')) {
        errorType = 'parse_error';
      }

      onError({
        type: errorType,
        message: err.message,
        rawResponse: streamContent,
      });
    } finally {
      setIsGenerating(false);
      setStreamContent('');
    }
  }, [userInput, provider, apiKey, onGenerated, onError]);

  // ========== 辅助函数 ==========

  return (
    <div className={styles.container}>
      {/* 输入区域 */}
      <div className={styles.inputSection}>
        <textarea
          className={styles.textarea}
          placeholder="描述你想要的技能，例如：&#10;- 一个造成 100 点物理伤害的攻击技能&#10;- 一个火球术，对所有敌人造成魔法伤害&#10;- 一个持续 10 秒的攻击力 Buff"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          disabled={isGenerating}
          rows={4}
        />

        {/* 选项栏 */}
        <div className={styles.optionsBar}>
          <div className={styles.providerSelector}>
            <label>提供商:</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as LLMProvider)}
              disabled={isGenerating}
            >
              <option value="openai">OpenAI (GPT-4)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="ollama">本地 (Ollama)</option>
            </select>
          </div>

          {(provider === 'openai' || provider === 'anthropic') && (
            <div className={styles.apiKeyInput}>
              <label>API Key:</label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isGenerating}
              />
              <button
                className={styles.saveKeyButton}
                onClick={() => {
                  if (apiKey) {
                    llmService.saveApiKey(provider, apiKey);
                  }
                }}
              >
                保存
              </button>
            </div>
          )}

          <button
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={isGenerating || !userInput.trim()}
          >
            {isGenerating ? '生成中...' : '生成技能'}
          </button>
        </div>
      </div>

      {/* 流式响应预览 */}
      {isGenerating && streamContent && (
        <div className={styles.streamPreview}>
          <div className={styles.streamHeader}>
            生成中...
            <span className={styles.streamSpinner}>⏳</span>
          </div>
          <pre className={styles.streamContent}>{streamContent}</pre>
        </div>
      )}

      {/* 历史记录 */}
      {generationHistory.length > 0 && (
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            生成历史 ({generationHistory.length})
          </div>
          <div className={styles.historyList}>
            {generationHistory.map((result, index) => (
              <div
                key={index}
                className={styles.historyItem}
                onClick={() => onGenerated(result)}
              >
                <div className={styles.historyMeta}>
                  <span className={styles.historyConfigId}>{result.config.configId}</span>
                  <span className={styles.historyTime}>
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className={styles.historyInput}>{result.userInput}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 工具函数 ==========

/**
 * 从文本中提取 JSON
 */
function extractJSON(text: string): unknown | null {
  // 1. 尝试直接解析
  try {
    return JSON.parse(text);
  } catch {
    // 继续尝试其他方法
  }

  // 2. 提取 Markdown 代码块中的 JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // 继续尝试
    }
  }

  // 3. 查找 JSON 对象边界
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonStr);
    } catch {
      // 失败
    }
  }

  return null;
}
```

### 2. ErrorPanel 组件

```typescript
// components/ability-editor/ErrorPanel.tsx

import styles from './ErrorPanel.module.css';
import type { GenerationError } from './NaturalLanguageInput';

export interface ErrorPanelProps {
  error: GenerationError | null;
  onRetry?: () => void;
  onEditRaw?: (raw: string) => void;
}

export function ErrorPanel({ error, onRetry, onEditRaw }: ErrorPanelProps) {
  if (!error) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.errorIcon}>⚠️</span>
        <span className={styles.errorTitle}>生成失败</span>
      </div>

      <div className={styles.errorMessage}>
        {error.message}
      </div>

      {/* Schema 验证错误详情 */}
      {error.type === 'validation_error' && error.validationErrors && (
        <div className={styles.validationErrors}>
          <div className={styles.validationHeader}>验证错误详情:</div>
          <ul className={styles.validationList}>
            {error.validationErrors.map((err, index) => (
              <li key={index} className={styles.validationItem}>
                <span className={styles.errorPath}>
                  {err.path.length > 0 ? err.path.join('.') : 'root'}
                </span>
                <span className={styles.errorMsg}>{err.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 原始响应 */}
      {error.rawResponse && (
        <details className={styles.rawResponse}>
          <summary>查看原始响应</summary>
          <pre>{error.rawResponse}</pre>
        </details>
      )}

      {/* 操作按钮 */}
      <div className={styles.actions}>
        {onRetry && (
          <button className={styles.retryButton} onClick={onRetry}>
            🔄 重新生成
          </button>
        )}
        {onEditRaw && error.rawResponse && (
          <button
            className={styles.editRawButton}
            onClick={() => onEditRaw(error.rawResponse!)}
          >
            ✏️ 手动修正
          </button>
        )}
      </div>

      {/* 建议 */}
      {error.type === 'validation_error' && (
        <div className={styles.suggestions}>
          <div className={styles.suggestionTitle}>💡 建议:</div>
          <ul className={styles.suggestionList}>
            <li>尝试更详细的描述</li>
            <li>使用"手动修正"编辑生成的 JSON</li>
            <li>尝试切换不同的 LLM 提供商</li>
          </ul>
        </div>
      )}
    </div>
  );
}
```

### 3. RegenerateDialog 组件

```typescript
// components/ability-editor/RegenerateDialog.tsx

import { useState, useCallback } from 'react';
import styles from './RegenerateDialog.module.css';
import type { AbilityConfig } from '@/lib/ability-tester/schema/abilityConfigSchema';
import type { LLMProvider } from '@/lib/ability-tester/llm/types';

export interface RegenerateDialogProps {
  /** 当前配置 */
  currentConfig: AbilityConfig;
  /** 确认回调 */
  onConfirm: (newUserInput: string, provider?: LLMProvider) => void;
  /** 取消回调 */
  onCancel: () => void;
}

export function RegenerateDialog({
  currentConfig,
  onConfirm,
  onCancel,
}: RegenerateDialogProps) {
  const [userInput, setUserInput] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'refine' | 'modify'>('refine');
  const [targetField, setTargetField] = useState<string>('');
  const [provider, setProvider] = useState<LLMProvider>('openai');

  const handleConfirm = useCallback(() => {
    const prompt = buildRegeneratePrompt();
    onConfirm(prompt, provider);
  }, [adjustmentType, targetField, userInput, provider, onConfirm]);

  const buildRegeneratePrompt = (): string => {
    if (adjustmentType === 'refine') {
      // 优化现有描述
      return `请优化以下技能配置，${userInput}：

当前配置：
${JSON.stringify(currentConfig, null, 2)}`;
    } else {
      // 修改特定字段
      return `请修改以下技能配置的 ${targetField}：${userInput}

当前配置：
${JSON.stringify(currentConfig, null, 2)}`;
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span>重新生成</span>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {/* 调整类型选择 */}
          <div className={styles.adjustmentTypeSelector}>
            <label>
              <input
                type="radio"
                value="refine"
                checked={adjustmentType === 'refine'}
                onChange={(e) => setAdjustmentType(e.target.value as 'refine' | 'modify')}
              />
              优化描述
            </label>
            <label>
              <input
                type="radio"
                value="modify"
                checked={adjustmentType === 'modify'}
                onChange={(e) => setAdjustmentType(e.target.value as 'refine' | 'modify')}
              />
              修改字段
            </label>
          </div>

          {/* 目标字段选择（仅在 modify 模式下） */}
          {adjustmentType === 'modify' && (
            <div className={styles.fieldSelector}>
              <label>目标字段:</label>
              <select
                value={targetField}
                onChange={(e) => setTargetField(e.target.value)}
              >
                <option value="">选择字段...</option>
                <option value="damage">伤害数值</option>
                <option value="duration">持续时间</option>
                <option value="timeline">Timeline</option>
                <option value="effects">效果</option>
              </select>
            </div>
          )}

          {/* 用户输入 */}
          <div className={styles.inputSection}>
            <label>
              {adjustmentType === 'refine' ? '优化要求:' : '修改要求:'}
            </label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={
                adjustmentType === 'refine'
                  ? '例如：增加伤害数值、添加 AOE 效果...'
                  : '例如：将伤害改为 200、添加眩晕效果...'
              }
              rows={3}
            />
          </div>

          {/* 提供商选择 */}
          <div className={styles.providerSelector}>
            <label>提供商:</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value as LLMProvider)}>
              <option value="openai">OpenAI (GPT-4)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="ollama">本地 (Ollama)</option>
            </select>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onCancel}>
            取消
          </button>
          <button className={styles.confirmButton} onClick={handleConfirm} disabled={!userInput.trim()}>
            重新生成
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 完整工作流集成

```typescript
// app/tools/ability-tester/page.tsx

import { useState, useCallback } from 'react';
import { NaturalLanguageInput, type GenerationResult } from '@/components/ability-editor/NaturalLanguageInput';
import { ErrorPanel } from '@/components/ability-editor/ErrorPanel';
import { ConfigEditor } from '@/components/ability-editor/ConfigEditor';
import { RegenerateDialog } from '@/components/ability-editor/RegenerateDialog';
import { useAbilityTester } from '@/lib/ability-tester/hooks/useAbilityTester';
import type { AbilityConfig } from '@/lib/ability-tester/schema/abilityConfigSchema';

export default function AbilityTesterPage() {
  // ========== 状态 ==========

  const [configJson, setConfigJson] = useState('');
  const [parsedConfig, setParsedConfig] = useState<AbilityConfig | null>(null);
  const [generationError, setGenerationError] = useState<GenerationError | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  // ========== Hook ==========

  const { state, controls } = useAbilityTester({
    sceneConfig: {
      casterPosition: { q: 0, r: 0 },
      dummyPositions: [
        { q: 1, r: 0 },
        { q: 2, r: -1 },
        { q: 2, r: 0 },
      ],
      dummyHP: 500,
    },
    autoRun: false,
  });

  // ========== 生成完成处理 ==========

  const handleGenerated = useCallback((result: GenerationResult) => {
    setParsedConfig(result.config);
    setConfigJson(result.json);
    setGenerationError(null);

    // 注册到测试场景
    controls.registerAbility(result.config);
  }, [controls]);

  // ========== 生成错误处理 ==========

  const handleGenerationError = useCallback((error: GenerationError) => {
    setGenerationError(error);
  }, []);

  // ========== 重新生成 ==========

  const handleRegenerate = useCallback((newUserInput: string, provider?: LLMProvider) => {
    setShowRegenerateDialog(false);
    // 这里需要重新调用生成逻辑
    // 可以将 NaturalLanguageInput 的生成逻辑抽取为独立的 hook
  }, []);

  // ========== 手动修正原始响应 ==========

  const handleEditRaw = useCallback((raw: string) => {
    setConfigJson(raw);
    setGenerationError(null);
    // ConfigEditor 会尝试验证和解析
  }, []);

  // ========== 渲染 ==========

  return (
    <div className="ability-tester-page">
      {/* 左侧：编辑区域 */}
      <div className="editor-section">
        {/* 自然语言输入 */}
        <NaturalLanguageInput
          onGenerated={handleGenerated}
          onError={handleGenerationError}
        />

        {/* 错误面板 */}
        {generationError && (
          <ErrorPanel
            error={generationError}
            onRetry={() => {/* 触发重新生成 */}}
            onEditRaw={handleEditRaw}
          />
        )}

        {/* JSON 编辑器 */}
        <ConfigEditor
          value={configJson}
          onChange={setConfigJson}
          onValidationSuccess={(config) => {
            setParsedConfig(config);
            controls.registerAbility(config);
          }}
          onValidationError={(errors) => {
            // 处理验证错误
          }}
        />
      </div>

      {/* 右侧：测试区域 */}
      <div className="tester-section">
        <BattleStage renderState={state.renderState} />
        <TesterControls
          isRunning={state.isRunning}
          onPlay={controls.play}
          onPause={controls.pause}
          onReset={controls.reset}
        />
        <EventLog events={state.currentEvents} />
      </div>

      {/* 重新生成对话框 */}
      {showRegenerateDialog && parsedConfig && (
        <RegenerateDialog
          currentConfig={parsedConfig}
          onConfirm={handleRegenerate}
          onCancel={() => setShowRegenerateDialog(false)}
        />
      )}
    </div>
  );
}
```

---

## 用户体验优化

### 1. 快捷键支持

```
Ctrl + Enter  - 生成技能
Ctrl + S      - 保存配置
Ctrl + R      - 重新生成
Esc           - 关闭对话框
```

### 2. 智能提示

```typescript
// 根据用户输入提供智能提示
const suggestions = [
  '一个造成 {X} 点物理伤害的攻击技能',
  '一个 {属性} 球术，对所有敌人造成伤害',
  '一个持续 {X} 秒的 {属性} 提升Buff',
  '一个治疗技能，恢复 {X}% 生命值',
];
```

### 3. 模板快速填充

```typescript
// 提供常用模板快速填充输入框
const quickTemplates = {
  attack: '一个造成 100 点物理伤害的攻击技能',
  aoe: '一个火球术，对所有敌人造成 150 点魔法伤害',
  buff: '一个持续 10 秒的攻击力提升 50% 的 Buff',
  heal: '一个治疗术，恢复 20% 最大生命值',
};
```

---

## 文件结构

```
inkmon-pokedex/
└── components/
    └── ability-editor/
        ├── NaturalLanguageInput.tsx
        ├── NaturalLanguageInput.module.css
        ├── ErrorPanel.tsx
        ├── ErrorPanel.module.css
        ├── RegenerateDialog.tsx
        ├── RegenerateDialog.module.css
        └── utils/
            └── extractJSON.ts
```

---

## 验收标准

- [ ] 自然语言输入界面完整
- [ ] 流式响应正常显示
- [ ] JSON 提取逻辑健壮
- [ ] Schema 验证错误详细
- [ ] 手动修正功能正常
- [ ] 重新生成功能正常
- [ ] 生成历史记录完整
- [ ] API Key 安全存储
- [ ] 多提供商切换正常

---

## Phase 3 完成总结

完成本阶段后，技能编辑器将具备完整的自然语言生成能力：

✅ **LLM 集成** - 支持多种 LLM 提供商
✅ **Prompt 工程** - 高质量的 Prompt 模板和 Few-shot 示例
✅ **生成工作流** - 完整的生成→验证→修正循环

用户现在可以通过自然语言快速生成技能配置，并在测试场景中实时验证效果！
