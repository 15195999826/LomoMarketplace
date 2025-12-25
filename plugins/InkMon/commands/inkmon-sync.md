---
description: Quick sync - add new InkMon JSON files to database
allowed-tools: Glob, Read, mcp__inkmon-mcp__list_inkmons_name_en, mcp__inkmon-mcp__add_inkmon
model: sonnet
---

# InkMon Sync - 快速同步

扫描 `data/inkmons/` 目录，将新的 InkMon JSON 文件入库。

## 工作流程

1. **获取已入库列表** - 调用 `list_inkmons_name_en` 获取数据库中所有英文名
2. **扫描本地文件** - 使用 Glob 扫描 `data/inkmons/*.json`
3. **对比差异** - 文件名（去掉 .json）与数据库列表对比
4. **入库新文件** - 不在库中的文件，读取并调用 `add_inkmon` 入库

## 判断逻辑

- 文件名 = InkMon 英文名（如 `MossBear.json` → `MossBear`）
- 文件名在数据库列表中 → 跳过
- 文件名不在数据库列表中 → 入库

## 输出格式

```
📊 扫描 data/inkmons/ ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏭️ MossBear - 已存在，跳过
✅ Flamefox - 新增入库 (#2)
✅ Aquadragon - 新增入库 (#3)
❌ BadFile - 入库失败: [错误信息]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
完成: 2 新增, 1 跳过, 1 失败
```

## 注意事项

- 只检查文件名是否存在，不检查内容一致性
- 如需检查内容一致性，请使用 `/inkmon-sync-strict`
- JSON 文件必须符合 InkMon Schema
