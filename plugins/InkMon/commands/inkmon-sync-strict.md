---
description: Strict sync - sync InkMon JSON files with database (check content)
allowed-tools: mcp__inkmon-mcp__batch_compare, mcp__inkmon-mcp__sync_inkmon
model: sonnet
---

# InkMon Sync Strict - 严格同步

扫描 `data/inkmons/` 目录，检查 JSON 内容与数据库的一致性，同步差异。

## 工作流程

1. **批量比较** - 调用 `batch_compare` 一次性获取所有差异
2. **查看结果** - 分析返回的差异摘要
3. **执行同步** - 对需要处理的项调用 `sync_inkmon(name_en)`

## 输出格式

```
📊 严格同步 data/inkmons/ ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总计: 15 | ✅一致: 12 | 🔄差异: 2 | 🆕未入库: 1

需处理:
  🆕 NewMon
  🔄 Flamefox (3处差异)
  🔄 Aquadragon (1处差异)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
开始同步...
✅ [NewMon] added: 添加成功
🔄 [Flamefox] updated: 更新成功
🔄 [Aquadragon] updated: 更新成功
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
完成: 1 新增, 2 更新
```

## 注意事项

- 严格模式会检查每个文件的完整内容
- 使用 MCP 侧的比较函数，减少 token 消耗
- 适用于修改了已入库 InkMon 的 JSON 文件后同步
