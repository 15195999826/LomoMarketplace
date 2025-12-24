# 更新机制与交互

## React 更新链路

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

## key 使用规范

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

## ref 回调优化

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

## 鼠标交互与坐标转换

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
