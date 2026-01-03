# Ability 系统重构：主动使用与条件消耗

## 讨论背景

在 hex-atb-battle 项目验证 logic-game-framework 过程中，发现了 Ability 系统的一些设计问题。

---

## 问题 1：filter 命名不一致

### 现状
```typescript
// 事件字段叫 abilityId
type ActionUseEvent = { abilityId: string; ... };

// 配置字段叫 configId
type AbilityConfig = { configId: string; ... };

// filter 硬编码 configId，禁止了同配置多实例
filter: (e) => e.abilityId === 'skill_slash'
```

### 解决方案
```typescript
// 事件字段明确是实例 ID
type ActionUseEvent = { abilityInstanceId: string; ... };

// filter 使用 abilityCtx 访问当前 Ability 实例
filter: (event, abilityCtx) =>
  (event as ActionUseEvent).abilityInstanceId === abilityCtx.ability.id
```

**已完成**：SkillAbilities.ts 和 HexBattle.ts 已修改。

---

## 问题 2：GameEventComponent 命名不清晰

### 现状
- `GameEventComponent`：不创建实例，直接执行
- `ActivateInstanceComponent`：创建实例，Timeline 驱动

名字没有体现核心区别。

### 解决方案
重命名为 `NoInstanceComponent`：

| 组件 | 含义 |
|------|------|
| `NoInstanceComponent` | 不创建实例 |
| `ActivateInstanceComponent` | 激活（创建）实例 |

**已完成**：GameEventComponent.ts → NoInstanceComponent.ts

---

## 问题 3：释放条件和消耗放哪里？

### 讨论路径

1. **放在 ActivateInstanceComponent 内部？**
   - 问题：多个 ActivateInstanceComponent 时，每个都有条件/消耗，语义混乱

2. **放在 Ability 层？**
   - 问题：与 Component 的 EC 模式不一致

3. **创建新的 ActiveUseComponent？**
   - 继承 ActivateInstanceComponent
   - 额外包含 conditions 和 costs
   - 一个 Ability 最多一个（或多个用于多段技能）

### 最终方案：ActiveUseComponent

```typescript
class ActiveUseComponent extends ActivateInstanceComponent {
  conditions?: Condition[];
  costs?: Cost[];

  onEvent(event, context, gameplayState) {
    if (!this.checkConditions(context)) return;
    if (!this.payCosts(context)) return;
    super.onEvent(event, context, gameplayState);
  }
}
```

---

## 问题 4：components 数组的语义

### 讨论路径

1. **多个 ActivateInstanceComponent 有意义吗？**
   - 有意义！如：每秒扣血 + 每两秒加攻击 = 两个不同周期的 Timeline

2. **要不要限制数量？**
   - 不限制，保留组合灵活性

3. **为什么用户觉得"难受"？**
   - 因为条件/消耗如果在每个 Component 里，就会重复

### 最终理解

- `components[]` 是**效果模块**，可自由组合
- `activeUseComponents[]` 是**主动激活入口**，包含条件/消耗
- 两者职责分离

---

## 问题 5：两种条件的区分

| 类型 | 时机 | 位置 | 例子 |
|------|------|------|------|
| 激活条件 | 释放技能时检查一次 | ActiveUseComponent.conditions | 冷却好了？MP够？ |
| 执行条件 | 每次效果触发时检查 | Action.condition | HP > 50%？ |

### 示例

```typescript
// 激活条件：释放时检查
new ActiveUseComponent({
  conditions: [new CooldownReady(), new ManaSufficient(20)],
  costs: [new ManaCost(20), new CooldownCost(5000)],
  ...
})

// 执行条件：每次 tick 检查
new ActivateInstanceComponent({
  tagActions: {
    tick: [
      new ConditionalAction({
        condition: (ctx) => getHpPercent(ctx.owner) > 0.5,
        actions: [new DamageAction(...), new BuffAction(...)],
      }),
    ],
  },
})
```

---

## 最终 AbilityConfig 结构

```typescript
type AbilityConfig = {
  configId: string;
  displayName?: string;
  description?: string;
  tags?: string[];

  // 主动使用组件（0-N 个，支持多段技能）
  activeUseComponents?: ActiveUseComponent[];

  // 效果组件（0-N 个，自由组合）
  components?: IAbilityComponent[];
};
```

### 示例

```typescript
// 主动技能
const fireball: AbilityConfig = {
  configId: 'skill_fireball',
  activeUseComponents: [
    new ActiveUseComponent({
      triggers: [{ eventKind: ACTION_USE_EVENT, filter: ... }],
      conditions: [new CooldownReady()],
      costs: [new ManaCost(20), new CooldownCost(5000)],
      timelineId: 'skill_fireball',
      tagActions: { hit: [new DamageAction(...)] },
    }),
  ],
};

// 多段技能
const combo: AbilityConfig = {
  configId: 'skill_combo',
  activeUseComponents: [
    new ActiveUseComponent({ /* 第一段 */ }),
    new ActiveUseComponent({ /* 第二段 */ }),
    new ActiveUseComponent({ /* 第三段 */ }),
  ],
};

// Buff（无主动激活）
const poisonBuff: AbilityConfig = {
  configId: 'buff_poison',
  // activeUseComponents 为空或 undefined
  components: [
    new DurationComponent({ time: 10000 }),
    new StatModifierComponent({ ... }),
    new ActivateInstanceComponent({ timelineId: 'tick_1s', ... }),  // 每秒扣血
    new NoInstanceComponent({ triggers: [...], ... }),              // 被攻击传染
  ],
};
```

