---
name: key-rules
description: ReactUMG key 使用规范。在渲染列表、拖拽预览等场景时使用。key 标识组件身份，禁止使用坐标等频繁变化的值作为 key。
---

# ReactUMG key 使用规范

## 核心原则

**key 标识组件身份，不是状态！**

## ❌ 绝对禁止：坐标作为 key

```typescript
// ❌❌❌ 严重错误！每帧都重建组件
<DragPreview
    key={`${mouseX}-${mouseY}`}  // 鼠标移动就变！
    Slot={{Left: mouseX, Top: mouseY}}
/>
// 后果：性能崩溃、动画失效、大量 GC
```

## ✅ 正确做法：身份标识作为 key

```typescript
// ✅ 正确：key 标识"这是哪个物品"
<DragPreview
    key={item.id}  // 只有换物品才变
    item={item}
    Slot={{Left: mouseX, Top: mouseY}}  // 位置通过 Slot 更新
/>
```

## key 使用决策表

| 场景 | key 值 | 正确性 |
|------|--------|--------|
| 列表渲染 | `item.id` | ✅ |
| 拖拽预览 | `item.id` | ✅ |
| 切换用户 | `userId` | ✅ |
| 位置更新 | `${x}-${y}` | ❌ |
| 动画帧 | `frameIndex` | ❌ |

## React 的工作原理

```typescript
// key 相同 → 复用组件，只更新 props
<Component key="fixed" Slot={{Left: 100}} />
<Component key="fixed" Slot={{Left: 150}} />
// React：调用 update(oldProps, newProps)

// key 不同 → 销毁旧组件，创建新组件
<Component key="a" />
<Component key="b" />
// React：RemoveChild(旧) + CreateWidget(新)
```

## UE 开发者注意

```typescript
// React 的 render() ≠ UE 的 CreateWidget()
render() {
    return <DragPreview key={item.id} />;
}
// 这不会每次都创建新 Widget！
// React 会复用 key 相同的组件
```

**记住**：key 应该回答"这是谁"，而不是"它在哪里"或"它长什么样"。
