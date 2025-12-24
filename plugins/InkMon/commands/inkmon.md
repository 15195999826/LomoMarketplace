---
description: InkMon creature management (create, evolve, devolve, add to database)
argument-hint: create | evo <name> | devo <name> | add <file.json>
allowed-tools: Read, Write, Glob, Grep
model: sonnet
---

# InkMon Management

根据参数执行不同操作：

---

## create - 进入创建工作流

开始 InkMon 设计讨论。

### 设计流程

1. **确定进化阶段** - 首先询问：这是 baby / mature / adult？
2. **概念讨论** - 了解设计灵感和概念
3. **确定属性和六维数值** - 参考属性克制和数值分配指南
4. **生态设计** - 栖息地、食性、天敌关系
5. **生成 design 提示词** - 为 AI 绘图生成视觉描述
6. **保存为 JSON 文档** - 保存到 `data/inkmons/` 目录

**Skill 支持**: `designing-inkmon` 会自动激活提供知识支持

### 开始创建

让我们开始设计你的 InkMon！请告诉我：
- 这是什么进化阶段？（baby / mature / adult）
- 想创建什么类型的生物？（基于什么动物？）
- 想要什么属性？（火、水、草、电、冰等）

---

## evo <name> - 进化设计

为现有 InkMon 设计**进化后**的形态。

```
进化方向: baby → mature → adult
```

### 工作流程

1. **读取原 InkMon** - 从 `data/inkmons/<name>.json` 读取
2. **检查阶段** - 如果已经是 `adult`，无法继续进化
3. **讨论进化变化** - 体型变大、复杂度增加、特征强化、气质更成熟
4. **生成新 InkMon** - 创建进化后的 JSON 文件
5. **更新进化关系** - 更新原 InkMon 的 `evolves_to` 数组

### 进化的四个要素

- 体型变大 (Bigger / Bulkier)
- 复杂度增加 (More intricate details / Armor)
- 元素特征强化 (Element amplification)
- 气质更成熟 (More aggressive / Mature)

### 示例

```bash
/inkmon evo MossBear
# MossBear (mature) → MossForestGuardian (adult)
```

---

## devo <name> - 退化设计

为现有 InkMon 设计**上一阶段**的形态。

```
退化方向: adult → mature → baby
```

### 工作流程

1. **读取原 InkMon** - 从 `data/inkmons/<name>.json` 读取
2. **检查阶段** - 如果已经是 `baby`，无法继续退化
3. **讨论退化变化** - 更小、更圆润、特征弱化、更可爱
4. **生成新 InkMon** - 创建退化后的 JSON 文件
5. **更新进化关系** - 更新原 InkMon 的 `evolves_from` 字段

### 退化的四个要素（减法设计）

- 比例变化：更小、大头小身子 (Chibi proportions)
- 细节简化：去掉复杂装甲，简化纹理
- 特征弱化：未发育完全的特征
- 气质变化：更可爱、呆萌、无害

### 示例

```bash
/inkmon devo MossBear
# MossBear (mature) → MossBaby (baby)
```

---

## add <file.json> - 执行入库（第二阶段）

解析指定的 InkMon JSON 文档，校验 Schema 后入库。

**示例**:
```bash
/inkmon add data/inkmons/MossBear.json
```

**校验内容**:
- JSON 格式正确性
- 必填字段完整性
- 进化阶段有效性 (baby / mature / adult)
- 数值合理性 (BST 与阶段匹配)

> 注意：入库功能将在第二阶段实现，届时会连接 MCP Server 和 SQLite 数据库。
