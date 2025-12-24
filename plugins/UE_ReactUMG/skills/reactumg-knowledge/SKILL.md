---
name: reactumg-knowledge
description: ReactUMG 完整开发知识库。仅供 PlanReactUMG 和 DebugReactUMG Agent 显式调用，不应在日常开发中直接激活。包含所有开发规则、代码示例和最佳实践的详细参考文档。
---

# ReactUMG 完整开发知识库

## Quick Navigation

**颜色类型**: See [colors.md](colors.md)
- SlateColor vs LinearColor
- ColorUseRule 规则
- 属性映射表

**TArray 用法**: See [tarray.md](tarray.md)
- UE.NewArray() 使用
- Builtin 类型常量
- GridPanel 示例

**Slot 布局**: See [slots.md](slots.md)
- CanvasPanelSlot 映射规则
- Point vs Range Anchors
- 5 种常见布局示例

**组件配置**: See [components.md](components.md)
- EditableTextBox 深色主题
- ComboBoxString 动态选项
- 组件 API 索引

**更新机制与交互**: See [patterns.md](patterns.md)
- React 更新链路
- key 使用规范
- ref 回调优化
- 鼠标坐标转换

---

## 快速决策树

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

## Key Takeaways

1. **颜色类型** - SlateColor 嵌套，LinearColor 直接，WidgetStyle 必须 ColorUseRule: 0
2. **TArray** - 必须 UE.NewArray()，不能用 JS 数组
3. **CanvasPanelSlot** - 唯一需要特殊映射的 Slot
4. **ComboBoxString** - DefaultOptions 无效，用 ref + AddOption()
5. **两种 ref** - React ref 获取组件，PuerTS $ref 处理 out 参数
6. **key 规范** - 标识身份，禁止坐标作为 key
7. **ref 回调** - 构造函数绑定，避免重复调用
8. **坐标转换** - GetMousePositionOnViewport 最简单
