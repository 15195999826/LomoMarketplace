# AI生图提示词模板

**核心理念**：所有生物属于同一个世界 —— **InkWorld**，统称为 **InkMon**

---

## 工作流程说明

本文档采用**两阶段工作流**，这是专业游戏美术资产生成的标准流程：

### **阶段一：主概念设计**
- 生成与参考图相同视角的角色主概念图
- 这是包含最完整设计信息的"真理标准"
- 视角由参考图决定，无需额外描述
- 给 AI 更多设计自由度

### **阶段二：四视图扩展**
基于阶段一的主概念图，依次生成四个正交视角：
1. **Front View**（正面）
2. **Left Side View**（左侧面）
3. **Right Side View**（右侧面）
4. **Back View**（背面）

**为什么分两步？**
- 先确定设计，再扩展标准视角
- AI 难以直接生成一致的四视图
- 符合"Concept to Turnaround"的专业流程

---

# 第一阶段：主概念设计

## 阶段一核心说明

在这个阶段，我们专注于**创造设计**。目标是生成一张与参考图相同视角的概念图，它将成为后续所有视角的"真理标准"。

**关键要点：**
- **参考图携带大量信息**（光影、色调、多边形密度），风格描述可极简化
- 只需保留 5 个"锚点词"激活风格
- 主体描述是核心变量

---

## 提示词结构概览

阶段一的提示词由以下模块组成：

| 模块 | 必填/可选 | 说明 |
|------|----------|------|
| 参考图 | 必填 | 锁定风格和视角 |
| 一致性约束 | 必填 | 强调与参考图风格/视角一致 |
| 世界观锚点 | 必填 | InkWorld / InkMon 统一标识 |
| 风格锚点词 | 必填 | 5个关键词锁定风格 |
| **主体描述** | **核心** | 生物设计的核心内容（姿势可选） |
| 环境与背景 | 必填 | 底座 + 纯色背景 |
| 技术参数 | 必填 | `--ar 1:1 --Resolution 2K` |

### 风格锚点词

只需 5 个关键词，配合参考图即可锁定 InkMon 风格：

| 锚点词 | 锁定的特征 |
|--------|-----------|
| `low poly` | 几何结构（低多边形） |
| `faceted` | 切面感 |
| `sharp edges` | 硬边 |
| `ink sketch texture` | 材质纹理（排线、墨线） |
| `non-reflective surface` | 无反射表面（哑光质感） |

---

## 基础生物模板

| 组成部分 | 目的 | 英文提示词片段 |
|---------|------|---------------|
| **参考图** | 锁定风格和视角 | `[你的风格参考图链接]` |
| **一致性约束** | 强调与参考图一致 | `Matching the style and viewing angle of the reference image.` |
| **世界观锚点** | InkWorld 统一标识 | `**InkMon** creature from **InkWorld**.` |
| **风格锚点词** | 5个关键词锁定风格 | `Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface.` |
| **主体描述** | **核心：** 生物设计（姿势可选） | `The subject is a **[生物名称]** based on a **[原型动物]**, featuring **[独特特征]**. It has **[具体材质/装备]**. [可选姿势]` |
| **环境与背景** | 底座 + 背景 | `On a stone pedestal. White background.` |
| **技术参数** | 分辨率和比例 | `--ar 1:1 --Resolution 2K` |

### 完整示例：苔藓熊

```
[参考图链接] Matching the style and viewing angle of the reference image. **InkMon** creature from **InkWorld**. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. The subject is a **Moss Bear** based on a **Grizzly Bear**, featuring **clumps of green moss for fur and crystalline rock claws**. It has **earthy green and brown tones**. On a stone pedestal. White background. --ar 1:1 --Resolution 2K
```

---

## 进化型模板

### 核心逻辑

"进化"意味着**保留特征 A + 增强特征 B**。

**进化的四个要素：**
1. **体型变大** (Bigger / Bulkier)
2. **复杂度增加** (More intricate details / Armor)
3. **元素特征强化** (Element amplification)
4. **气质更成熟** (More aggressive / Mature)

### 模板表格

| 组成部分 | 目的 | 英文提示词片段 |
|---------|------|---------------|
| **参考图** | **关键：放初始形态的图** | `[初始形态的图片链接]` |
| **一致性约束** | 强调与参考图一致 | `Matching the style and viewing angle of the reference image.` |
| **进化关系** | 告诉 AI 这是进化型 | `An **evolved form** of the creature in the reference image.` |
| **世界观锚点** | InkWorld 统一标识 | `**InkMon** creature from **InkWorld**.` |
| **风格锚点词** | 5个关键词锁定风格 | `Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface.` |
| **主体描述** | **核心：** 进化后的设计 | `The subject is **[进化体名称]**, the evolved form of **[初始体名称]**. It features **[体型变化]**, **[装备/元素增强]**, and **[更成熟/凶猛的特征]**. [可选姿势]` |
| **特征继承** | 保留配色和核心识别点 | `Retain the original color palette but make it more complex and powerful.` |
| **环境与背景** | 底座 + 背景 | `On a stone pedestal. White background.` |
| **技术参数** | 分辨率和比例 | `--ar 1:1 --Resolution 2K` |

### 完整示例：苔藓森林守护者

```
[苔藓熊的图片链接] Matching the style and viewing angle of the reference image. An **evolved form** of the creature in the reference image. **InkMon** creature from **InkWorld**. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. The subject is **Moss Forest Guardian**, the evolved form of the **Moss Bear**. It features a **massive bipedal stance**, **large crystal formations on shoulders**, and **small trees growing from its back**. It looks **more aggressive, mature, and powerful**. Retain the original color palette but make it more complex and powerful. On a stone pedestal. White background. --ar 1:1 --Resolution 2K
```

