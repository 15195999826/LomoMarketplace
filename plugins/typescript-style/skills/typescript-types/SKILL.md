---
name: using-typescript-types
description: >-
  Guides TypeScript type usage: type vs interface decision, avoiding any, and Zod runtime validation.
  Use when defining types, choosing type patterns, or validating external data.
  Triggers: "type vs interface", "any", "unknown", "Zod", "运行时验证", "类型".
---

# TypeScript 类型规范

## 核心约定

| 规范 | 项目选择 |
|------|----------|
| 默认类型定义 | `type`（不用 `interface`） |
| 未知类型 | `unknown`（禁止 `any`） |
| 字符串常量 | 联合类型（不用 `enum`） |
| 外部数据 | Zod 验证（不用 `as Type`） |

## Type vs Interface

```
默认用 type
│
├─ 需要声明合并（扩展第三方库）→ interface
├─ 类的契约（implements）→ interface
└─ 其他情况 → type
```

## 禁止 any

```typescript
// ✗ any
function process(data: any) { }

// ✓ unknown + 类型守卫
function process(data: unknown) {
  if (typeof data === 'string') {
    console.log(data.toUpperCase())
  }
}

// 类型谓词
function isUser(v: unknown): v is User {
  return typeof v === 'object' && v !== null && 'id' in v
}
```

## 运行时验证 (Zod)

**外部数据必须验证**（API、表单、环境变量、配置文件）：

```typescript
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
})

type User = z.infer<typeof UserSchema>

// 验证 API 响应
const user = UserSchema.parse(await res.json())
```

> 详细 Zod 模式参见 `references/zod-patterns.md`
