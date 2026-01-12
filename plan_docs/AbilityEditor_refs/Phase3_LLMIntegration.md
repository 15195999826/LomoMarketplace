# Phase 3: LLM 集成方案

## 概述

实现自然语言生成 AbilityConfig 的核心功能，集成大语言模型 API 提供智能生成能力。

## 目标

- 支持多种 LLM 提供商（OpenAI、Anthropic、本地模型）
- 用户自带 API Key 的安全集成方式
- 流式响应提供更好的用户体验
- 错误处理和重试机制

---

## 前置依赖

- [Phase0_ConfigParser.md](./Phase0_ConfigParser.md) - JSON 配置类型和 Schema 定义
- [Phase2_ConfigEditor.md](./Phase2_ConfigEditor.md) - JSON 编辑器

**重要**：LLM 生成的 JSON 必须符合 Phase 0 定义的 `AbilityConfigJSON` 格式，然后通过 `validateAndParse()` 转换为框架的 `AbilityConfig`。

---

## 技术选型

### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| 前端直接调用 API | 简单、用户自带 Key | 需要处理 CORS | ⭐⭐⭐⭐⭐ |
| 后端代理 | 安全、无需 CORS | 需要额外服务器 | ⭐⭐⭐ |
| 本地 LLM (Ollama) | 免费、隐私 | 需要本地运行、速度慢 | ⭐⭐ |

**推荐方案**: 前端直接调用 API（用户自带 Key）

### 支持的 LLM 提供商

1. **OpenAI** (GPT-4, GPT-3.5)
2. **Anthropic** (Claude 3)
3. **本地模型** (通过 Ollama)

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│  Ability Tester Page                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  NaturalLanguageInput 组件                             │   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │ 输入: "一个造成 100 点伤害的攻击技能"             │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  │  [选择提供商: OpenAI ▼] [API Key 输入] [生成]          │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  进度: ████████████░░░░ 80%                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LLMService                                             │   │
│  │  - 管理多个 LLM Provider                               │   │
│  │  - 处理 API Key 存储 (localStorage)                     │   │
│  │  - 流式响应处理                                         │   │
│  │  - 错误处理和重试                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PromptBuilder                                          │   │
│  │  - 组装 Schema、Component、Action、Example               │   │
│  │  - 生成完整 Prompt                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心实现

### 1. LLM Provider 抽象接口

```typescript
// lib/ability-tester/llm/types.ts

/**
 * LLM 提供商类型
 */
export type LLMProvider = 'openai' | 'anthropic' | 'ollama';

/**
 * LLM 消息
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM 响应
 */
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * 流式响应回调
 */
export type StreamCallback = (chunk: string) => void;

/**
 * LLM Provider 接口
 */
export interface ILLMProvider {
  /**
   * Provider 类型
   */
  readonly type: LLMProvider;

  /**
   * 生成内容（非流式）
   */
  generate(messages: LLMMessage[], options?: GenerateOptions): Promise<LLMResponse>;

  /**
   * 生成内容（流式）
   */
  generateStream(
    messages: LLMMessage[],
    onChunk: StreamCallback,
    options?: GenerateOptions
  ): Promise<LLMResponse>;

  /**
   * 验证 API Key
   */
  validateApiKey(apiKey: string): Promise<boolean>;
}

/**
 * 生成选项
 */
export interface GenerateOptions {
  /**
   * 温度 (0-1)
   */
  temperature?: number;

  /**
   * 最大 Token 数
   */
  maxTokens?: number;

  /**
   * 停止序列
   */
  stopSequences?: string[];
}
```

### 2. OpenAI Provider 实现

