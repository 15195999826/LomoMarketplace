---
description: Add InkMon JSON file to database
argument-hint: <file.json>
allowed-tools: Read, mcp__inkmon-mcp__add_inkmon
model: sonnet
---

# InkMon Add - 执行入库

解析指定的 InkMon JSON 文档，校验 Schema 后入库到 SQLite 数据库。

**目标文件**: `$ARGUMENTS`

## 工作流程

1. **读取 JSON 文件** - 使用 Read 工具读取指定路径的文件
2. **解析 JSON** - 确保格式正确
3. **调用 MCP 工具** - 使用 `add_inkmon` 工具入库

## 校验内容

MCP Server 会自动校验：
- **Schema 验证** - 字段类型和格式
- **BST 计算** - 六维之和 = bst
- **BST 范围** - baby(250-350), mature(350-450), adult(450-550)
- **风格锚点词** - 5个必须词检查
- **唯一性约束** - name_en 和 dex_number 不能重复

## 成功响应示例

```
[OK] InkMon "苔熊" (MossBear) 已入库
- 图鉴编号: #1
- 阶段: mature
- 属性: grass
- BST: 400
- 数据库 ID: 1
```

## 示例

```bash
/inkmon-add data/inkmons/MossBear.json
```
