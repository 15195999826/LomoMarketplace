# ActiveUseComponent 代码审查

Date: 2026-01-04 21:14
Git Commit: 6165d68

## Completed Work

- [x] Review 了 git 中未提交的变更内容
- [x] 分析了 4 个变更文件：
  - `GameEvent.ts` - 新增标准 AbilityActivateEvent 类型
  - `ActiveUseComponent.ts` - 默认触发器 + 连招文档
  - `SkillAbilities.ts` - 迁移到新的 ActiveUse 模式
  - `TagAction.test.ts` - Tag 操作单元测试
- [x] 识别了亮点和潜在问题

## Todo Items

- [ ] 确认 `CooldownReadyCondition` 和 `CooldownCost` 在框架 index 中正确导出
- [ ] 为 HasTagAction 多目标行为添加明确的 API 文档（当前行为：每个 target 独立判断，可能导致 then/else 被多次执行）
- [ ] 考虑让 MOVE_ABILITY 也用 `ActiveUseComponent({ conditions: [], costs: [] })` 保持一致性

## Key Decisions

- **默认触发器设计**：`ActiveUseComponent` 不再需要手动指定 triggers，默认监听 `AbilityActivateEvent` 并自动匹配 `abilityInstanceId`
- **事件类型扩展**：项目层通过交叉类型扩展 `AbilityActivateEvent`（如添加 target、targetCoord），保持 kind 不变
- **移动 vs 技能区分**：移动使用 `ActivateInstanceComponent`（无条件/消耗），技能使用 `ActiveUseComponent`（带冷却）

## Notes

### 代码审查评分：⭐⭐⭐⭐ 优秀

**亮点：**
1. API 简化显著，从冗长的 triggers 配置变为零配置
2. 连招示例文档清晰（Tag + Duration 驱动多段技能）
3. 测试覆盖全面（LooseTag vs AutoDurationTag、层数累加、多目标、边界情况）

**潜在问题：**
1. HasTagAction 多目标行为语义不清晰（AND vs per-target）
2. 冷却时间配置（SKILL_COOLDOWNS）与 configId 没有类型关联

### 变更文件清单

```
modified:   apps/hex-atb-battle/src/skills/SkillAbilities.ts
modified:   packages/logic-game-framework/src/core/abilities/ActiveUseComponent.ts
modified:   packages/logic-game-framework/src/core/events/GameEvent.ts
modified:   packages/logic-game-framework/src/core/events/index.ts
untracked:  packages/logic-game-framework/tests/core/actions/TagAction.test.ts
untracked:  plan_docs/AbilitySystem_Refactor_ActiveUse.md
```
