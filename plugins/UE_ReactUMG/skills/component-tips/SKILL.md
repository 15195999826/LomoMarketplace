---
name: component-tips
description: ReactUMG 常见组件陷阱提醒。在使用 ComboBoxString、EditableTextBox 等复杂组件时使用。包含动态选项、ref 回调优化等关键技巧。
---

# ReactUMG 常见组件陷阱

## ComboBoxString 动态选项

### ⚠️ DefaultOptions 属性不工作！

```typescript
// ❌ 错误：DefaultOptions 无效
const options = UE.NewArray(UE.BuiltinString);
options.Add("Option1", "Option2");
<ComboBoxString DefaultOptions={options} />  // 不会显示选项！

// ✅ 正确：必须用 ref + AddOption()
<ComboBoxString
    ref={(ref) => {
        if (ref?.nativePtr && !this.initialized) {
            ref.nativePtr.ClearOptions();
            ref.nativePtr.AddOption("Option1");
            ref.nativePtr.AddOption("Option2");
            ref.nativePtr.SetSelectedOption("Option1");
            this.initialized = true;
        }
    }}
/>
```

### 推荐：封装 ManagedComboBoxString

```typescript
// 使用封装组件（如果项目中有）
<ManagedComboBoxString
    options={["Option1", "Option2"]}
    selectedValue="Option1"
    onSelectionChanged={(item) => console.log(item)}
/>
```

## ref 回调优化

### ⚠️ 内联箭头函数导致重复调用

```typescript
// ❌ 问题：每次 render 都创建新函数
<CanvasPanel ref={(ref) => { this.canvasRef = ref?.nativePtr; }} />
// React 会反复调用 ref(null) → ref(instance)

// ✅ 正确：构造函数中绑定
constructor(props) {
    super(props);
    this.boundHandleRef = this.handleRef.bind(this);
}

handleRef(ref) {
    this.canvasRef = ref ? ref.nativePtr : null;
}

<CanvasPanel ref={this.boundHandleRef} />  // 固定引用
```

## EditableTextBox 深色主题

```typescript
<EditableTextBox
    WidgetStyle={{
        BackgroundImageNormal: {
            TintColor: {
                SpecifiedColor: {R: 0.004777, G: 0.004777, B: 0.004777, A: 1},
                ColorUseRule: 0  // 必须！
            },
            DrawAs: 4,  // RoundedBox
            OutlineSettings: {
                CornerRadii: {X: 4, Y: 4, Z: 4, W: 4},
                RoundingType: 0
            }
        },
        ForegroundColor: {
            SpecifiedColor: {R: 0.5, G: 0.5, B: 0.5, A: 1},
            ColorUseRule: 0  // 必须！
        },
        FocusedForegroundColor: {
            SpecifiedColor: {R: 1, G: 1, B: 1, A: 1},
            ColorUseRule: 0  // 必须！
        }
    }}
/>
```

**关键点**：
- `DrawAs: 4` = RoundedBox
- `RoundingType: 0` = FixedRadius
- 所有 WidgetStyle 中的颜色都需要 `ColorUseRule: 0`
