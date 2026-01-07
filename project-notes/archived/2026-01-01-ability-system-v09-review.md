# AbilitySet 双层触发机制 v0.9 更新与代码审查

Date: 2026-01-01

## Completed Work

- [x] 根据最近4次提交更新设计文档 `LogicPerformanceSeparation_AbilitySystem.md` 到 v0.9
- [x] 对4次提交的代码进行详细 Review

### 文档更新内容

| 章节 | 更新内容 |
|------|---------|
| Section 2 框架边界 | 新增 AbilitySet、GameEventBase、示例代码目录 |
| Section 4.5 | 重构为 AbilitySet + 双层触发机制 + AbilityComponent |
| Section 4.6 | AbilitySystem 简化为事件广播器 |
| Section 4.7 | 新增 GameEvent 事件系统 + GameEventComponent |
| Section 10 | 进度更新：AbilitySet 双层触发机制已完成 |
| 附录术语 | 新增 AbilitySet、GameEvent、GameEventComponent |

### 4次提交涉及的变更

1. `9544436` - 添加 AbilitySet 双层触发机制
2. `b3fd360` - 将具体事件类型移至 examples
3. `742e8f9` - ActionComponent 重命名为 GameEventComponent
4. `0c355a0` - 移除 AbilityTags，添加示例

## Todo Items

- [x] `Ability.checkExpiration()` 硬编码了 'duration' → 已移除，改为 Component 主动调用 `ability.expire(reason)`
- [x] `ExecutionContext.battle` 改为可选类型 → 已改为 `gameplayState: unknown`
- [x] 为 BattleGameEvents 添加类型守卫函数 ✅ 2026-01-07 应用层已实现 (ReplayEvents.ts)
- [x] AbilitySystem 持有 actors 引用 ✅ 2026-01-07 架构已重构，GameplayInstance.baseTick() 直接传递 actors

## Key Decisions

1. **双层触发机制**
   - 内部 Hook（框架级）：onTick、onActivate、onDeactivate
   - 事件系统（业务级）：onEvent → GameEventComponent

2. **框架层不对事件结构做假设**
   - GameEventBase 只定义 `kind` + `logicTime`
   - 具体事件类型（DamageEvent 等）由游戏自定义
   - 示例代码放在 `examples/` 目录

3. **统一事件模型**
   - 主动技能：通过 InputActionEvent 触发
   - 被动技能：通过 DamageEvent/DeathEvent 等触发
   - GameEventComponent 是框架中唯一触发 Action 执行的组件

4. **AbilitySet 作为统一容器**
   - 取代 `Actor.abilities: Ability[]`
   - 管理 grant/revoke/tick/receiveEvent
   - 自动清理过期的 Ability

## Notes

### Code Review 评分

| 文件 | 评分 |
|------|------|
| AbilitySet.ts | ⭐⭐⭐⭐⭐ |
| Ability.ts | ⭐⭐⭐⭐ |
| AbilitySystem.ts | ⭐⭐⭐⭐ |
| GameEvent.ts | ⭐⭐⭐⭐⭐ |
| GameEventComponent.ts | ⭐⭐⭐⭐ |

### 设计原则

框架层（Core）只提供接口约束，不定义具体实现：
- ❌ 不预定义 AbilityTags
- ❌ 不预定义具体事件类型
- ❌ 不提供主动技能组件实现
- ✅ 提供 GameEventBase 接口
- ✅ 提供 GameEventComponent（StdLib）
- ✅ 提供 examples/ 示例代码
