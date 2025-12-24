---
name: color-types
description: ReactUMG 颜色类型速查。在设置 ColorAndOpacity、BrushColor、ForegroundColor 等颜色属性时使用。帮助区分 SlateColor 和 LinearColor 的正确用法。
---

# ReactUMG 颜色类型速查

## 两种颜色类型

| 类型 | 结构 | 示例 |
|------|------|------|
| **SlateColor** | `{SpecifiedColor: {R, G, B, A}}` | 嵌套结构 |
| **LinearColor** | `{R, G, B, A}` | 直接结构 |

## 属性 → 类型映射

| 组件 | 属性 | 类型 |
|------|------|------|
| TextBlock | `ColorAndOpacity` | SlateColor |
| TextBlock | `ShadowColorAndOpacity` | LinearColor |
| Border | `BrushColor` | LinearColor |
| Border | `ContentColorAndOpacity` | LinearColor |
| Image | `ColorAndOpacity` | LinearColor |
| Button | `ForegroundColor` (in style) | SlateColor |
| WidgetStyle | `ForegroundColor` | SlateColor |
| WidgetStyle | `FocusedForegroundColor` | SlateColor |

## 正确用法

```typescript
// SlateColor（嵌套）
<TextBlock
    ColorAndOpacity={{
        SpecifiedColor: {R: 0.9, G: 0.95, B: 1, A: 1}
    }}
/>

// LinearColor（直接）
<Border
    BrushColor={{R: 0.05, G: 0.08, B: 0.1, A: 0.95}}
/>
```

## ⚠️ 关键规则：ColorUseRule

**WidgetStyle 中的颜色必须加 `ColorUseRule: 0`**

```typescript
// ✅ 正确
WidgetStyle={{
    ForegroundColor: {
        SpecifiedColor: {R: 0.5, G: 0.5, B: 0.5, A: 1},
        ColorUseRule: 0  // 必须！
    }
}}

// ❌ 错误（颜色不会生效）
WidgetStyle={{
    ForegroundColor: {
        SpecifiedColor: {R: 0.5, G: 0.5, B: 0.5, A: 1}
        // 缺少 ColorUseRule: 0
    }
}}
```

## 快速判断方法

查看 IDE 错误信息：
- `"R does not exist in type RecursivePartial<SlateColor>"` → 用 SlateColor
- `"SpecifiedColor does not exist in type RecursivePartial<LinearColor>"` → 用 LinearColor
