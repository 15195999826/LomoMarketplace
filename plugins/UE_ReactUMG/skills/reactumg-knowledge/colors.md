# 颜色类型完整规则

## 两种颜色类型

| 类型 | 结构 | 常见属性 |
|------|------|----------|
| **SlateColor** | `{SpecifiedColor: {R,G,B,A}}` | ColorAndOpacity, ForegroundColor |
| **LinearColor** | `{R,G,B,A}` | ShadowColorAndOpacity, BrushColor |

## 完整属性映射表

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

## ColorUseRule 规则

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