---

## 幼年型模板

### 核心逻辑：减法设计

"幼年形态"是做**减法**：保留核心特征，但变得更小、更圆润、更简单、更可爱。

**幼年形态的四个要素：**
1. **比例变化**：大头小身子 (Chibi proportions)
2. **细节简化**：去掉尖锐装甲，简化纹理
3. **特征弱化**：未发育完全的特征
4. **气质变化**：呆萌、无害、好奇

### 模板表格

| 组成部分 | 目的 | 英文提示词片段 |
|---------|------|---------------|
| **参考图** | 放成熟体的图 | `[成熟形态的图片链接]` |
| **一致性约束** | 强调与参考图一致 | `Matching the style and viewing angle of the reference image.` |
| **退化关系** | 明确这是幼年阶段 | `A **baby form** of the creature in the reference image.` |
| **世界观锚点** | InkWorld 统一标识 | `**InkMon** creature from **InkWorld**.` |
| **风格锚点词** | 5个关键词锁定风格 | `Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface.` |
| **主体描述** | **核心：** 幼年形态设计 | `The subject is a **[幼年体名称]**, the baby form of **[成熟体名称]**. It features **chibi proportions**, **large head**, **huge curious eyes**, and **short stubby limbs**. It looks **clumsy, cute, and innocent**. [可选姿势]` |
| **特征弱化** | 描述特征的"萌化"版本 | `The [核心特征] is just [弱化描述] (e.g., moss → small sprouts, claws → tiny pebbles).` |
| **配色保持** | 保持配色一致 | `Maintain the same color palette.` |
| **环境与背景** | 底座 + 背景 | `On a small stone pedestal. White background.` |
| **技术参数** | 分辨率和比例 | `--ar 1:1 --Resolution 2K` |

### 完整示例：苔藓宝宝熊

```
[苔藓熊的图片链接] Matching the style and viewing angle of the reference image. A **baby form** of the creature in the reference image. **InkMon** creature from **InkWorld**. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. The subject is a **Moss Baby Bear**, the baby form of **Moss Bear**. It features **chibi proportions**, **large head**, **huge curious eyes**, and **short stubby limbs**. It looks **clumsy, cute, and innocent**. The moss on its back is just **small sprouts**, and its claws are **tiny pebbles**. Maintain the same color palette. On a small stone pedestal. White background. --ar 1:1 --Resolution 2K
```

---

# 第二阶段：四视图扩展

## 阶段二核心说明

在这个阶段，目标是**视角旋转**，基于阶段一的主概念图生成四个正交视图。

**核心概念：虚拟转盘**
- 角色是静止不动的，动的是摄像机
- 使用 `Orthographic view`（正交视图）防止透视变形
- 使用 `Exact same pose`（相同姿势）确保姿态一致

**四个标准视角：**
1. **Front View**（正面）
2. **Left Profile View**（左侧面）
3. **Right Profile View**（右侧面）
4. **Back View**（背面）

---

## 提示词结构概览

| 模块 | 必填/可选 | 说明 |
|------|----------|------|
| 参考图 | 必填 | 阶段一生成的 3/4 视角主概念图 |
| 一致性约束 | 必填 | 强调完全相同的角色和姿势 |
| 视角指令 | 必填 | 正交视图 + 具体方向 |
| 风格锚点词 | 必填 | 与阶段一相同 |
| 环境与背景 | 必填 | 底座 + 纯色背景 |
| 技术参数 | 必填 | `--ar 1:1 --Resolution 2K` |

---

## 四视图通用模板

| 组成部分 | 目的 | 英文提示词片段 |
|---------|------|---------------|
| **参考图** | 阶段一的 3/4 视角主概念图 | `[阶段一图片链接]` |
| **一致性约束** | 强调完全相同的角色和姿势 | `3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**.` |
| **视角指令** | 正交视图 + 方向 | `Orthographic **[方向]** view.` |
| **风格锚点词** | 锁定风格 | `Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface.` |
| **环境与背景** | 底座 + 背景 | `On a stone pedestal. White background.` |
| **技术参数** | 分辨率和比例 | `--ar 1:1 --Resolution 2K` |

---

## 四视图具体提示词

### Front View（正面）

```
[参考图链接] 3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **front** view. **Facing directly toward the camera, looking straight at the viewer**. Perfectly symmetrical front facing. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K

Generate 10 times using the same prompt. Start the next generation after each one completes.
```

### Left Profile View（左侧面）

```
[参考图链接] 3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **left profile** view. Perfectly sideways, facing left. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K

Generate 10 times using the same prompt. Start the next generation after each one completes.
```

### Right Profile View（右侧面）

```
[参考图链接] 3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **right profile** view. Perfectly sideways, facing right. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K

Generate 10 times using the same prompt. Start the next generation after each one completes.
```

### Back View（背面）

```
[参考图链接] 3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **back** view. Seeing the creature from behind, no face visible. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K

Generate 10 times using the same prompt. Start the next generation after each one completes.
```

---

## 负向提示词速查表（可选）

当 AI 总是画错视角时，添加负向提示词：

| 目标视角 | 负向提示词 |
|---------|-----------|
| **Front View** | `3/4 view, 45 degree angle, side view, back view, profile` |
| **Left/Right Profile** | `front view, 3/4 view, 45 degree angle, both eyes visible, back view` |
| **Back View** | `front view, 3/4 view, 45 degree angle, face visible, eyes visible` |
