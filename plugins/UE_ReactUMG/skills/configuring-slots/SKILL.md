---
name: configuring-slots
description: ReactUMG Slot 布局/定位系统指南。在配置 CanvasPanel、设置组件位置/坐标/尺寸/大小、使用锚点/Anchors/Offsets、或实现居中/全屏/侧边栏等布局需求时激活。CanvasPanelSlot 有特殊的 Position→Offsets 映射规则，其他 17 种 Slot 直接使用。
---

# ReactUMG Slot 布局系统

## 核心结论

**只有 CanvasPanelSlot 需要特殊映射，其他 17 种 Slot 直接使用！**

## CanvasPanelSlot 映射规则

### Mode 1: Point Anchors（Minimum == Maximum）

Blueprint 显示：Position X/Y, Size X/Y

| Blueprint | TypeScript |
|-----------|------------|
| Position X | `LayoutData.Offsets.Left` |
| Position Y | `LayoutData.Offsets.Top` |
| Size X | `LayoutData.Offsets.Right` |
| Size Y | `LayoutData.Offsets.Bottom` |

```typescript
// 固定位置 + 固定尺寸
const Slot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {
            Minimum: {X: 0, Y: 0.5},  // 左中点
            Maximum: {X: 0, Y: 0.5}   // 相同 = Point Anchor
        },
        Offsets: {
            Left: 100,    // Position X
            Top: -50,     // Position Y
            Right: 200,   // Size X (宽度)
            Bottom: 100   // Size Y (高度)
        }
    }
};
```

### Mode 2: Range Anchors（Minimum ≠ Maximum）

Blueprint 显示：Offset Left/Top/Right/Bottom

```typescript
// 全屏拉伸
const Slot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {
            Minimum: {X: 0, Y: 0},    // 左上
            Maximum: {X: 1, Y: 1}     // 右下（Range Anchor）
        },
        Offsets: {
            Left: 10,     // 左边距
            Top: 10,      // 上边距
            Right: -10,   // 右边距（负数 = 向内）
            Bottom: -10   // 下边距
        }
    }
};
```

## 常见布局示例

### 1. 居中 80% x 90%
```typescript
Anchors: {Minimum: {X: 0.1, Y: 0.05}, Maximum: {X: 0.9, Y: 0.95}}
Offsets: {Left: 0, Top: 0, Right: 0, Bottom: 0}
```

### 2. 底部居中 40% 宽
```typescript
Anchors: {Minimum: {X: 0.3, Y: 0.85}, Maximum: {X: 0.7, Y: 1}}
Offsets: {Left: 0, Top: 0, Right: 0, Bottom: 0}
```

### 3. 左侧固定按钮
```typescript
Anchors: {Minimum: {X: 0, Y: 0.5}, Maximum: {X: 0, Y: 0.5}}
Offsets: {Left: 5, Top: -35, Right: 50, Bottom: 70}  // 50x70 按钮
```

## 18 种 Slot 类型速查

| Slot 类型 | 用途 | 关键属性 |
|-----------|------|----------|
| CanvasPanelSlot | 自由定位 | LayoutData, ZOrder |
| VerticalBoxSlot | 垂直布局 | Size, Padding, HAlign, VAlign |
| HorizontalBoxSlot | 水平布局 | Size, Padding, HAlign, VAlign |
| UniformGridSlot | 均匀网格 | Row, Column |
| GridSlot | 网格布局 | Row, Column, RowSpan, ColumnSpan |
| OverlaySlot | 覆盖层 | Padding, HAlign, VAlign |
| ScrollBoxSlot | 滚动容器 | Padding, HAlign, VAlign |
| BorderSlot | 边框容器 | Padding, HAlign, VAlign |

**其他 Slot 类型**：ButtonSlot, SafeZoneSlot, ScaleBoxSlot, SizeBoxSlot, StackBoxSlot, WrapBoxSlot, WidgetSwitcherSlot, WindowTitleBarAreaSlot, BackgroundBlurSlot

⚠️ 除 CanvasPanelSlot 外，所有 Slot 的 Blueprint 属性与 TypeScript 定义完全一致，直接使用即可！

---

## 需求 → 配置示例

**需求**: "左侧固定宽度侧边栏 200px"
```typescript
const SidebarSlot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {Minimum: {X: 0, Y: 0}, Maximum: {X: 0, Y: 1}},
        Offsets: {Left: 0, Top: 0, Right: 200, Bottom: 0}
    },
    bAutoSize: false
};
```

**需求**: "居中弹窗，占屏幕 70%x80%"
```typescript
const DialogSlot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {Minimum: {X: 0.15, Y: 0.1}, Maximum: {X: 0.85, Y: 0.9}},
        Offsets: {Left: 0, Top: 0, Right: 0, Bottom: 0}
    },
    bAutoSize: false,
    ZOrder: 100
};
```

**需求**: "底部工具栏，高度 60px"
```typescript
const ToolbarSlot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {Minimum: {X: 0, Y: 1}, Maximum: {X: 1, Y: 1}},
        Offsets: {Left: 0, Top: -60, Right: 0, Bottom: 60}
    },
    bAutoSize: false
};
```

**需求**: "右下角固定尺寸按钮 100x40"
```typescript
const ButtonSlot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {Minimum: {X: 1, Y: 1}, Maximum: {X: 1, Y: 1}},
        Offsets: {Left: -110, Top: -50, Right: 100, Bottom: 40}
    },
    bAutoSize: false
};
```
