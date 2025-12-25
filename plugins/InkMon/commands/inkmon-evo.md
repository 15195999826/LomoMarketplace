---
description: Design evolution form for an existing InkMon
argument-hint: <name>
allowed-tools: Read, Write, Glob, Grep, Bash, mcp__inkmon-mcp__get_next_dex_number
model: sonnet
---

# InkMon Evo - 进化设计

为现有 InkMon 设计**进化后**的形态。

**目标 InkMon**: `$ARGUMENTS`

```
进化方向: baby → mature → adult
```

## 工作流程

1. **读取原 InkMon** - 从 `data/inkmons/$ARGUMENTS.json` 读取，了解当前特征和设计
2. **检查阶段** - 如果已经是 `adult`，无法继续进化
3. **读取进化提示词模板** - 参考 `skills/designing-inkmon/EVO-PROMPTS.md`
4. **讨论进化变化** - 体型变大、复杂度增加、特征强化、气质更成熟
5. **生成新 InkMon** - 创建进化后的 JSON 文件
6. **更新进化关系** - 更新原 InkMon 的 `evolves_to` 数组

## 进化的四个要素

- 体型变大 (Bigger / Bulkier)
- 复杂度增加 (More intricate details / Armor)
- 元素特征强化 (Element amplification)
- 气质更成熟 (More aggressive / Mature)

## 示例

```bash
/inkmon-evo MossBear
# MossBear (mature) → MossForestGuardian (adult)
```
