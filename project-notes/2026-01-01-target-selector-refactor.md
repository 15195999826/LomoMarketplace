# TargetSelector 函数化 + GameEventComponent 重构

Date: 2026-01-01

## Completed Work

- [x] TargetSelector 改为函数类型 `(ctx: ExecutionContext) => ActorRef[]`
- [x] 预定义选择器移至 `examples/selectors/TargetSelectors.ts`（core 只提供类型机制）
- [x] ExecutionContext 简化，移除 `source/primaryTarget/affectedTargets/callbackDepth`
- [x] GameEventComponent 重构为 `triggers[] + triggerMode + actions` 结构
- [x] GameEventComponent 从 stdlib 移至 core 层
- [x] Action 通过 `getTargets()` 获取目标，支持多目标
- [x] 移除死代码（TargetRef, TargetResolutionContext, resolveTargetRef）
- [x] 更新 DamageAction/HealAction/AddBuffAction 使用新的 TargetSelector
- [x] 回调机制标记为 deprecated

## Todo Items

- [x] 回调机制重构（onCritical 等）- eventChain 模式 ✅
- [ ] 时间轴处理（bindToTag 功能）- 描述在动画抛出的 Tag 处执行功能

## Key Decisions

1. **TargetSelector 是函数，不破坏配置驱动**
   - 常用场景用预定义选择器 → 配置驱动
   - 特殊场景直接写函数 → 保持灵活性
   - 入参是 `ExecutionContext` → 可访问所有信息

2. **分层设计**
   - core 层只提供 `TargetSelector` 类型定义（机制）
   - examples 层提供预定义选择器（triggerSource, triggerTarget 等）

3. **GameEventComponent 新结构**
   ```typescript
   new GameEventComponent({
     triggers: [
       { eventKind: 'damage', filter: (e, ctx) => e.target.id === ctx.owner.id },
       { eventKind: 'turnStart' },
     ],
     triggerMode: 'any',  // 'any' = 任意一个 | 'all' = 全部通过
     actions: [new ReflectDamageAction()],
   });
   ```

4. **目标选择责任从 Context 移到 Action 自身**
   - ExecutionContext 不再包含 source/primaryTarget
   - Action 通过 `this.targetSelector(ctx)` 获取目标
   - 目标信息从 `eventChain` 中提取

5. **eventChain 模式取代 triggerEvent**
   - `ExecutionContext.triggerEvent` → `eventChain: readonly GameEventBase[]`
   - 当前事件 = `eventChain.at(-1)`，原始事件 = `eventChain[0]`
   - 辅助函数：`getCurrentEvent()`, `getOriginalEvent()`, `createCallbackContext()`
   - 回调执行时向 eventChain 追加新事件，保留完整追溯链
   - 解决嵌套回调中"parent"语义模糊的问题

6. **回调机制（callback）是技能内的条件分支**
   - 回调描述的是 ONE skill 中的条件效果：`damage(10).onCritical(addBuff('inspire'))`
   - 不是拆成多个 Ability，而是 Action 内部的条件触发
   - `processCallbacks()` 遍历 result.events，根据事件字段（isCritical, isKill 等）触发回调
   - 回调 Action 接收新的 eventChain（追加触发事件）

## Notes

- 参考项目：`D:\UEProjects\DESKTK\TypeScript\src`（UE+TS 项目）
- DESKTK 中 TargetSelector 是声明式数据，发送到 UE 侧解析
- 纯 TS 框架不需要序列化，TargetSelector 可以直接是函数
- 多个不同效果 = 多个 GameEventComponent（而非一个组件多个效果）

## Commit

`ac3d899` - refactor(logic-game-framework): TargetSelector 函数化 + GameEventComponent 重构
