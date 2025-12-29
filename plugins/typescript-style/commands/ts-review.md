---
name: ts-review
description: 审查 TypeScript 代码是否符合规范
argument-hint: "<file-or-directory>"
allowed-tools:
  - Task
  - Read
  - Glob
  - Grep
---

# TypeScript 代码审查

使用 ts-code-reviewer agent 审查指定文件或目录的 TypeScript 代码。

## 使用方式

```
/typescript-style:ts-review src/utils/helper.ts     # 审查单个文件
/typescript-style:ts-review src/                    # 审查整个目录
/typescript-style:ts-review .                       # 审查当前目录
```

## 执行指令

使用 Task 工具启动 `ts-code-reviewer` agent，传入以下 prompt：

```
审查以下 TypeScript 代码: $ARGUMENTS

请按照四个维度（命名规范、类型规范、结构规范、最佳实践）进行检查，并生成结构化的审查报告。
```

agent 配置：
- **subagent_type**: `typescript-style:ts-code-reviewer`
- **model**: 继承父级（不指定）

## 审查内容

agent 会检查：
- ✅ 命名规范（camelCase、PascalCase、UPPER_SNAKE_CASE）
- ✅ 类型安全（禁止 any，使用 unknown，类型守卫）
- ✅ 代码结构（命名导出，导入顺序，单一职责）
- ✅ 最佳实践（async/await，const 优先，可选链）

## 输出格式

审查完成后会生成包含以下部分的报告：
- ✅ 符合规范的亮点
- ⚠️ 需要改进的问题
- ❌ 严重问题（必须修复）
- 📊 总体评分（每个维度 1-5 星）