```typescript
// lib/ability-tester/llm/providers/OpenAIProvider.ts

import OpenAI from 'openai';
import type { ILLMProvider, LLMMessage, StreamCallback, GenerateOptions } from '../types';

export class OpenAIProvider implements ILLMProvider {
  readonly type = 'openai' as const;
  private client: OpenAI | null = null;

  constructor(private apiKey: string) {
    this.client = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true, // 用户自带 Key，允许浏览器运行
    });
  }

  async generate(messages: LLMMessage[], options?: GenerateOptions) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages as any,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      stop: options?.stopSequences,
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  async generateStream(
    messages: LLMMessage[],
    onChunk: StreamCallback,
    options?: GenerateOptions
  ) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const stream = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages as any,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      stop: options?.stopSequences,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        onChunk(delta);
      }
    }

    return {
      content: fullContent,
    };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });

      await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });

      return true;
    } catch {
      return false;
    }
  }
}
```

### 3. Anthropic Provider 实现

```typescript
// lib/ability-tester/llm/providers/AnthropicProvider.ts

import Anthropic from '@anthropic-ai/sdk';
import type { ILLMProvider, LLMMessage, StreamCallback, GenerateOptions } from '../types';

export class AnthropicProvider implements ILLMProvider {
  readonly type = 'anthropic' as const;
  private client: Anthropic | null = null;

  constructor(private apiKey: string) {
    this.client = new Anthropic({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async generate(messages: LLMMessage[], options?: GenerateOptions) {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    // Anthropic API 需要分离 system 消息
    const systemMessage = messages.find(m => m.role === 'system')?.content ?? '';
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      system: systemMessage,
      messages: chatMessages as any,
      max_tokens: options?.maxTokens ?? 2000,
    });

    return {
      content: response.content[0]?.type === 'text' ? response.content[0].text : '',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      },
    };
  }

  async generateStream(
    messages: LLMMessage[],
    onChunk: StreamCallback,
    options?: GenerateOptions
  ) {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    const systemMessage = messages.find(m => m.role === 'system')?.content ?? '';
    const chatMessages = messages.filter(m => m.role !== 'system');

    const stream = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      system: systemMessage,
      messages: chatMessages as any,
      max_tokens: options?.maxTokens ?? 2000,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const text = chunk.delta.text;
        fullContent += text;
        onChunk(text);
      }
    }

    return {
      content: fullContent,
    };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true,
      });

      await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });

      return true;
    } catch {
      return false;
    }
  }
}
```

### 4. Ollama Provider 实现

```typescript
// lib/ability-tester/llm/providers/OllamaProvider.ts

import type { ILLMProvider, LLMMessage, StreamCallback, GenerateOptions } from '../types';

export class OllamaProvider implements ILLMProvider {
  readonly type = 'ollama' as const;
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async generate(messages: LLMMessage[], options?: GenerateOptions) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2', // 可配置
        prompt: this.formatPrompt(messages),
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.response,
    };
  }

  async generateStream(
    messages: LLMMessage[],
    onChunk: StreamCallback,
    options?: GenerateOptions
  ) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        prompt: this.formatPrompt(messages),
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is null');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            fullContent += data.response;
            onChunk(data.response);
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    return { content: fullContent };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private formatPrompt(messages: LLMMessage[]): string {
    return messages
      .map(m => {
        if (m.role === 'system') return `System: ${m.content}`;
        if (m.role === 'user') return `User: ${m.content}`;
        return `Assistant: ${m.content}`;
      })
      .join('\n\n');
  }
}
```

### 5. LLMService 管理类

