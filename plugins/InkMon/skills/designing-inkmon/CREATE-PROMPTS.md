# 创建提示词模板

用于 `/inkmon create` 创建新 InkMon。

---

## 提示词结构

| 组成部分 | 目的 | 英文提示词片段 |
|---------|------|---------------|
| **一致性约束** | 强调与参考图一致 | `Matching the style and viewing angle of the reference image.` |
| **世界观锚点** | InkWorld 统一标识 | `**InkMon** creature from **InkWorld**.` |
| **风格锚点词** | 5个关键词锁定风格 | `Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface.` |
| **主体描述** | **核心：** 生物设计 | `The subject is a **[生物名称]** based on a **[原型动物]**, featuring **[独特特征]**. It has **[具体材质/装备]**. [可选姿势]` |
| **环境与背景** | 底座 + 背景 | `On a stone pedestal. White background.` |
| **技术参数** | 分辨率和比例 | `--ar 1:1 --Resolution 2K` |


---

## 完整示例：苔藓熊 (mature)

```
Matching the style and viewing angle of the reference image. **InkMon** creature from **InkWorld**. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. The subject is a **Moss Bear** based on a **Grizzly Bear**, featuring **clumps of green moss for fur and crystalline rock claws**. It has **earthy green and brown tones**. On a stone pedestal. White background. --ar 1:1 --Resolution 2K
```
