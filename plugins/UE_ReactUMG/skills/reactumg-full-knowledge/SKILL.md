---
name: reactumg-full-knowledge
description: ReactUMG 完整开发知识库。仅供 PlanReactUMG 和 DebugReactUMG Agent 显式调用，不应在日常开发中直接激活。包含所有开发规则、代码示例和最佳实践的详细参考文档。
---

# ReactUMG 完整开发知识库

> 本文档是 ReactUMG 开发的完整参考，包含所有规则、示例和最佳实践。

---

## 1. UI 结构标准

### 根组件选择

| 组件类型 | 根组件 | 使用场景 |
|---------|--------|----------|
| 全屏窗口 | `CanvasPanel` | 需要精确定位（如调试面板、覆盖层） |
| 全屏窗口 | `Overlay` | 需要分层堆叠 |
| 列表/网格 | `VerticalBox` / `HorizontalBox` / `UniformGridPanel` | 自动排列项目 |
| 滚动内容 | `ScrollBox` | 内容超出视口 |
| 固定尺寸 | `SizeBox` | 强制特定尺寸 |

### 架构模式

```
窗口组件（导出）
└─ CanvasPanel / Overlay (root)
    └─ 子组件1
        └─ VerticalBox / SizeBox / ... (root)
            └─ ... (业务内容)
    └─ 子组件2
        └─ HorizontalBox / ScrollBox / ... (root)
            └─ ... (业务内容)
```

---

## 2. 颜色类型完整规则

### 两种颜色类型

| 类型 | 结构 | 常见属性 |
|------|------|----------|
| **SlateColor** | `{SpecifiedColor: {R,G,B,A}}` | ColorAndOpacity, ForegroundColor |
| **LinearColor** | `{R,G,B,A}` | ShadowColorAndOpacity, BrushColor |

### 完整属性映射表

| 组件 | 属性 | 类型 |
|------|------|------|
| TextBlock | `ColorAndOpacity` | SlateColor |
| TextBlock | `ShadowColorAndOpacity` | LinearColor |
| Border | `BrushColor` | LinearColor |
| Border | `ContentColorAndOpacity` | LinearColor |
| Button | `ForegroundColor` (in style) | SlateColor |
| Image | `ColorAndOpacity` | LinearColor |
| WidgetStyle | `ForegroundColor` | SlateColor |
| WidgetStyle | `FocusedForegroundColor` | SlateColor |

### ColorUseRule 规则

**WidgetStyle 中的颜色必须指定 `ColorUseRule: 0`**

```typescript
// ✅ 正确
WidgetStyle={{
    ForegroundColor: {
        SpecifiedColor: {R: 0.5, G: 0.5, B: 0.5, A: 1},
        ColorUseRule: 0  // 必须！
    },
    FocusedForegroundColor: {
        SpecifiedColor: {R: 1, G: 1, B: 1, A: 1},
        ColorUseRule: 0  // 必须！
    }
}}

// ❌ 错误（颜色不会生效）
WidgetStyle={{
    FocusedForegroundColor: {
        SpecifiedColor: {R: 1, G: 1, B: 1, A: 1}
        // 缺少 ColorUseRule: 0
    }
}}
```

**组件 props 可以省略 ColorUseRule**：
```typescript
// ✅ 可以
<TextBlock
    ColorAndOpacity={{
        SpecifiedColor: {R: 0.9, G: 0.95, B: 1, A: 1}
        // 不需要 ColorUseRule
    }}
/>
```

---

## 3. TArray 完整指南

### 核心规则

TArray 属性必须使用 `UE.NewArray()`，不能使用 JS 数组。

```typescript
// ❌ 错误
<GridPanel ColumnFill={[1, 1, 1]} />  // Type Error!

// ✅ 正确
const columnFill = UE.NewArray(UE.BuiltinFloat);
columnFill.Add(1, 1, 1);
<GridPanel ColumnFill={columnFill} />
```

### Builtin 类型常量表

| 常量 | TypeScript 类型 | 用途 |
|------|----------------|------|
| `UE.BuiltinFloat` | `number` | 浮点值（GridPanel Fill） |
| `UE.BuiltinInt` | `number` | 整数值 |
| `UE.BuiltinString` | `string` | 字符串 |
| `UE.BuiltinBool` | `boolean` | 布尔值 |
| `UE.BuiltinByte` | `number` | 0-255 整数 |
| `UE.BuiltinDouble` | `number` | 双精度 |
| `UE.BuiltinInt64` | `bigint` | 64位整数 |
| `UE.BuiltinText` | `string` | 文本 |
| `UE.BuiltinName` | `string` | 名称 |

### TArray 方法速查

