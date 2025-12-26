---
name: using-alignment-enums
description: ReactUMG 对齐/居中与可见性/显隐枚举值速查。在设置水平对齐、垂直对齐、HorizontalAlignment、VerticalAlignment、Visibility、隐藏/显示组件时激活。注意 Center=2（不是1）、Visible=0、Collapsed=1 等常见混淆点。
---

# ReactUMG 对齐枚举速查

## EHorizontalAlignment (水平对齐)

| 值 | 枚举名 | 说明 |
|----|--------|------|
| 0 | HAlign_Fill | 填充 |
| 1 | HAlign_Left | 左对齐 |
| **2** | **HAlign_Center** | **居中** |
| 3 | HAlign_Right | 右对齐 |

## EVerticalAlignment (垂直对齐)

| 值 | 枚举名 | 说明 |
|----|--------|------|
| 0 | VAlign_Fill | 填充 |
| 1 | VAlign_Top | 顶部 |
| **2** | **VAlign_Center** | **居中** |
| 3 | VAlign_Bottom | 底部 |

## ESlateVisibility (可见性)

| 值 | 枚举名 | 说明 |
|----|--------|------|
| 0 | Visible | 可见，可交互 |
| 1 | Collapsed | 折叠（不渲染，不占空间） |
| 2 | Hidden | 隐藏（不渲染，但占空间） |
| 3 | HitTestInvisible | 可见，不响应点击 |
| 4 | SelfHitTestInvisible | 可见，自身不响应（子元素可响应） |

## 常见错误

```typescript
// ❌ 错误：1 不是 Center
HorizontalAlignment: 1,  // 这是 Left！
VerticalAlignment: 1,    // 这是 Top！

// ✅ 正确：2 才是 Center
HorizontalAlignment: 2,  // Center
VerticalAlignment: 2,    // Center
```

## 正确用法示例

```typescript
// OverlaySlot 居中对齐
const overlaySlot: OverlaySlot = {
    HorizontalAlignment: 2,  // Center (不是 1!)
    VerticalAlignment: 2,    // Center (不是 1!)
};

// VerticalBoxSlot 水平居中
const centerSlot: VerticalBoxSlot = {
    HorizontalAlignment: 2,  // Center
};

// 控制可见性
<Border Visibility={isVisible ? 0 : 1} />  // 0=Visible, 1=Collapsed
```

## 适用 Slot 类型

OverlaySlot, VerticalBoxSlot, HorizontalBoxSlot, BorderSlot, ButtonSlot, GridSlot, BackgroundBlurSlot

## 核心记忆点

- **居中是 2**，不是 1（1 是 Left/Top）
- **Visible=0, Collapsed=1**
