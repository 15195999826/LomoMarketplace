# Timeline 时间轴系统 + bindToTag

Date: 2026-01-01 20:15
Git Commit: 446adcb

## Completed Work

- [x] `TimelineAsset` 数据结构定义（id, totalDuration, tags）
- [x] `TimelineRegistry` 注册表（register, get, has）
- [x] `BaseAction.bindToTag(tagName)` 链式调用方法
- [x] `IAction.getBoundTag()` 接口定义
- [x] 更新设计文档至 v0.14
- [x] 构建和测试通过

## Todo Items

- [ ] 定义 `TimelineTagEvent` 事件类型
- [ ] GameEventComponent 响应 TimelineTagEvent，匹配 Action 的 boundTag
- [ ] Stdlib 层提供 TimelineExecution 示例（管理单个 Timeline 的执行）
- [ ] ATB 游戏示例：行动条 + Timeline 驱动
- [ ] 回合制游戏示例：状态机 + Timeline 驱动

## Key Decisions

1. **分层设计**
   - Core 层只提供机制（TimelineAsset、bindToTag）
   - 调度策略（串行/并行、等待动画等）由项目层实现
   - ATB 和回合制是 stdlib/examples 层面的内容

2. **时间轴数据来源**
   - 数据从渲染端资产转换（蒙太奇/Sequence → JSON）
   - 框架不关心转换脚本如何实现
   - 概念接近表格，通过 id（RowName）获取

3. **两种游戏模式的统一模型**
   ```
   ATB:      行动条满 → 启动技能 → Timeline.advance(dt) → Tag 到达 → 抛事件
   回合制:   状态机 → ReleaseAbility 阶段 → Timeline.advance(dt) → Tag 到达 → 抛事件
   ```
   - 共同点：都通过 `TimelineTagEvent` 触发 Action
   - 区别：流程控制（行动条 vs 状态机）

4. **无时间轴 Ability 的处理**
   - 无时间轴 = 瞬时触发，所有 Action 立即执行
   - 有时间轴 = Action 在绑定的 Tag 时间点执行

5. **API 设计：链式调用**
   ```typescript
   new DamageAction({ damage: 100 })
     .setTargetSelector(TargetSelectors.currentTarget)
     .bindToTag("ActionPoint0")
     .onCritical(new AddBuffAction({ buffId: 'burning' }));
   ```

## Notes

- 参考项目：`D:\UEProjects\DESKTK\Source\DESKTK\...\TurnBasedAutoChessInstance`
- DESKTK 使用状态机 + 信号机制管理回合流程
- 逻辑层"模拟"的是时间轴推进，不是动画播放
- Core 层不关心"为什么启动技能"和"流程如何推进"

## Files Changed

- `src/core/timeline/Timeline.ts` - 新增
- `src/core/timeline/index.ts` - 新增
- `src/core/actions/Action.ts` - 添加 bindToTag/getBoundTag
- `src/core/index.ts` - 导出 timeline 模块
- `plan_docs/LogicPerformanceSeparation_AbilitySystem.md` - 更新至 v0.14