```typescript
const arr = UE.NewArray(UE.BuiltinFloat);

arr.Add(1, 2, 3);           // 添加多个值
arr.Get(0);                 // 获取值（不要用 arr[0]！）
arr.Set(0, 10);             // 设置值
arr.Num();                  // 获取长度
arr.Contains(1);            // 是否包含
arr.FindIndex(2);           // 查找索引
arr.RemoveAt(0);            // 删除
arr.Empty();                // 清空
```

### GridPanel 完整示例

```typescript
class DebugPanel extends React.Component {
    private static readonly GRID_COLUMNS = 3;

    private static readonly GRID_COLUMN_FILL = (() => {
        const arr = UE.NewArray(UE.BuiltinFloat);
        arr.Add(...new Array(DebugPanel.GRID_COLUMNS).fill(1));
        return arr;
    })();

    private static readonly GRID_ROW_FILL = UE.NewArray(UE.BuiltinFloat);

    render() {
        return (
            <GridPanel
                ColumnFill={DebugPanel.GRID_COLUMN_FILL}
                RowFill={DebugPanel.GRID_ROW_FILL}
            >
                {features.map((feature, index) => {
                    const slot: GridSlot = {
                        Row: Math.floor(index / DebugPanel.GRID_COLUMNS),
                        Column: index % DebugPanel.GRID_COLUMNS,
                        Padding: {...}
                    };
                    return <Item key={feature.id} Slot={slot} />;
                })}
            </GridPanel>
        );
    }
}
```

---

## 4. CanvasPanelSlot 完整映射

### 核心概念

只有 CanvasPanelSlot 需要特殊映射，其他 17 种 Slot 直接使用。

### Point Anchors（Minimum == Maximum）

Blueprint 显示：Position X/Y, Size X/Y

| Blueprint | TypeScript |
|-----------|------------|
| Position X | `LayoutData.Offsets.Left` |
| Position Y | `LayoutData.Offsets.Top` |
| Size X | `LayoutData.Offsets.Right` |
| Size Y | `LayoutData.Offsets.Bottom` |

### Range Anchors（Minimum ≠ Maximum）

Blueprint 显示：Offset Left/Top/Right/Bottom

| Blueprint | TypeScript |
|-----------|------------|
| Offset Left | `LayoutData.Offsets.Left` |
| Offset Top | `LayoutData.Offsets.Top` |
| Offset Right | `LayoutData.Offsets.Right` |
| Offset Bottom | `LayoutData.Offsets.Bottom` |

### 5 种常见布局示例

#### 1. 固定位置 + 固定尺寸

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

#### 2. 全屏拉伸

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

#### 3. 居中相对布局

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

#### 4. 居中 80% x 90%

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

#### 5. 底部居中

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

## 5. 常见组件配置

### EditableTextBox 深色主题

```typescript
<EditableTextBox
    Text={value}
    HintText="placeholder"
    OnTextChanged={this.handleTextChanged}
    WidgetStyle={{
        BackgroundImageNormal: {
            TintColor: {
                SpecifiedColor: {R: 0.004777, G: 0.004777, B: 0.004777, A: 1},
                ColorUseRule: 0
            },
            DrawAs: 4,  // RoundedBox
            OutlineSettings: {
                CornerRadii: {X: 4, Y: 4, Z: 4, W: 4},
                RoundingType: 0  // FixedRadius
            }
        },
        BackgroundImageHovered: {
            TintColor: {
                SpecifiedColor: {R: 0.004777, G: 0.004777, B: 0.004777, A: 1},
                ColorUseRule: 0
            },
            DrawAs: 4,
            OutlineSettings: {
                CornerRadii: {X: 4, Y: 4, Z: 4, W: 4},
                RoundingType: 0
            }
        },
        BackgroundImageFocused: {
            TintColor: {
                SpecifiedColor: {R: 0.004777, G: 0.004777, B: 0.004777, A: 1},
                ColorUseRule: 0
            },
            DrawAs: 4,
            OutlineSettings: {
                CornerRadii: {X: 4, Y: 4, Z: 4, W: 4},
                RoundingType: 0
            }
        },
        ForegroundColor: {
            SpecifiedColor: {R: 0.527115, G: 0.527115, B: 0.527115, A: 1},
            ColorUseRule: 0
        },
        FocusedForegroundColor: {
            SpecifiedColor: {R: 1, G: 1, B: 1, A: 1},
            ColorUseRule: 0
        }
    }}
/>
```

### ComboBoxString 动态选项

**DefaultOptions 属性不工作！必须用 ref + AddOption()**

