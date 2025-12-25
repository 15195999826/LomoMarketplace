---
description: Design devolution (pre-evolution) form for an existing InkMon
argument-hint: <name>
allowed-tools: Read, Write, Glob, Grep, Bash, mcp__inkmon-mcp__get_next_dex_number
model: sonnet
---

# InkMon Devo - 退化设计

为现有 InkMon 设计**上一阶段**的形态。

**目标 InkMon**: `$ARGUMENTS`

```
退化方向: adult → mature → baby
```

## 工作流程

1. **读取原 InkMon** - 从 `data/inkmons/$ARGUMENTS.json` 读取，了解当前特征和设计
2. **检查阶段** - 如果已经是 `baby`，无法继续退化
3. **读取退化提示词模板** - 参考 `skills/designing-inkmon/DEVO-PROMPTS.md`
4. **讨论退化变化** - 更小、更圆润、特征弱化、更可爱
5. **生成新 InkMon** - 创建退化后的 JSON 文件
6. **更新进化关系** - 更新原 InkMon 的 `evolves_from` 字段

## 退化的四个要素（减法设计）

- 比例变化：更小、大头小身子 (Chibi proportions)
- 细节简化：去掉复杂装甲，简化纹理
- 特征弱化：未发育完全的特征
- 气质变化：更可爱、呆萌、无害

## 示例

```bash
/inkmon-devo MossBear
# MossBear (mature) → MossBaby (baby)
```
