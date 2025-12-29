---
name: structuring-typescript-code
description: >-
  Guides TypeScript code structure: imports, exports, module organization.
  Use when organizing code, setting up project structure, or resolving circular dependencies.
  Triggers: "import", "export", "模块", "文件结构", "barrel", "循环依赖".
---

# TypeScript 代码结构规范

## 核心约定

| 规范 | 项目选择 |
|------|----------|
| 导出方式 | 命名导出（禁止 `default`） |
| 类型导入 | `import type { }` |
| 重导出 | 显式列出（禁止 `export *`） |
| 目录组织 | 按功能（不按类型） |

## 路径别名

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

```typescript
// ✗ import { User } from '../../../types/user'
// ✓ import { User } from '@/types/user'
```

## 目录结构

```
src/
├── features/           # 按功能组织
│   ├── user/
│   │   ├── user.types.ts
│   │   ├── user.service.ts
│   │   └── index.ts
│   └── order/
└── shared/             # 共享代码
```

## Barrel 文件

```typescript
// types/index.ts
export type { User, UserRole } from './user'
export type { Order } from './order'

// ✗ export * from './user'  // 影响 tree-shaking
```

**何时用**：小型模块、公共 API 入口
**何时避免**：大型项目深层目录

## 循环依赖

```bash
# 检测
npx madge --circular --extensions ts src/
```

解决：提取共享类型到独立文件。