```typescript
// lib/ability-tester/llm/LLMService.ts

import type { ILLMProvider, LLMProvider, LLMMessage, GenerateOptions } from './types';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { OllamaProvider } from './providers/OllamaProvider';

const API_KEY_STORAGE_KEY = 'ability_editor_api_keys';

/**
 * 存储的 API Key
 */
interface StoredApiKeys {
  openai?: string;
  anthropic?: string;
}

/**
 * LLM 服务
 */
export class LLMService {
  private currentProvider: ILLMProvider | null = null;

  /**
   * 获取存储的 API Keys
   */
  getStoredApiKeys(): StoredApiKeys {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * 保存 API Key
   */
  saveApiKey(provider: Extract<LLMProvider, 'openai' | 'anthropic'>, apiKey: string): void {
    const keys = this.getStoredApiKeys();
    keys[provider] = apiKey;
    localStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify(keys));
  }

  /**
   * 创建 Provider
   */
  createProvider(type: LLMProvider, apiKey?: string): ILLMProvider {
    switch (type) {
      case 'openai':
        const openaiKey = apiKey ?? this.getStoredApiKeys().openai;
        if (!openaiKey) {
          throw new Error('OpenAI API key is required');
        }
        return new OpenAIProvider(openaiKey);

      case 'anthropic':
        const anthropicKey = apiKey ?? this.getStoredApiKeys().anthropic;
        if (!anthropicKey) {
          throw new Error('Anthropic API key is required');
        }
        return new AnthropicProvider(anthropicKey);

      case 'ollama':
        return new OllamaProvider();

      default:
        throw new Error(`Unknown provider: ${type}`);
    }
  }

  /**
   * 设置当前 Provider
   */
  setProvider(provider: ILLMProvider): void {
    this.currentProvider = provider;
  }

  /**
   * 生成内容
   */
  async generate(messages: LLMMessage[], options?: GenerateOptions): Promise<string> {
    if (!this.currentProvider) {
      throw new Error('No provider set. Call setProvider() first.');
    }

    const response = await this.currentProvider.generate(messages, options);
    return response.content;
  }

  /**
   * 验证 API Key
   */
  async validateApiKey(type: LLMProvider, apiKey?: string): Promise<boolean> {
    try {
      const provider = this.createProvider(type, apiKey);
      return await provider.validateApiKey(apiKey ?? '');
    } catch {
      return false;
    }
  }
}

// 单例
export const llmService = new LLMService();
```

---

## 依赖安装

```bash
# OpenAI SDK
pnpm add openai

# Anthropic SDK
pnpm add @anthropic-ai/sdk
```

---

## 文件结构

```
inkmon-pokedex/
└── lib/
    └── ability-tester/
        └── llm/
            ├── index.ts
            ├── types.ts
            ├── LLMService.ts
            ├── providers/
            │   ├── OpenAIProvider.ts
            │   ├── AnthropicProvider.ts
            │   └── OllamaProvider.ts
            └── PromptBuilder.ts  # 见 Phase3_PromptEngineering.md
```

---

## 安全考虑

### 1. API Key 存储

- 使用 `localStorage` 存储 API Keys
- 仅存储在用户浏览器中，不发送到服务器
- 提供"清除 API Key"功能

**安全警告**（必须在 UI 中显示）：
```
⚠️ 安全提示：
- API Key 存储在浏览器本地，可能被 XSS 攻击读取
- 建议使用专门用于测试的 API Key（非生产环境 Key）
- 关闭浏览器后 Key 仍会保留，可在设置中手动清除
- 如需更高安全性，考虑使用 sessionStorage 或每次手动输入
```

### 2. CORS 处理

OpenAI 和 Anthropic 的浏览器 SDK 支持 `dangerouslyAllowBrowser` 选项，这允许前端直接调用。由于用户自带 Key，风险可控。

### 3. 使用提示

在界面上添加提示：
```
⚠️ 您的 API Key 仅存储在本地浏览器中，不会上传到任何服务器。
```

---

## 验收标准

- [ ] OpenAI Provider 正常工作
- [ ] Anthropic Provider 正常工作
- [ ] Ollama Provider 正常工作
- [ ] API Key 存储和读取功能正常
- [ ] 流式响应功能正常
- [ ] 错误处理和重试机制正常

---

## 下一步

完成 LLM 集成后，进入 [Phase3_PromptEngineering.md](./Phase3_PromptEngineering.md) 实现 Prompt 工程。
