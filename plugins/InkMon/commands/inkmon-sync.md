---
description: Quick sync - add new InkMon JSON files to database
allowed-tools: mcp__inkmon-mcp__list_local_files, mcp__inkmon-mcp__list_inkmons_name_en, mcp__inkmon-mcp__sync_inkmon
model: sonnet
---

# InkMon Sync - 快速同步

扫描 `data/inkmons/` 目录，将新的 InkMon JSON 文件入库。

## 工作流程

1. **获取列表** - 并行调用：
   - `list_local_files` 获取本地文件列表
   - `list_inkmons_name_en` 获取数据库列表
2. **对比差异** - 找出本地有但数据库没有的文件
3. **入库新文件** - 对每个新文件调用 `sync_inkmon(name_en)`

## 判断逻辑

- 文件名 = InkMon 英文名（如 `MossBear.json` → `MossBear`）
- 文件名在数据库列表中 → 跳过
- 文件名不在数据库列表中 → 入库

## 输出格式

```
📊 扫描 data/inkmons/ ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
本地文件: 15 | 数据库: 12 | 待入库: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Flamefox - 入库成功
✅ Aquadragon - 入库成功
❌ BadFile - 入库失败: [错误信息]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
完成: 2 新增, 1 失败
```

## 注意事项

- 只检查文件名是否存在，不检查内容一致性
- 如需检查内容一致性，请使用 `/InkMon:inkmon-sync-strict`
- JSON 文件必须符合 InkMon Schema
