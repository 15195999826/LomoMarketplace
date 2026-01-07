# Action ParamResolver 模式改造

Date: 2026-01-03 13:00
Git Commit: f73ca03

## Completed Work

- 修复了 hex-atb-battle 技能目标选择问题（ActionUseEvent.targetId → target: ActorRef）
- 修复了 MoveAction 坐标传递问题（从事件中读取 targetCoord）
- 完成 Action 参数模式改造：
  - 创建 `ParamResolver.ts` - 支持延迟求值的参数类型
  - 改造 `BaseAction` - 支持泛型参数，移除链式 set 方法
  - 更新 `examples/actions/*` - DamageAction, HealAction, AddBuffAction
  - 更新 `hex-atb-battle/src/actions/*` - 应用层 Actions
  - 更新 `SkillAbilities.ts` - 使用新的构造函数参数写法

## Key Decisions

- **参数配置**：使用构造函数参数（必填），放弃链式 set 方法
- **回调方法**：保持链式写法（onHit, onCritical, onKill 等）
- **延迟求值**：`ParamResolver<T> = T | ((ctx: ExecutionContext) => T)`
- **MoveAction 设计**：targetSelector 决定"谁要移动"，targetCoord 决定"移动到哪里"

## New API Examples

```typescript
// 伤害技能
new DamageAction({ damage: 50, damageType: 'physical' })

// 移动（动态参数）
new MoveAction({
  targetSelector: abilityOwnerSelector,
  targetCoord: (ctx) => (getCurrentEvent(ctx) as ActionUseEvent).targetCoord!,
})

// 动态伤害（基于属性）
new DamageAction({
  damage: (ctx) => ctx.ability?.owner?.attributes.get('ATK')?.currentValue * 1.5,
  damageType: 'physical',
})

// 带回调
new DamageAction({ damage: 100 })
  .onCritical(new HealAction({ healAmount: 20 }))
```

## Modified Files

| 文件 | 改动 |
|------|------|
| `packages/logic-game-framework/src/core/actions/ParamResolver.ts` | 新建 |
| `packages/logic-game-framework/src/core/actions/Action.ts` | 改造 BaseAction |
| `packages/logic-game-framework/src/core/actions/index.ts` | 导出新类型 |
| `packages/logic-game-framework/examples/actions/*.ts` | 使用新参数模式 |
| `apps/hex-atb-battle/src/actions/*.ts` | 使用新参数模式 |
| `apps/hex-atb-battle/src/skills/SkillAbilities.ts` | 更新配置写法 |

## Todo Items

- [x] 提交本次改动 ✅ 已提交
- [ ] 更新框架文档，说明新的 Action 参数模式（低优先级）
- [ ] 考虑为常用 TargetSelector 提供预定义实现（低优先级）

## Notes

- 改造后所有测试通过，战斗系统正常运行
- ParamResolver 模式让 Action 参数更加灵活，支持静态值和动态计算
- 构造函数参数的好处：TypeScript 编译时检查必填参数，不会遗漏
