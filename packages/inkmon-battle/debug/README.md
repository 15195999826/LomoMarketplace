# Debug 工具

调试 InkMon 战斗录像的工具集。

## 工具列表

### check-replay-events.ts

分析录像中的事件类型和结构。

```bash
npx tsx debug/check-replay-events.ts
```

输出内容：
- 录像基本信息（版本、帧数、结果）
- 事件类型统计
- 关键事件检查（abilityTriggered, skillUse, damage 等）
- abilityTriggered 事件样本
- 帧时间线摘要

### export-replay-json.ts

导出完整录像为 JSON 文件，方便在其他工具中分析。

```bash
# 默认输出到 debug/replay.json
npx tsx debug/export-replay-json.ts

# 指定输出文件名
npx tsx debug/export-replay-json.ts my-battle.json
```

## 常见问题排查

### 攻击动画不播放

1. 运行 `check-replay-events.ts`
2. 检查 `abilityTriggered` 是否存在
3. 检查样本中的 `abilityConfigId` 是否为 `skill_basic_attack`
4. 确认渲染层的 Visualizer 是否处理了该事件类型

### 事件丢失

1. 导出 JSON 录像：`npx tsx debug/export-replay-json.ts`
2. 在 JSON 中搜索预期的事件 kind
3. 检查逻辑层是否正确调用 `eventCollector.push()`
