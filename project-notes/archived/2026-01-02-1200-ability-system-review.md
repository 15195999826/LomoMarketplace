# Ability System Design Review

Date: 2026-01-02 12:00
Git Commit: 0a0ed37

## Completed Work

- [x] 完整阅读了 logic-game-framework 中 Ability 系统的所有核心代码
  - `Ability.ts` - EC 模式的能力容器
  - `AbilityComponent.ts` - 组件接口与基类
  - `AbilitySet.ts` - 能力集合管理器
  - `AbilityExecutionInstance.ts` - Timeline 执行实例
  - `GameEventComponent.ts` - 事件驱动的 Action 执行器
  - `ActivateInstanceComponent.ts` - Timeline 激活组件
  - `Timeline.ts` - 时间轴数据结构
  - stdlib 组件：`TimeDurationComponent`, `StatModifierComponent`, `StackComponent`
- [x] 撰写了详细的设计 Review 报告

## Todo Items

- [x] 为 Ability 系统添加测试覆盖 ✅ 2026-01-02（新增 81 个测试用例）
  - `Ability.test.ts` - 33 tests
  - `AbilityExecutionInstance.test.ts` - 26 tests
  - `ActivateInstanceComponent.test.ts` - 22 tests
- [x] 统一 `EventTrigger` 和 `TriggerMode` 的类型定义 ✅ 2026-01-02
  - 保留 `GameEventComponent.ts` 中的定义
  - `ActivateInstanceComponent.ts` 从其导入并重新导出
- [x] `GameEventComponent` 中的 eventCollector 行为已文档说明 ✅ 2026-01-02
  - 明确说明不收集事件，适用于瞬发被动技能
  - 需要事件收集时使用 ActivateInstanceComponent
- [x] 文档说明 `flushEvents` vs `getCollectedEvents` ✅ 2026-01-02
- [x] StackModifierComponent ❌ 2026-01-07 不实现 - 层数与 Modifier 设计上无直接关联，暂无需求
- [x] 完善序列化/反序列化机制 ❌ 2026-01-07 不实现 - 暂不在实现范围内，等有存档/网络同步需求再做
- [x] 全局 TimelineRegistry 改为依赖注入 ✅ 2026-01-07 已支持 setTimelineRegistry()

## Key Decisions

- **EC 模式**: Ability 作为容器，Component 提供功能，构造时注入、运行时只读
- **双层触发机制**:
  - 框架级 Hook：`onTick`, `onApply/onRemove`
  - 业务级 Hook：`onEvent`
- **统一事件模型**: 所有 Action 执行都是事件驱动的（主动技能通过 InputActionEvent，被动技能通过 DamageEvent 等）
- **Timeline 执行实例**: 支持脱手技能（多个 ExecutionInstance 并行执行）
- **ExpireReason 只记录第一个**: 多个 Component 同时触发过期时，只保留第一个原因

## Notes

### 代码质量评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 架构清晰度 | ⭐⭐⭐⭐⭐ | EC 模式 + 双层触发，职责分明 |
| 类型安全 | ⭐⭐⭐⭐ | TypeScript 类型完备，个别 unknown 待优化 |
| 可扩展性 | ⭐⭐⭐⭐⭐ | 组件模式天然支持扩展 |
| 文档注释 | ⭐⭐⭐⭐⭐ | 每个文件头部都有详细的设计说明 |
| 序列化支持 | ⭐⭐⭐ | 基础结构在，但 deserialize 需完善 |
| 测试覆盖 | ❓ | 未找到 ability 相关测试文件 |

### 主要代码文件位置

- Core 层：`packages/logic-game-framework/src/core/abilities/`
- StdLib 层：`packages/logic-game-framework/src/stdlib/components/`
- Timeline：`packages/logic-game-framework/src/core/timeline/`
