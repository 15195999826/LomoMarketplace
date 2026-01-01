# Timeline 执行系统 Code Review

Date: 2026-01-02 14:30
Git Commit: 0a0ed37

## Completed Work

- [x] Review 最新提交 `feat(logic-game-framework): AbilityExecutionInstance + Timeline 执行系统`
- [x] 分析架构设计和 API 变更
- [x] 识别潜在问题和改进建议
- [x] 生成架构理解图

## 提交内容概述

### 核心新增

| 文件 | 职责 |
|------|------|
| `AbilityExecutionInstance.ts` | 管理单次技能执行的状态和 Timeline 推进 |
| `ActivateInstanceComponent.ts` | 响应事件创建 ExecutionInstance 的组件 |
| `ExecutionContext.ts` | Action 执行上下文，新增 `execution` 字段 |
| `TimelineSkillComponent.ts` | 示例：CD + 资源 + Timeline 的完整技能实现 |

### API 变更

| 变更项 | 旧 | 新 |
|--------|----|----|
| Ability 状态 | `idle/active` | `pending/granted` |
| Component Hook | `onActivate/onDeactivate` | `onApply/onRemove` |
| Tag 绑定 | `Action.bindToTag()` | `tagActions` 配置 |

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                       Ability                           │
│  state: pending → granted → expired                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Components                                      │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ ActivateInstanceComponent               │   │   │
│  │  │   onEvent() → activateNewExecutionInst()│   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ExecutionInstances[]                            │   │
│  │  ┌────────────────┐  ┌────────────────┐        │   │
│  │  │  Instance #1   │  │  Instance #2   │  ...   │   │
│  │  │  elapsed: 100  │  │  elapsed: 50   │        │   │
│  │  │  state: exec   │  │  state: exec   │        │   │
│  │  └────────────────┘  └────────────────┘        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼ tick(dt)
┌─────────────────────────────────────────────────────────┐
│  Timeline: [cast:0ms] [hit:300ms] [end:500ms]          │
│  tagActions: { cast: [...], hit: [...] }                │
└─────────────────────────────────────────────────────────┘
```

## Todo Items

- [ ] 为 `AbilityExecutionInstance` 添加单元测试
- [ ] 为 `ActivateInstanceComponent` 添加单元测试
- [ ] 考虑让 `tickExecutions` 返回事件或明确文档说明
- [ ] 考虑增加取消时的清理机制（`cancelTag` 或 `onCancel` hook）
- [ ] 清理 index.ts 中重复导出的类型（`EventTrigger`/`TriggerMode`）

## Key Decisions

- **执行实例独立管理**：`AbilityExecutionInstance` 作为独立类，支持多实例并行（脱手技能场景）
- **Hook 语义调整**：`onApply/onRemove` 更准确描述效果应用/移除的时机
- **通配符匹配**：`tagActions` 支持 `prefix*` 格式的通配符
- **向后兼容**：`ExecutionContext.execution` 是可选字段，不破坏现有代码

## Review 评价

### 亮点

- 命名改进准确（`pending/granted` vs `idle/active`）
- 架构清晰，职责分离合理
- 文档完善，每个新文件都有详尽 JSDoc
- 支持多实例并行执行

### 需关注

1. **index.ts 导出重复类型** - `EventTrigger`/`TriggerMode` 同时从两处导出
2. **事件收集未完全集成** - `tickExecutions` 未自动处理实例产生的事件
3. **取消机制可增强** - 可考虑 `cancelTag` 或 `onCancel` hook

## Notes

这是一次高质量的架构提升，解决了主动技能执行与 Timeline 同步的核心问题。建议合并后补充测试用例。
