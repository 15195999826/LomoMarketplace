# Logic Game Framework 重构代码审查

Date: 2026-01-01

## Completed Work

- [x] 审查了最近4次 git 提交的代码变更
  - `9544436` - 添加 AbilitySet 双层触发机制
  - `b3fd360` - 将具体事件类型移至 examples，简化框架层
  - `742e8f9` - ActionComponent 重命名为 GameEventComponent
  - `0c355a0` - 移除 AbilityTags，添加示例
- [x] 修复 `ExecutionContext.battle` 为 null 的处理不一致问题
  - `battle: IGameplayInstance` → `gameplayState: unknown`
  - 项目可以传入快照或实例引用，由项目决定
  - 更新了 `AbilitySet.receiveEvent`、`Ability.receiveEvent`、`IAbilityComponent.onEvent` 签名
- [x] 重构标准实现命名
  - `AbilitySystem` → `StandardAbilitySystem`（移至 `stdlib/systems/`）
  - `BattleInstance` → `StandardBattleInstance`（文件重命名）
  - 注释说明这些是可选的标准实现，项目可自行实现

## Todo Items

- [ ] 为 stdlib 提供类型安全的事件工厂，避免事件 kind 拼写错误
- [ ] 提取 `AbilitySet.tick()` 和 `receiveEvent()` 中重复的过期清理逻辑
- [ ] 为 examples 目录添加 index.ts 导出

## Key Decisions

- **框架层薄、游戏层厚** - 框架只提供机制，不对事件结构、标签语义做假设
- **双层触发机制** - 内部 Hook (tick/activate/deactivate) 用于框架级组件，事件响应 (onEvent) 用于业务级组件
- **统一事件模型** - 所有 Action 执行都是事件驱动，主动/被动技能通过同一机制触发
- **Component 构造时注入** - 运行时不可修改，简化生命周期管理
- **gameplayState: unknown** - 框架不假设游戏状态类型，项目层通过类型断言访问
- **标准实现在 stdlib** - Core 只提供接口和基类，具体实现（StandardAbilitySystem、StandardBattleInstance）在 stdlib

## Notes

### 重构亮点

1. `AbilitySet` 取代散落在 Actor 中的 abilities 数组，统一管理
2. `GameEventComponent` 是框架中唯一触发 Action 执行的组件
3. 框架只保留 `GameEventBase` 接口，游戏自定义事件类型
4. 示例代码（examples/）演示了 RPG/MOBA/回合制不同风格的标签和事件定义
5. `gameplayState: unknown` 让项目决定传快照还是实例引用

### 目录结构变更

```
src/
├── core/                    # 机制层（接口、基类）
│   └── abilities/
│       └── index.ts         # 不再导出 AbilitySystem
└── stdlib/                  # 标准库（可选实现）
    ├── systems/
    │   └── StandardAbilitySystem.ts   ← 从 core 移出
    └── battle/
        └── StandardBattleInstance.ts  ← 重命名
```

### 代码质量评价

整体设计方向正确，代码质量较高。ExecutionContext 问题已修复，标准实现命名更清晰。
