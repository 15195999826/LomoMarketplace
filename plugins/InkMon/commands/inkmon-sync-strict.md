---
description: Strict sync - sync InkMon JSON files with database (check content)
allowed-tools: Glob, Read, mcp__inkmon-mcp__get_inkmon, mcp__inkmon-mcp__add_inkmon, mcp__inkmon-mcp__update_inkmon
model: sonnet
---

# InkMon Sync Strict - 严格同步

扫描 `data/inkmons/` 目录，检查 JSON 内容与数据库的一致性，同步差异。

## 工作流程

1. **扫描本地文件** - 使用 Glob 扫描 `data/inkmons/*.json`
2. **逐个检查** - 对每个文件：
   - 读取 JSON 内容
   - 调用 `get_inkmon` 查询数据库
   - 比较内容是否一致
3. **执行同步**：
   - 数据库中不存在 → `add_inkmon` 入库
   - 存在但内容不同 → `update_inkmon` 更新
   - 内容一致 → 跳过

## 比较字段

比较以下关键字段的一致性：
- `name` - 中文名
- `dex_number` - 图鉴编号
- `description` - 描述
- `elements` - 属性
- `stats` - 六维数据
- `design` - 设计信息
- `evolution` - 进化信息
- `ecology` - 生态信息
- `image_prompts` - 图像提示词

## 输出格式

```
📊 严格同步 data/inkmons/ ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏭️ MossBear - 一致，跳过
🔄 Flamefox - 内容变更，已更新
   - description: 变更
   - stats.hp: 80 → 85
✅ Aquadragon - 新增入库 (#3)
❌ BadFile - 失败: [错误信息]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
完成: 1 新增, 1 更新, 1 跳过, 1 失败
```

## 注意事项

- 严格模式会检查每个文件的完整内容
- 比快速同步慢，但能确保数据一致性
- 适用于修改了已入库 InkMon 的 JSON 文件后同步
