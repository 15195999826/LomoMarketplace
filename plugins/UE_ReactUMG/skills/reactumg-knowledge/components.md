# 常见组件配置

## EditableTextBox 深色主题

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

## ComboBoxString 动态选项

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

## 组件 API 索引

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