```typescript
class ManagedComboBoxString extends React.Component<Props> {
    private nativePtr: UE.ComboBoxString | null = null;
    private initialized: boolean = false;
    private boundHandleRef: (instance: any) => void;

    constructor(props: Props) {
        super(props);
        this.boundHandleRef = this.handleRef.bind(this);
    }

    handleRef(instance: any) {
        if (!instance || !instance.nativePtr) return;
        if (this.initialized) return;

        this.nativePtr = instance.nativePtr;
        this.initializeOptions();
        this.initialized = true;
    }

    initializeOptions() {
        if (!this.nativePtr) return;
        const { options, selectedValue } = this.props;

        this.nativePtr.ClearOptions();
        options.forEach(option => {
            this.nativePtr!.AddOption(option);
        });

        if (selectedValue) {
            this.nativePtr.SetSelectedOption(selectedValue);
        }
    }

    render() {
        return (
            <ComboBoxString
                ref={this.boundHandleRef}
                OnSelectionChanged={this.props.onSelectionChanged}
                // ... styling
            />
        );
    }
}
```

---

## 6. 鼠标交互与坐标转换

### React ref 的使用

```typescript
class MyComponent extends React.Component {
    private canvasRef: UE.CanvasPanel | null = null;
    private boundHandleRef: (ref: any) => void;

    constructor(props) {
        super(props);
        this.boundHandleRef = this.handleRef.bind(this);
    }

    handleRef(ref) {
        this.canvasRef = ref ? ref.nativePtr : null;
    }

    render() {
        return <CanvasPanel ref={this.boundHandleRef} />;
    }
}
```

### PuerTS $ref/$unref

```typescript
import { $ref, $unref } from 'puerts';

// 获取 DataTable 行名
const rowNamesRef = $ref<UE.TArray<string>>();
UE.DataTableFunctionLibrary.GetDataTableRowNames(table, rowNamesRef);
const rowNames = $unref(rowNamesRef);

// 鼠标捕获
const replyRef = $ref(UE.WidgetBlueprintLibrary.Handled());
UE.WidgetBlueprintLibrary.CaptureMouse(replyRef, widget);
return $unref(replyRef);
```

### 获取鼠标位置

**方案 1：GetMousePositionOnViewport（推荐）**

```typescript
const viewportPos = UE.WidgetLayoutLibrary.GetMousePositionOnViewport(
    this.canvasRef
);
const localX = viewportPos.X;
const localY = viewportPos.Y;
```

**方案 2：Geometry 坐标转换**

```typescript
handleMouseMove = (geometry: UE.Geometry, event: UE.PointerEvent) => {
    const screenPos = UE.KismetInputLibrary.PointerEvent_GetScreenSpacePosition(event);
    const screenVec = new UE.Vector2D(screenPos.X, screenPos.Y);
    const localPos = UE.SlateBlueprintLibrary.AbsoluteToLocal(geometry, screenVec);
    return UE.WidgetBlueprintLibrary.Handled();
};
```

### 三种坐标空间

| 坐标空间 | 原点 | 获取方式 |
|---------|------|----------|
| Screen Space | 屏幕左上角 | `PointerEvent_GetScreenSpacePosition` |
| Viewport Space | 游戏窗口左上角 | `GetMousePositionOnViewport` |
| Local Space | 组件左上角 | `AbsoluteToLocal(geometry, ...)` |

---

## 7. React 更新机制与 key 规范

### 完整更新链路

```
setState()
    ↓
render() 返回新的 VDOM
    ↓
prepareUpdate(instance, type, oldProps, newProps)
    ├─ 返回 false → 不更新
    └─ 返回 true → commitUpdate()
                        ↓
                   instance.update(oldProps, newProps)
                        ↓
                   puerts.merge(nativePtr, changedProps)
                        ↓
                   SynchronizeWidgetProperties()
```

### key 使用规范

**key 标识组件身份，不是状态！**

```typescript
// ❌ 严重错误
<DragPreview key={`${mouseX}-${mouseY}`} />  // 每帧重建！

// ✅ 正确
<DragPreview key={item.id} Slot={{Left: mouseX, Top: mouseY}} />
```

| 场景 | key 值 | 正确性 |
|------|--------|--------|
| 列表渲染 | `item.id` | ✅ |
| 拖拽预览 | `item.id` | ✅ |
| 位置更新 | `${x}-${y}` | ❌ |

### ref 回调优化

```typescript
// ❌ 内联函数，每次 render 都创建新函数
<CanvasPanel ref={(ref) => { this.canvasRef = ref?.nativePtr; }} />

// ✅ 构造函数中绑定
constructor(props) {
    super(props);
    this.boundHandleRef = this.handleRef.bind(this);
}
<CanvasPanel ref={this.boundHandleRef} />
```

---

## 8. 组件 API 索引

### 容器组件

