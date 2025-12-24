---
name: using-refs
description: ReactUMG 两种 ref 区分指南。React ref 用于获取组件引用，PuerTS $ref/$unref 用于处理 UE C++ out 参数。这是两个完全不同的概念。
---

# ReactUMG 两种 ref 的区分

⚠️ **这是两个完全不同的概念！**

## 快速判断

| 场景 | 用哪个 |
|------|--------|
| 获取 Widget 引用调用方法 | React ref |
| UE API 有 `$Ref<T>` 参数 | PuerTS $ref |

---

## 1. React ref（获取组件引用）

用于获取 React 组件或 UE Widget 的引用，调用其原生方法。

```typescript
class MyComponent extends React.Component {
    private canvasRef: UE.CanvasPanel | null = null;

    // 推荐：构造函数中绑定
    constructor(props) {
        super(props);
        this.boundHandleRef = this.handleRef.bind(this);
    }

    handleRef(ref) {
        this.canvasRef = ref ? ref.nativePtr : null;
    }

    someMethod() {
        // 调用原生方法
        const geometry = this.canvasRef?.GetCachedGeometry();
    }

    render() {
        return (
            <CanvasPanel ref={this.boundHandleRef}>
                {/* children */}
            </CanvasPanel>
        );
    }
}
```

**关键点**：
- `ref.nativePtr` 才是真正的 UE 对象
- ref 回调会在 mount/update/unmount 时多次调用
- 推荐在构造函数中绑定，避免重复调用

---

## 2. PuerTS $ref/$unref（处理 C++ out 参数）

用于调用 UE API 中带有引用参数（out 参数）的函数。

```typescript
import { $ref, $unref } from 'puerts';

// 示例 1：获取 DataTable 行名
const rowNamesRef = $ref<UE.TArray<string>>();
UE.DataTableFunctionLibrary.GetDataTableRowNames(table, rowNamesRef);
const rowNames = $unref(rowNamesRef);  // 提取值

for (let i = 0; i < rowNames.Num(); i++) {
    console.log(rowNames.Get(i));
}

// 示例 2：鼠标捕获（EventReply 需要初始值）
const replyRef = $ref(UE.WidgetBlueprintLibrary.Handled());
UE.WidgetBlueprintLibrary.CaptureMouse(replyRef, widget);
return $unref(replyRef);
```

**关键点**：
- `$ref<Type>()` 创建引用容器
- 将容器传给 UE API，API 会填充值
- 用 `$unref()` 提取实际值
- 大部分情况空初始化，**EventReply 例外**（需要初始值）

---

## 常见需要 $ref 的 UE API

| API | 参数类型 | 用途 |
|-----|---------|------|
| `DataTableFunctionLibrary.GetDataTableRowNames` | `TArray<FName>&` | 获取 DataTable 行名 |
| `WidgetBlueprintLibrary.CaptureMouse` | `FEventReply&` | 鼠标捕获 |
| `WidgetBlueprintLibrary.ReleaseMouseCapture` | `FEventReply&` | 释放鼠标捕获 |

**识别方法**：查看 ue.d.ts 类型定义，参数类型为 `$Ref<T>` 的需要使用 $ref。

---

## 常见错误

```typescript
// ❌ 错误：直接传递变量（PuerTS $ref）
let rowNames: UE.TArray<string>;
UE.DataTableFunctionLibrary.GetDataTableRowNames(table, rowNames);
// rowNames 仍然是 undefined！

// ❌ 错误：忘记 $unref
const ref = $ref<UE.TArray<string>>();
UE.DataTableFunctionLibrary.GetDataTableRowNames(table, ref);
console.log(ref.Num());  // TypeError! ref 不是 TArray

// ✅ 正确
const ref = $ref<UE.TArray<string>>();
UE.DataTableFunctionLibrary.GetDataTableRowNames(table, ref);
const arr = $unref(ref);  // 提取值
console.log(arr.Num());   // 正常工作
```
