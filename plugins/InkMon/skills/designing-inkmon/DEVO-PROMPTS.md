# 退化提示词模板

用于 `/inkmon-devo` 设计上一阶段形态。

```
退化方向: adult → mature → baby
```

---

## 退化的四个要素（减法设计）

1. **比例变化**：更小、大头小身子 (Chibi proportions)
2. **细节简化**：去掉复杂装甲，简化纹理
3. **特征弱化**：未发育完全的特征
4. **气质变化**：更可爱、呆萌、无害

---

## 提示词结构

| 组成部分 | 目的 | 英文提示词片段 |
|---------|------|---------------|
| **一致性约束** | 强调与参考图一致 | `Matching the style and viewing angle of the reference image.` |
| **退化关系** | 明确这是更早阶段 | `A **younger/earlier form** of the creature in the reference image.` |
| **世界观锚点** | InkWorld 统一标识 | `**InkMon** creature from **InkWorld**.` |
| **风格锚点词** | 5个关键词锁定风格 | `Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface.` |
| **主体描述** | **核心：** 退化后的设计 | `The subject is a **[退化体名称]**, the younger form of **[原形态名称]**. It features **[更小的体型]**, **[简化的特征]**, and **[更可爱的气质]**. [可选姿势]` |
| **特征弱化** | 描述特征的简化版本 | `The [核心特征] is [弱化描述] (e.g., crystal → small pebbles, armor → soft fur).` |
| **配色保持** | 保持配色一致 | `Maintain the same color palette.` |
| **环境与背景** | 底座 + 背景 | `On a small stone pedestal. White background.` |
| **技术参数** | 分辨率和比例 | `--ar 1:1 --Resolution 2K` |

---

## 完整示例：苔藓熊 → 苔藓宝宝 (mature → baby)

```
Matching the style and viewing angle of the reference image. A **younger/earlier form** of the creature in the reference image. **InkMon** creature from **InkWorld**. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. The subject is a **Moss Baby Bear**, the younger form of **Moss Bear**. It features **chibi proportions**, **large head**, **huge curious eyes**, and **short stubby limbs**. It looks **clumsy, cute, and innocent**. The moss on its back is just **small sprouts**, and its claws are **tiny pebbles**. Maintain the same color palette. On a small stone pedestal. White background. --ar 1:1 --Resolution 2K
```
