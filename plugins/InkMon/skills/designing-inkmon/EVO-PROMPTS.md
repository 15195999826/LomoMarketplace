# 进化提示词模板

用于 `/inkmon evo` 生成进化后的 InkMon。

```
进化方向: baby → mature → adult
```

---

## 进化的四个要素

1. **体型变大** (Bigger / Bulkier)
2. **复杂度增加** (More intricate details / Armor)
3. **元素特征强化** (Element amplification)
4. **气质更成熟** (More aggressive / Mature)

---

## 提示词结构

| 组成部分 | 目的 | 英文提示词片段 |
|---------|------|---------------|
| **一致性约束** | 强调与参考图一致 | `Matching the style and viewing angle of the reference image.` |
| **进化关系** | 告诉 AI 这是进化型 | `An **evolved form** of the creature in the reference image.` |
| **世界观锚点** | InkWorld 统一标识 | `**InkMon** creature from **InkWorld**.` |
| **风格锚点词** | 5个关键词锁定风格 | `Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface.` |
| **主体描述** | **核心：** 进化后的设计 | `The subject is **[进化体名称]**, the evolved form of **[原形态名称]**. It features **[体型变化]**, **[装备/元素增强]**, and **[更成熟/凶猛的特征]**. [可选姿势]` |
| **特征继承** | 保留配色和核心识别点 | `Retain the original color palette but make it more complex and powerful.` |
| **环境与背景** | 底座 + 背景 | `On a stone pedestal. White background.` |
| **技术参数** | 分辨率和比例 | `--ar 1:1 --Resolution 2K` |

---

## 完整示例：苔藓熊 → 森林守护者 (mature → adult)

```
Matching the style and viewing angle of the reference image. An **evolved form** of the creature in the reference image. **InkMon** creature from **InkWorld**. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. The subject is **Moss Forest Guardian**, the evolved form of the **Moss Bear**. It features a **massive bipedal stance**, **large crystal formations on shoulders**, and **small trees growing from its back**. It looks **more aggressive, mature, and powerful**. Retain the original color palette but make it more complex and powerful. On a stone pedestal. White background. --ar 1:1 --Resolution 2K
```
