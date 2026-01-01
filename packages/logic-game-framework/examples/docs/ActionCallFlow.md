# Action 调用流程

本文档展示 Action 执行的完整调用链，帮助理解框架的工作方式。

## 基础调用流程

```
GameEventComponent.onEvent(inputActionEvent)
├── matchesTrigger(event) → true
└── executeActions(ctx)
    └── DamageAction.execute(ctx)
        ├── getTargets(ctx) → [敌人A]
        ├── calculateDamage() → 150
        ├── checkCritical() → true
        ├── checkKill() → false
        ├── eventCollector.emit(DamageEvent)
        └── processCallbacks(result, ctx)
            └── getTriggeredCallbacks(DamageEvent)
                ├── onHit → ✓
                ├── onCritical → ✓ (isCritical=true)
                └── onKill → ✗
                    │
                    ├── [onHit] HealAction.execute(callbackCtx)
                    │   ├── getTargets() → [abilityOwner]
                    │   └── eventCollector.emit(HealEvent)
                    │
                    └── [onCritical] AddBuffAction.execute(callbackCtx)
                        ├── getTargets() → [currentTarget]
                        └── eventCollector.emit(BuffAppliedEvent)
```

## eventChain 在各层的状态

```
Layer 0 (主 Action):
├── eventChain = [InputActionEvent]
├── getCurrentEvent() → InputActionEvent
└── getOriginalEvent() → InputActionEvent

Layer 1 (回调 Action):
├── eventChain = [InputActionEvent, DamageEvent]
├── getCurrentEvent() → DamageEvent
└── getOriginalEvent() → InputActionEvent

Layer 2 (回调的回调):
├── eventChain = [InputActionEvent, DamageEvent, BuffEvent]
├── getCurrentEvent() → BuffEvent
└── getOriginalEvent() → InputActionEvent  ← 始终可追溯
```

## 完整示例：火球术 + 暴击流血

### 技能定义

```typescript
const fireballAbility = new Ability({
  configId: 'skill_fireball',
  components: [
    new GameEventComponent({
      triggers: [{ eventKind: 'inputAction' }],
      actions: [
        new DamageAction({ damage: 100, damageType: 'fire' })
          .setTargetSelector(TargetSelectors.originalTarget)
          .onCritical(
            new AddBuffAction({ buffConfigId: 'buff_burning', duration: 5000 })
              .setTargetSelector(TargetSelectors.currentTarget)
          )
          .onKill(
            new HealAction({ healAmount: 50 })
              .setTargetSelector(TargetSelectors.abilityOwner)
          ),
      ],
    }),
  ],
});
```

### 执行流程

```
玩家输入：使用火球术，目标=敌人A
    │
    ▼
StandardBattleInstance.processInputAction()
├── 创建 InputActionEvent { kind: 'inputAction', abilityId: 'fireball', targets: [敌人A] }
└── AbilitySystem.broadcastEvent(inputActionEvent)
    │
    ▼
AbilitySet.receiveEvent(inputActionEvent)
└── GameEventComponent.onEvent(inputActionEvent)
    ├── matchesTrigger({ eventKind: 'inputAction' }) → true
    └── executeActions()
        │
        ▼
        createExecutionContext()
        ├── eventChain: [InputActionEvent]
        ├── gameplayState: battleInstance
        ├── eventCollector: new EventCollector()
        └── ability: { id, configId, owner, source }
            │
            ▼
        DamageAction.execute(ctx)
        ├── targets = TargetSelectors.originalTarget(ctx) → [敌人A]
        ├── damage = calculateDamage(100) → 150 (暴击)
        ├── isCritical = true
        ├── isKill = false
        ├── emit({ kind: 'damage', target: 敌人A, damage: 150, isCritical: true })
        └── processCallbacks(result, ctx)
            │
            ├── event = DamageEvent { isCritical: true, isKill: false }
            ├── getTriggeredCallbacks(event)
            │   ├── onHit → 不存在此回调
            │   ├── onCritical → ✓ 触发
            │   └── onKill → ✗ isKill=false
            │
            └── [onCritical] createCallbackContext(ctx, DamageEvent)
                ├── eventChain: [InputActionEvent, DamageEvent]
                └── AddBuffAction.execute(callbackCtx)
                    ├── targets = TargetSelectors.currentTarget(ctx)
                    │   └── getCurrentEvent() → DamageEvent
                    │       └── DamageEvent.target → [敌人A]
                    └── emit({ kind: 'buffApplied', target: 敌人A, buffId: 'burning' })
```

### 最终输出

```typescript
eventCollector.getEvents() = [
  { kind: 'damage', target: 敌人A, damage: 150, isCritical: true, isKill: false },
  { kind: 'buffApplied', target: 敌人A, buffId: 'buff_burning', duration: 5000 },
]
```

## TargetSelector 在回调中的作用

| 选择器 | 读取来源 | 典型用途 |
|--------|----------|----------|
| `currentSource` | `getCurrentEvent().source` | 反伤（攻击者） |
| `currentTarget` | `getCurrentEvent().target` | 对被命中目标施加效果 |
| `originalTarget` | `getOriginalEvent().target` | 玩家选择的原始目标 |
| `abilityOwner` | `ctx.ability.owner` | 自我增益/回血 |

### 反伤示例

```
敌人A 攻击 玩家
    │
    ▼
DamageEvent { source: 敌人A, target: 玩家 }
    │
    ▼
荆棘甲 GameEventComponent 触发
└── ReflectDamageAction.execute(ctx)
    ├── target = TargetSelectors.currentSource(ctx)
    │   └── getCurrentEvent().source → 敌人A
    └── emit({ kind: 'damage', target: 敌人A, damage: 反伤值 })
```
