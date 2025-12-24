# TArray 完整指南

## 核心规则

TArray 属性必须使用 `UE.NewArray()`，不能使用 JS 数组。

```typescript
// ❌ 错误
<GridPanel ColumnFill={[1, 1, 1]} />  // Type Error!

// ✅ 正确
const columnFill = UE.NewArray(UE.BuiltinFloat);
columnFill.Add(1, 1, 1);
<GridPanel ColumnFill={columnFill} />
```

## Builtin 类型常量表

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

## TArray 方法速查

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

## GridPanel 完整示例

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