---

## 问题 6：多段技能的实现方式

### 原方案
在 Ability 类中追踪 `currentStageIndex`，处理超时重置。

### 问题
1. **核心类污染**：Ability 本应只是组件容器，不该包含连招业务逻辑
2. **灵活性受限**：整数型 index 难以表达分支连招（A→B 或 A→C）

### 优化方案：Tag 驱动（采纳）

利用 Tag + Duration 数据驱动连招，不修改 Ability 核心：

```typescript
const combo: AbilityConfig = {
  configId: 'skill_combo',
  activeUseComponents: [
    // 第一段：无连招状态时触发
    new ActiveUseComponent({
      conditions: [new NoTag('combo_window')],
      tagActions: {
        hit: [...],
        end: [new ApplyTagAction({ tag: 'combo_window', duration: 1000 })],
      },
    }),
    // 第二段：在连招窗口内触发
    new ActiveUseComponent({
      conditions: [new HasTag('combo_window')],
      costs: [new ConsumeTagCost('combo_window')],
      tagActions: {
        hit: [...],
        end: [new ApplyTagAction({ tag: 'combo_window_2', duration: 1000 })],
      },
    }),
  ],
};
```

### 优势

| 方面 | 状态机驱动 | Tag 驱动 |
|------|-----------|----------|
| Ability 侵入 | 需要修改核心类 | 零侵入 |
| 超时重置 | 手动实现 timer | Duration 自动管理 |
| 分支连招 | 难以表达 | 配置不同 Tag 即可 |

---

## Tag 系统设计

### 位置：AbilitySet

参考 UE GAS 架构，将 Tag 放在 AbilitySet（类似 AbilitySystemComponent）中：

```typescript
class AbilitySet {
  // 现有功能
  private abilities: Map<string, Ability>;

  // 新增：Tag 系统
  private tags: Map<string, TagInfo>;

  // Tag 操作
  addTag(tag: string, options?: { duration?: number; stacks?: number }): void;
  removeTag(tag: string): void;
  hasTag(tag: string): boolean;
  getTagStacks(tag: string): number;

  // Tick 时清理过期 Tag
  tick(dt: number): void;
}

type TagInfo = {
  addedAt: number;       // 添加时间（logicTime）
  duration?: number;     // 持续时间（undefined = 永久）
  stacks: number;        // 层数
};
```

### 与 Condition 的集成

```typescript
type ConditionContext = {
  owner: ActorRef;
  abilitySet: AbilitySet;  // 可以查询 Tag
  gameplayState: unknown;
};

class HasTagCondition implements Condition {
  constructor(private tag: string) {}

  check(ctx: ConditionContext): boolean {
    return ctx.abilitySet.hasTag(this.tag);
  }
}
```

### Tag 相关 Action

```typescript
// 施加 Tag
new ApplyTagAction({ tag: 'combo_window', duration: 1000 })

// 移除 Tag
new RemoveTagAction({ tag: 'combo_window' })
```

---

## 待实现

1. **框架层 - Tag 系统**
   - [ ] AbilitySet 新增 Tag 管理（addTag, removeTag, hasTag, tick）
   - [ ] TagInfo 类型定义
   - [ ] ApplyTagAction / RemoveTagAction

2. **框架层 - ActiveUse 系统**
   - [ ] 创建 `ActiveUseEventBase`（继承 GameEventBase，允许项目自定义字段）
   - [ ] 创建 `ActiveUseComponent`（继承 ActivateInstanceComponent）
   - [ ] 修改 `AbilityConfig`，新增 `activeUseComponents` 字段

3. **条件/消耗系统**
   - [ ] 定义 `Condition` 接口 + ConditionContext
   - [ ] 定义 `Cost` 接口
   - [ ] 实现常用条件：CooldownReady, HasTag, NoTag, InRange 等
   - [ ] 实现常用消耗：ManaCost, CooldownCost, ConsumeTagCost 等

4. **项目层（hex-atb-battle）**
   - [ ] 迁移现有技能到新结构
   - [ ] 验证多段技能场景（Tag 驱动）

---

## 设计原则总结

1. **Ability 是统一容器**：主动技能、Buff、被动本质相同
2. **Component 是正交模块**：StatModifier、Duration、Timeline 效果可自由组合
3. **ActiveUseComponent 是主动入口**：包含条件/消耗，与效果组件分离
4. **事件驱动统一模型**：不需要额外的主动调用接口
5. **两种条件分层**：激活条件 vs 执行条件，职责清晰
