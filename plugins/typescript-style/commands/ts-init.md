---
name: ts-init
description: 初始化严格的 TypeScript 配置
argument-hint: "[project-type]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# 初始化 TypeScript 严格配置

为当前项目初始化符合规范的 tsconfig.json 配置。

## 使用方式

```
/typescript-style:ts-init              # 默认 Node.js 配置
/typescript-style:ts-init react        # React 项目配置
/typescript-style:ts-init library      # npm 库配置
```

## 执行步骤

1. **检查现有配置**：读取当前目录是否已有 tsconfig.json
2. **选择模板**：根据参数选择合适的模板
3. **生成配置**：创建 tsconfig.json 文件

## 配置模板

### 基础配置（默认）

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### React 项目配置

如果用户指定 `react`，额外添加：
- `"jsx": "react-jsx"`
- `"lib": ["ES2022", "DOM", "DOM.Iterable"]`

### Library 配置

如果用户指定 `library`，额外添加：
- `"declaration": true`
- `"declarationMap": true`
- 适合发布到 npm 的配置

## 严格模式说明

此配置启用了所有严格选项：

| 选项 | 作用 |
|------|------|
| `strict` | 启用所有严格类型检查 |
| `noImplicitAny` | 禁止隐式 any 类型 |
| `strictNullChecks` | 严格的 null 检查 |
| `noUnusedLocals` | 禁止未使用的局部变量 |
| `noUnusedParameters` | 禁止未使用的参数 |
| `noImplicitReturns` | 所有分支必须有返回值 |
| `noUncheckedIndexedAccess` | 索引访问返回 T \| undefined |
| `exactOptionalPropertyTypes` | 精确的可选属性类型 |

## 注意事项

- 如果已存在 tsconfig.json，会询问是否覆盖
- 新项目建议从严格配置开始
- 现有项目迁移时可能需要逐步启用严格选项
