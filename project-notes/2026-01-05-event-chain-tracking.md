# Event Chain 追踪设计优化

**日期**: 2026-01-05
**状态**: 待实现
**优先级**: 低（暂时用不到）

## 背景

在实现 Pre/Post 双阶段事件处理系统时，讨论了反伤无限循环的问题。

### 问题场景

A 和 B 都有反伤技能：
1. A 攻击 B → B 受伤 → B 反伤触发 → 伤害 A
2. A 受伤 → A 反伤触发 → 伤害 B
3. B 受伤 → B 反伤触发 → ...（无限循环）

### 解决思路

通过追溯事件链的**源头发起者（rootSource）**，如果伤害来源是自己发起的链路，则不触发反伤：

```
1. A 攻击 B
   post_damage { source: A, target: B, rootSource: A }

2. B 的反伤检查
   rootSource = A ≠ B → ✅ 触发
   post_damage { source: B, target: A, rootSource: A }

3. A 的反伤检查
   rootSource = A = A (self) → ❌ 不触发

循环终止！
```

## 当前状态

`ExecutionContext.eventChain` 已存在，用于 Action 执行时追溯：

```typescript
// ExecutionContext.ts
readonly eventChain: readonly GameEventBase[];

// 辅助函数
getCurrentEvent(ctx)   // eventChain.at(-1)
getOriginalEvent(ctx)  // eventChain[0]
```

### 缺失部分

| 场景 | eventChain 可用？ |
|------|------------------|
| Action 内部（ExecutionContext） | ✅ |
| NoInstanceComponent.filter | ❌ |
| NoInstanceComponent.actions 执行时 | ⚠️ 只有 `[当前event]` |

## 待实现方案

### 方案 A：扩展 receiveEvent 传递 eventChain

```typescript
// 当前
AbilitySet.receiveEvent(event, gameplayState)

// 扩展
AbilitySet.receiveEvent(event, gameplayState, eventChain?: GameEventBase[])
```

### 方案 B：在事件本身添加 rootSource

```typescript
interface DamageEvent extends GameEventBase {
  sourceId: string;
  targetId: string;
  damage: number;
  rootSourceId?: string;  // 追溯到原始发起者
}
```

### 方案 C：让 filter 函数也能访问 eventChain

```typescript
type EventTrigger = {
  eventKind: string;
  filter?: (event, context, eventChain?) => boolean;
};
```

## 使用示例（预期）

```typescript
// 反伤技能
new NoInstanceComponent({
  triggers: [{
    eventKind: 'post_damage',
    filter: (e, ctx) => {
      if (e.targetId !== ctx.owner.id) return false;
      // 检查源头发起者
      const rootSource = e.rootSourceId ?? e.sourceId;
      return rootSource !== ctx.owner.id;
    },
  }],
  actions: [new ReflectDamageAction()],
});
```

## 相关文件

- `src/core/actions/ExecutionContext.ts` - eventChain 定义
- `src/core/abilities/NoInstanceComponent.ts` - 需要扩展
- `src/core/abilities/AbilitySet.ts` - receiveEvent 方法
- `src/core/events/EventProcessor.ts` - 事件处理

## 备注

此优化属于设计层面的增强，当前 `maxDepth` 限制可以兜底防止无限循环。待有实际需求时再实现。
