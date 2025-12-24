# CanvasPanelSlot 完整映射

## 核心概念

只有 CanvasPanelSlot 需要特殊映射，其他 17 种 Slot 直接使用。

## Point Anchors（Minimum == Maximum）

Blueprint 显示：Position X/Y, Size X/Y

| Blueprint | TypeScript |
|-----------|------------|
| Position X | `LayoutData.Offsets.Left` |
| Position Y | `LayoutData.Offsets.Top` |
| Size X | `LayoutData.Offsets.Right` |
| Size Y | `LayoutData.Offsets.Bottom` |

## Range Anchors（Minimum ≠ Maximum）

Blueprint 显示：Offset Left/Top/Right/Bottom

| Blueprint | TypeScript |
|-----------|------------|
| Offset Left | `LayoutData.Offsets.Left` |
| Offset Top | `LayoutData.Offsets.Top` |
| Offset Right | `LayoutData.Offsets.Right` |
| Offset Bottom | `LayoutData.Offsets.Bottom` |

## 5 种常见布局示例

### 1. 固定位置 + 固定尺寸

```typescript
// 左侧 50x140 触发按钮
const TriggerSlot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {
            Minimum: {X: 0, Y: 0.5},
            Maximum: {X: 0, Y: 0.5}
        },
        Offsets: {
            Left: 5,      // Position X
            Top: -70,     // Position Y
            Right: 55,    // Size X
            Bottom: 70    // Size Y
        }
    },
    bAutoSize: false,
    ZOrder: 100
};
```

### 2. 全屏拉伸

```typescript
// 全屏覆盖层
const OverlaySlot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {
            Minimum: {X: 0, Y: 0},
            Maximum: {X: 1, Y: 1}
        },
        Offsets: {Left: 0, Top: 0, Right: 0, Bottom: 0}
    },
    bAutoSize: false,
    ZOrder: 98
};
```

### 3. 居中相对布局

```typescript
// 70% 宽 x 85% 高
const PanelSlot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {
            Minimum: {X: 0.15, Y: 0.075},
            Maximum: {X: 0.85, Y: 0.925}
        },
        Offsets: {Left: 0, Top: 0, Right: 0, Bottom: 0}
    },
    bAutoSize: false,
    ZOrder: 99
};
```

### 4. 居中 80% x 90%

```typescript
const MainPanelSlot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {
            Minimum: {X: 0.1, Y: 0.05},
            Maximum: {X: 0.9, Y: 0.95}
        },
        Offsets: {Left: 0, Top: 0, Right: 0, Bottom: 0}
    },
    bAutoSize: false,
    ZOrder: 0
};
```

### 5. 底部居中

```typescript
// 40% 宽 x 15% 高，底部居中
const MainPanelSlot: CanvasPanelSlot = {
    LayoutData: {
        Anchors: {
            Minimum: {X: 0.3, Y: 0.85},
            Maximum: {X: 0.7, Y: 1}
        },
        Offsets: {Left: 0, Top: 0, Right: 0, Bottom: 0}
    },
    bAutoSize: false,
    ZOrder: 0
};
```

---

## 对齐枚举速查

### EHorizontalAlignment

| 值 | 枚举名 | 说明 |
|----|--------|------|
| 0 | Fill | 填充 |
| 1 | Left | 左对齐 |
| **2** | **Center** | **居中** |
| 3 | Right | 右对齐 |

### EVerticalAlignment

| 值 | 枚举名 | 说明 |
|----|--------|------|
| 0 | Fill | 填充 |
| 1 | Top | 顶部 |
| **2** | **Center** | **居中** |
| 3 | Bottom | 底部 |

**核心记忆点**：居中是 2，不是 1（1 是 Left/Top）

```typescript
// OverlaySlot 居中对齐
const overlaySlot: OverlaySlot = {
    HorizontalAlignment: 2,  // Center (不是 1!)
    VerticalAlignment: 2,    // Center (不是 1!)
};
```
