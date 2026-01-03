# Ability 系统重构：ActiveUse 与条件消耗

Date: 2026-01-03 23:52
Git Commit: bffbd07

## Completed Work

### 代码修改（已合并前的改动）
- `SkillAbilities.ts`: 事件字段 `abilityId` → `abilityInstanceId`，filter 使用 `abilityCtx.ability.id`
- `HexBattle.ts`: 对应修改事件创建逻辑
- `GameEventComponent.ts` → `NoInstanceComponent.ts`: 重命名，与 ActivateInstanceComponent 形成对比

### 框架层新增（本次实现）
1. **Tag 系统** - `AbilitySet.ts`
   - addTag, removeTag, hasTag, getTagStacks, getTagInfo
   - tick 时自动清理过期 Tag
   - 支持 duration（持续时间）和 stacks（层数）

2. **Condition 接口** - `Condition.ts`
   - HasTagCondition, NoTagCondition, TagStacksCondition
   - CooldownReadyCondition
   - AllConditions, AnyCondition（组合条件）

3. **Cost 接口** - `Cost.ts`
   - CooldownCost（添加冷却 Tag）
   - ConsumeTagCost, RemoveTagCost, AddTagCost

4. **ActiveUseComponent** - `ActiveUseComponent.ts`
   - 继承 ActivateInstanceComponent
   - 激活前检查 conditions，扣除 costs
   - 从 gameplayState 获取 AbilitySet

5. **Tag Action** - `TagAction.ts`
   - ApplyTagAction, RemoveTagAction, HasTagAction

6. **AbilityConfig 扩展** - `Ability.ts`
   - 新增 `activeUseComponents?: ActiveUseComponent[]`
   - 构造时自动合并 activeUseComponents 和 components

## Todo Items

- [ ] 迁移 hex-atb-battle 现有技能到新的 AbilityConfig 结构
- [ ] 验证多段技能场景（Tag 驱动连招）
- [ ] 为 hex-atb-battle 实现 `getAbilitySetForActor` 接口

## Key Decisions

1. **filter 使用实例 ID**
   - 事件字段命名为 `abilityInstanceId`（明确是实例 ID）
   - filter 参数命名为 `abilityCtx`（简洁且明确）
   - 支持同配置多实例场景

2. **NoInstanceComponent 命名**
   - 原 GameEventComponent 重命名
   - 与 ActivateInstanceComponent 形成对比（有无实例）

3. **条件/消耗放在 ActiveUseComponent 内部**
   - 保持 components 数组的组合灵活性
   - 条件检查和消耗扣除是"激活"的一部分

4. **Tag 系统放在 AbilitySet**
   - 参考 UE GAS 架构（AbilitySystemComponent 管理 GameplayTags）
   - tick 时自动清理过期 Tag

5. **多段技能采用 Tag 驱动**
   - 不在 Ability 中追踪阶段状态
   - 通过 Tag + Duration 实现连招窗口
   - 支持分支连招（不同 Tag 检查）

## Notes

### 新的 AbilityConfig 结构

```typescript
type AbilityConfig = {
  configId: string;
  activeUseComponents?: ActiveUseComponent[];  // 主动入口
  components?: IAbilityComponent[];            // 效果组件
  displayName?: string;
  tags?: string[];
};
```

### 两种条件的区分

| 类型 | 时机 | 位置 |
|------|------|------|
| 激活条件 | 释放技能时检查一次 | ActiveUseComponent.conditions |
| 执行条件 | 每次效果触发时检查 | Action.condition |

### 设计文档

详细设计方案已保存至：`plan_docs/AbilitySystem_Refactor_ActiveUse.md`
