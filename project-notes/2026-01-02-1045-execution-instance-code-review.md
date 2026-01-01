# AbilityExecutionInstance + Timeline 执行系统 Code Review

Date: 2026-01-02 10:45
Git Commit: 0a0ed37

## Completed Work

- [x] Review 最近一次 git 提交 `0a0ed37` 的重构内容
- [x] 分析 AbilityExecutionInstance 架构设计
- [x] 评估 API 变更（onActivate/onDeactivate → onApply/onRemove）
- [x] 评估 bindToTag → tagActions 配置化变更
- [x] 输出完整的 Code Review 报告

## Todo Items

- [x] 补充测试覆盖 ✅ 2026-01-02
  - ExecutionInstance.tick() 时间推进、Tag 触发 ✅
  - 通配符匹配 `prefix*` 模式测试 ✅
  - 多实例并行（脱手技能场景）✅
  - cancel() 行为验证 ✅
  - 边界条件：Timeline 不存在、空 tagActions ✅
- [x] 文档说明 `flushEvents` vs `getCollectedEvents` 的使用场景 ✅ 2026-01-02
- [ ] 明确 Timeline 不存在时的错误处理策略（静默 warn vs throw error）

## Key Decisions

- **执行模型**: Event → Component → ExecutionInstance → Timeline.tick() → Tag → Action.execute()
- **多实例支持**: 一个 Ability 可同时拥有多个 ExecutionInstance（支持脱手技能）
- **配置化替代 API**: 移除 `Action.bindToTag()`，改用 `tagActions` 配置映射
- **通配符**: tagActions 支持 `prefix*` 格式通配符（仅后缀）
- **API 重命名**:
  - Component Hook: onActivate/onDeactivate → onApply/onRemove
  - Ability 状态: idle/active → pending/granted

## Notes

### 架构评价

这次重构引入了 Timeline 驱动的执行模型，是正确的架构方向。分层职责清晰：

- `ActivateInstanceComponent` - 事件触发逻辑 ("何时触发")
- `AbilityExecutionInstance` - Timeline 推进管理 ("怎么执行")
- `Action` - 效果执行 ("做什么")

### 代码质量评分

| 指标 | 评分 | 说明 |
|------|------|------|
| 可读性 | ⭐⭐⭐⭐⭐ | 注释详尽，JSDoc 完整 |
| 一致性 | ⭐⭐⭐⭐⭐ | 命名风格统一 |
| 错误处理 | ⭐⭐⭐⭐ | try-catch + Logger |
| 类型安全 | ⭐⭐⭐⭐ | 核心类型完整，少数 unknown 断言 |
| 可测试性 | ⭐⭐⭐⭐ | 依赖注入，易于 mock |

### 潜在问题

1. Timeline 不存在时静默处理（只 warn，不 throw）
2. 序列化不完整（缺少 tagActions, eventChain）
3. flushEvents 和 getCollectedEvents 功能重叠

### 文件变更

- 新增: AbilityExecutionInstance.ts, ActivateInstanceComponent.ts, ExecutionContext.ts
- 修改: Ability.ts, AbilityComponent.ts, Action.ts, AbilitySet.ts
- 示例: TimelineSkillComponent.ts
- 总计: +1128 行, -85 行
