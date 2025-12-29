# TypeScript Style Guide Plugin

严格的 TypeScript 编码规范插件，为 Claude Code 提供自动激活的编码规范指导。

## 📋 核心理念

- **严格类型检查** - 启用所有严格模式选项
- **Type 优先** - 默认使用 `type`，仅在需要声明合并时使用 `interface`
- **命名导出** - 优先使用 named exports
- **async/await** - 异步代码使用 async/await

## 🧩 包含组件

### Skills（自动激活）

| Skill | 触发场景 |
|-------|---------|
| `typescript-naming` | 命名变量、函数、类、类型时 |
| `typescript-types` | 定义类型、使用泛型、避免 any 时 |
| `typescript-structure` | 组织模块、导入导出时 |
| `typescript-best-practices` | 错误处理、异步编程时 |

### Commands

- `/ts-init` - 初始化 tsconfig.json 模板

### Agents

- `ts-code-reviewer` - 审查代码是否符合规范

## 🚀 使用方式

### 本地测试

```bash
claude --plugin-dir ./plugins/typescript-style
```

### 触发 Skills

Skills 会在相关场景自动激活：
- 当你问 "这个变量应该怎么命名？"
- 当你写 TypeScript 代码时
- 当你讨论类型定义时

### 初始化 tsconfig

```
/typescript-style:ts-init
```

## 📁 目录结构

```
typescript-style/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── typescript-naming/
│   ├── typescript-types/
│   ├── typescript-structure/
│   └── typescript-best-practices/
├── commands/
│   └── ts-init.md
├── agents/
│   └── ts-code-reviewer.md
└── templates/
    └── tsconfig.strict.json
```

## 📄 License

MIT
