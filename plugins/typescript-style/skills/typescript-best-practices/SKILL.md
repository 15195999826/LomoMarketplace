---
name: writing-typescript-safely
description: >-
  Provides TypeScript best practices for error handling patterns and project conventions.
  Use when handling errors, designing Result types, or implementing retry logic.
  Triggers: "错误处理", "Result类型", "自定义Error", "重试", "最佳实践".
---

# TypeScript 最佳实践

> 类型相关内容参见 **using-typescript-types** skill。

## 速查表

| 场景 | 项目约定 |
|------|----------|
| 预期错误 | Result 类型 |
| 意外错误 | 自定义 Error 类 |
| 网络请求 | 指数退避重试 |
| 空值默认 | `??`（不用 `\|\|`） |

## Result 类型（项目约定）

对于**可预期的失败**，使用 Result 类型替代 throw：

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

async function parseConfig(path: string): Promise<Result<Config, string>> {
  try {
    const content = await fs.readFile(path, 'utf-8')
    return { success: true, data: JSON.parse(content) }
  } catch {
    return { success: false, error: 'Failed to parse config' }
  }
}

// 调用方
const result = await parseConfig('./config.json')
if (result.success) console.log(result.data)
else console.error(result.error)
```

## 自定义 Error 类

```typescript
class ValidationError extends Error {
  constructor(message: string, public field: string, public code: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`)
    this.name = 'NotFoundError'
  }
}
```

## 指数退避重试

```typescript
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries) throw error
      await sleep(1000 * Math.pow(2, i))  // 1s, 2s, 4s...
    }
  }
  throw new Error('Unreachable')
}
```