| 组件 | 用途 | 关键 Props |
|------|------|------------|
| CanvasPanel | 自由定位 | 子元素用 CanvasPanelSlot |
| VerticalBox | 垂直布局 | 子元素用 VerticalBoxSlot |
| HorizontalBox | 水平布局 | 子元素用 HorizontalBoxSlot |
| UniformGridPanel | 均匀网格 | 子元素用 UniformGridSlot |
| GridPanel | 网格布局 | ColumnFill, RowFill |
| Overlay | 覆盖层 | 子元素叠加显示 |
| ScrollBox | 滚动容器 | Orientation, ScrollBarVisibility |
| SizeBox | 尺寸限制 | MinDesiredWidth/Height |
| Border | 边框容器 | BrushColor, Padding |
| WrapBox | 自动换行 | InnerSlotPadding |

### 输入组件

| 组件 | 用途 | 关键 Props |
|------|------|------------|
| EditableTextBox | 单行输入 | Text, OnTextChanged, HintText |
| MultiLineEditableTextBox | 多行输入 | Text, OnTextChanged |
| Slider | 滑块 | Value, MinValue, MaxValue, OnValueChanged |
| SpinBox | 数值框 | Value, MinValue, MaxValue |
| CheckBox | 复选框 | IsChecked, OnCheckStateChanged |
| Button | 按钮 | OnClicked, OnPressed, OnReleased |
| ComboBoxString | 下拉框 | OnSelectionChanged |

### 显示组件

| 组件 | 用途 | 关键 Props |
|------|------|------------|
| TextBlock | 文本 | Text, Font, Justification, ColorAndOpacity |
| RichTextBlock | 富文本 | Text, TextStyleSet |
| Image | 图片 | Brush, ColorAndOpacity |
| ProgressBar | 进度条 | Percent, FillColorAndOpacity |
| Spacer | 空白占位 | Size |

### Slot 类型索引

| Slot 类型 | 关键属性 |
|-----------|----------|
| CanvasPanelSlot | LayoutData, bAutoSize, ZOrder |
| VerticalBoxSlot | Size, Padding, HAlign, VAlign |
| HorizontalBoxSlot | Size, Padding, HAlign, VAlign |
| UniformGridSlot | Row, Column, HAlign, VAlign |
| GridSlot | Row, Column, RowSpan, ColumnSpan |
| OverlaySlot | Padding, HAlign, VAlign |
| ScrollBoxSlot | Padding, HAlign, VAlign |
| BorderSlot | Padding, HAlign, VAlign |

---

## 9. 快速决策树

```
遇到属性类型问题？
    ├─ 是颜色属性？
    │   ├─ IDE 报 "R does not exist in SlateColor" → 用 {SpecifiedColor: {R,G,B,A}}
    │   ├─ IDE 报 "SpecifiedColor does not exist" → 用 {R,G,B,A}
    │   └─ 在 WidgetStyle 中？ → 必须加 ColorUseRule: 0
    │
    ├─ 是 TArray<T>？
    │   └─ 用 UE.NewArray(type_constant) + .Add()
    │
    ├─ 是 CanvasPanelSlot？
    │   ├─ Anchors.Min == Max？ → Offsets = Position/Size
    │   └─ Anchors.Min != Max？ → Offsets = Margin
    │
    └─ 其他 Slot？ → Blueprint 属性 = TypeScript 定义

需要获取鼠标位置？
    ├─ 拖拽预览 / 全屏 Overlay → GetMousePositionOnViewport
    └─ 需要转换到特定组件坐标 → AbsoluteToLocal(geometry, screenPos)

需要调用 UE API？
    ├─ 参数类型有 $Ref<T>？ → 用 $ref/$unref
    └─ EventReply 修改？ → $ref 需要初始值

组件不更新？
    ├─ 检查 key 是否用了坐标等频繁变化的值
    ├─ 检查 Slot 引用是否变化
    └─ 检查 ref 回调是否每次都创建新函数
```

---

## 10. Key Takeaways

1. ✅ **颜色类型** - SlateColor 嵌套，LinearColor 直接，WidgetStyle 必须 ColorUseRule: 0
2. ✅ **TArray** - 必须 UE.NewArray()，不能用 JS 数组
3. ✅ **CanvasPanelSlot** - 唯一需要特殊映射的 Slot
4. ✅ **ComboBoxString** - DefaultOptions 无效，用 ref + AddOption()
5. ✅ **两种 ref** - React ref 获取组件，PuerTS $ref 处理 out 参数
6. ✅ **key 规范** - 标识身份，禁止坐标作为 key
7. ✅ **ref 回调** - 构造函数绑定，避免重复调用
8. ✅ **坐标转换** - GetMousePositionOnViewport 最简单

---

**Version**: v1.0
**Last Updated**: 2025-12-23
