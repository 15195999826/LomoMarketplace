---
name: tarray-handling
description: ReactUMG TArray 属性处理指南。在使用 GridPanel.ColumnFill/RowFill 等数组属性时使用。必须用 UE.NewArray() 而非 JS 数组。
---

# ReactUMG TArray 属性处理

## 核心规则

**TArray 属性必须使用 `UE.NewArray()`，不能直接使用 JS 数组！**

```typescript
// ❌ 错误：直接使用 JS 数组
<GridPanel ColumnFill={[1, 1, 1]} />  // Type Error!

// ✅ 正确：使用 UE.NewArray()
const columnFill = UE.NewArray(UE.BuiltinFloat);
columnFill.Add(1, 1, 1);
<GridPanel ColumnFill={columnFill} />
```

## Builtin 类型常量表

| 常量 | TypeScript 类型 | 用途 |
|------|----------------|------|
| `UE.BuiltinFloat` | `number` | **最常用** - GridPanel 的 Fill 值 |
| `UE.BuiltinInt` | `number` | 整数值 |
| `UE.BuiltinString` | `string` | 字符串 |
| `UE.BuiltinBool` | `boolean` | 布尔值 |
| `UE.BuiltinByte` | `number` | 0-255 整数 |

## 实际示例：GridPanel

```typescript
import * as UE from 'ue';

class MyPanel extends React.Component {
    // 静态创建（推荐）
    private static readonly COLUMN_FILL = (() => {
        const arr = UE.NewArray(UE.BuiltinFloat);
        arr.Add(1, 1, 1);  // 3 列等宽
        return arr;
    })();

    render() {
        return (
            <GridPanel ColumnFill={MyPanel.COLUMN_FILL}>
                {/* items */}
            </GridPanel>
        );
    }
}
```

## TArray 常用方法

```typescript
const arr = UE.NewArray(UE.BuiltinFloat);

arr.Add(1, 2, 3);        // 添加多个值
arr.Get(0);              // 获取值（不要用 arr[0]！）
arr.Set(0, 10);          // 设置值
arr.Num();               // 获取长度
arr.RemoveAt(0);         // 删除
arr.Empty();             // 清空
```

## 为什么不能用 JS 数组？

PuerTS 的 TArray 类型定义使用 `[index: number]: never` 来阻止直接下标访问，强制使用 `.Get()/.Set()` 方法，确保类型安全。
