# Web 端四视图生成模板

> 本文档供 Web 开发参考，四视图生成是 Web 端的固定流程，不在 Claude Code 插件中实现。

---

## 工作流程概述

当用户在 Web 端查看一个未完成的 InkMon 时，显示如下流程：

```
┌─────────────────────────────────────────────────────────┐
│  InkMon: 苔藓熊 (MossBear)                              │
│  状态: 图片未生成                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  第一步：生成主概念图                                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  [Design 提示词 - 从 JSON 读取]                  │    │
│  │  [复制按钮]                                      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  第二步：生成四视图                                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  [Front View 提示词]  [复制]                     │    │
│  │  [Left View 提示词]   [复制]                     │    │
│  │  [Right View 提示词]  [复制]                     │    │
│  │  [Back View 提示词]   [复制]                     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  第三步：上传图片                                        │
│  [上传主概念图] [上传正面] [上传左侧] [上传右侧] [上传背面]│
│                                                         │
│  [完成提交]                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 四视图固定模板

四视图提示词是**固定模板**，只需替换 `[参考图链接]`。

### 核心概念

- 角色静止不动，摄像机旋转（虚拟转盘）
- 使用 `Orthographic view`（正交视图）防止透视变形
- 使用 `Maintain same character and pose` 确保一致性

---

### Front View（正面）

```
[参考图链接] 3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **front** view. **Facing directly toward the camera, looking straight at the viewer**. Perfectly symmetrical front facing. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K
```

### Left Profile View（左侧面）

```
[参考图链接] 3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **left profile** view. Perfectly sideways, facing left. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K
```

### Right Profile View（右侧面）

```
[参考图链接] 3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **right profile** view. Perfectly sideways, facing right. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K
```

### Back View（背面）

```
[参考图链接] 3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **back** view. Seeing the creature from behind, no face visible. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K
```

---

## 负向提示词（可选）

当 AI 总是画错视角时，可添加负向提示词：

| 目标视角 | 负向提示词 |
|---------|-----------|
| **Front View** | `3/4 view, 45 degree angle, side view, back view, profile` |
| **Left/Right Profile** | `front view, 3/4 view, 45 degree angle, both eyes visible, back view` |
| **Back View** | `front view, 3/4 view, 45 degree angle, face visible, eyes visible` |

---

## Web 实现建议

### 1. 模板存储

将模板存储在前端常量中：

```typescript
const FOUR_VIEWS_TEMPLATES = {
  front: `3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **front** view. **Facing directly toward the camera, looking straight at the viewer**. Perfectly symmetrical front facing. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K`,

  left: `3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **left profile** view. Perfectly sideways, facing left. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K`,

  right: `3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **right profile** view. Perfectly sideways, facing right. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K`,

  back: `3/4 view of the low poly ink creature in the reference image. **Maintain same character and pose**. Orthographic **back** view. Seeing the creature from behind, no face visible. Low poly, faceted, sharp edges, ink sketch texture, non-reflective surface. On a stone pedestal. White background. --ar 1:1 --Resolution 2K`
};
```

### 2. 使用说明

```typescript
function getPromptWithReference(view: keyof typeof FOUR_VIEWS_TEMPLATES, referenceUrl: string): string {
  return `[${referenceUrl}] ${FOUR_VIEWS_TEMPLATES[view]}`;
}
```

### 3. 数据库字段

InkMon 表需要的图片字段：

```sql
-- 主概念图（design 提示词生成）
image_design VARCHAR(500)

-- 四视图
image_front VARCHAR(500)
image_left VARCHAR(500)
image_right VARCHAR(500)
image_back VARCHAR(500)

-- 完成状态
images_complete BOOLEAN DEFAULT FALSE
```

---

## 生成建议

- **每个视角生成 10 次**，选择最佳结果
- 使用相同的随机种子（如果 AI 工具支持）提高一致性
- 主概念图是"真理标准"，四视图基于它生成
