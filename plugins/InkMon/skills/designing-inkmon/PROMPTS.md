# InkMon Design 提示词模板

**核心理念**：所有生物属于同一个世界 —— **InkWorld**，统称为 **InkMon**

---

## InkWorld 风格锚点词

所有 InkMon 共用 5 个风格锚点词：

| 锚点词 | 锁定的特征 |
|--------|-----------|
| `low poly` | 几何结构（低多边形） |
| `faceted` | 切面感 |
| `sharp edges` | 硬边 |
| `ink sketch texture` | 材质纹理（排线、墨线） |
| `non-reflective surface` | 无反射表面（哑光质感） |

---

## 基础生物模板

用于 `/inkmon create` 创建新 InkMon。

### 提示词结构

| 组成部分 | 目的 | 英文提示词片段 |
|---------|------|---------------|
| **一致性约束** | 强调与参考图一致 | `Matching the style and viewing angle of the reference image.` |
| **世界观锚点** | InkWorld 统一标识 | `**InkMon** creature from **InkWorld**.` |
| **风格锚点词** | 5个关键词锁定风格 | `Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface.` |
| **主体描述** | **核心：** 生物设计 | `The subject is a **[生物名称]** based on a **[原型动物]**, featuring **[独特特征]**. It has **[具体材质/装备]**. [可选姿势]` |
| **环境与背景** | 底座 + 背景 | `On a stone pedestal. White background.` |
| **技术参数** | 分辨率和比例 | `--ar 1:1 --Resolution 2K` |

> **注意**：JSON 中保存的提示词不包含参考图链接，Web 端使用时会提示用户添加。

### 完整示例：苔藓熊 (mature)

```
Matching the style and viewing angle of the reference image. **InkMon** creature from **InkWorld**. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. The subject is a **Moss Bear** based on a **Grizzly Bear**, featuring **clumps of green moss for fur and crystalline rock claws**. It has **earthy green and brown tones**. On a stone pedestal. White background. --ar 1:1 --Resolution 2K
```

---

## 进化型模板

用于 `/inkmon evo` 生成进化后的 InkMon。

### 进化的四个要素

1. **体型变大** (Bigger / Bulkier)
2. **复杂度增加** (More intricate details / Armor)
3. **元素特征强化** (Element amplification)
4. **气质更成熟** (More aggressive / Mature)

### 提示词结构

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

> **注意**：Web 端使用时需添加进化前形态的参考图链接。

### 完整示例：苔藓熊 → 森林守护者 (mature → adult)

```
Matching the style and viewing angle of the reference image. An **evolved form** of the creature in the reference image. **InkMon** creature from **InkWorld**. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. The subject is **Moss Forest Guardian**, the evolved form of the **Moss Bear**. It features a **massive bipedal stance**, **large crystal formations on shoulders**, and **small trees growing from its back**. It looks **more aggressive, mature, and powerful**. Retain the original color palette but make it more complex and powerful. On a stone pedestal. White background. --ar 1:1 --Resolution 2K
```

---

## 退化型模板

用于 `/inkmon devo` 设计上一阶段形态。

### 退化逻辑

```
进化 (evo):  baby → mature → adult
退化 (devo): adult → mature → baby
```

### 退化的四个要素（减法设计）

1. **比例变化**：更小、大头小身子 (Chibi proportions)
2. **细节简化**：去掉复杂装甲，简化纹理
3. **特征弱化**：未发育完全的特征
4. **气质变化**：更可爱、呆萌、无害

### 提示词结构

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

> **注意**：Web 端使用时需添加退化前形态的参考图链接。

### 完整示例：苔藓熊 → 苔藓宝宝 (mature → baby)

```
Matching the style and viewing angle of the reference image. A **younger/earlier form** of the creature in the reference image. **InkMon** creature from **InkWorld**. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. The subject is a **Moss Baby Bear**, the younger form of **Moss Bear**. It features **chibi proportions**, **large head**, **huge curious eyes**, and **short stubby limbs**. It looks **clumsy, cute, and innocent**. The moss on its back is just **small sprouts**, and its claws are **tiny pebbles**. Maintain the same color palette. On a small stone pedestal. White background. --ar 1:1 --Resolution 2K
```

---

## 进化阶段与 BST 参考

| 阶段 | 英文 | 特点 | BST 范围 |
|-----|------|------|---------|
| 幼年体 | baby | 可爱、圆润、简单 | 250-320 |
| 成熟体 | mature | 平衡、有力量感 | 350-420 |
| 成年体 | adult | 威严、复杂、完成感 | 450-550 |

---

## 提示词生成检查清单

- [ ] 包含一致性约束 (Matching the style...)
- [ ] 包含世界观锚点 (InkMon from InkWorld)
- [ ] 包含 5 个风格锚点词
- [ ] 主体描述包含：名称、原型动物、独特特征、材质/装备
- [ ] 进化/退化时说明与原形态的关系
- [ ] 包含环境与背景 (stone pedestal, white background)
- [ ] 包含技术参数 (--ar 1:1 --Resolution 2K)

> **注意**：JSON 中不保存参考图链接，Web 端使用时会提示用户添加。
