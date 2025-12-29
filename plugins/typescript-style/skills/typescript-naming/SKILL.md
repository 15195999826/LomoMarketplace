---
name: naming-typescript
description: >-
  Applies TypeScript naming conventions for variables, functions, classes, types, and files.
  Use when writing new code or reviewing naming patterns.
  Triggers: "命名规范", "怎么命名", "变量名", "naming convention".
---

# TypeScript 命名规范

## 速查表

| 类型 | 规则 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `userName`, `fetchUser` |
| 类/类型 | PascalCase | `UserService`, `ApiResponse` |
| 常量 | UPPER_SNAKE | `MAX_RETRY`, `API_URL` |
| 布尔 | 前缀 | `isActive`, `hasPermission` |
| 数组 | 复数 | `users`, `items` |
| 文件 | kebab-case | `user-service.ts` |

## 布尔变量前缀

| 前缀 | 语义 | 示例 |
|------|------|------|
| `is` | 状态 | `isActive`, `isLoading` |
| `has` | 拥有 | `hasPermission`, `hasError` |
| `can` | 能力 | `canEdit`, `canSubmit` |
| `should` | 建议 | `shouldRefresh`, `shouldRetry` |
| `will` | 将要 | `willUpdate`, `willExpire` |
| `did` | 已发生 | `didMount`, `didChange` |

## 常量判断

```typescript
// UPPER_SNAKE: 编译时确定、不可变
const MAX_RETRY = 3
const API_URL = 'https://api.example.com'

// camelCase: 运行时计算
const currentUser = fetchUser()
```

## 常用缩写

| 缩写 | 全称 |
|------|------|
| `ctx` | Context |
| `cfg` | Configuration |
| `req/res` | Request/Response |
| `err` | Error |
| `fn` | Function |
| `ref` | Reference |
| `prev/next` | Previous/Next |
| `idx` | Index |

**避免**：单字母变量（除 `i/j/k` 和 `T/K/V`）
