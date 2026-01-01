# Ability Component 重构：Unity 风格 API 与过期机制

Date: 2026-01-01

## Completed Work

- [x] getComponent 改为 Unity 风格（类构造函数参数）
- [x] 添加 getComponents 方法（获取所有同类型组件）
- [x] 移除 Ability.checkExpiration()，让 Component 主动触发
- [x] 过期原因追踪（expire(reason)，只记录第一个）
- [x] 重命名 DurationComponent → TimeDurationComponent
- [x] 提取 AbilitySet 中的过期清理逻辑（processAbilities）
- [x] 更新 AbilityRevokedCallback，传递 expireReason

## Key Changes

### 1. Unity 风格 getComponent

**Before:**
```typescript
const duration = ability.getComponent<DurationComponent>('duration');
//                                    ↑ 泛型和字符串没有关联
```

**After:**
```typescript
const duration = ability.getComponent(DurationComponent);
//    ^? DurationComponent | undefined  ← 自动推断类型
```

新增类型：
```typescript
type ComponentConstructor<T extends IAbilityComponent> = new (...args: any[]) => T;
```

### 2. 过期原因追踪

```typescript
// IAbilityForComponent 接口
expire(reason: string): void;

// Ability 实现
private _expireReason?: string;

expire(reason: string): void {
  if (this._state === 'expired') return;  // 只处理第一个
  this._expireReason = reason;
  this.deactivate();
  this._state = 'expired';
}

get expireReason(): string | undefined {
  return this._expireReason;
}
```

### 3. TimeDurationComponent

- 重命名：`DurationComponent` → `TimeDurationComponent`
- 专用于基于时间流逝的持续时间
- 回合制游戏应自行实现 `RoundDurationComponent`
- 导出常量：`EXPIRE_REASON_TIME_DURATION = 'time_duration'`

### 4. AbilitySet 过期清理逻辑提取

```typescript
// 统一的处理方法
private processAbilities(processor: (ability: Ability) => void): void {
  const expiredAbilities: Ability[] = [];
  for (const ability of this.abilities) {
    if (ability.isExpired) {
      expiredAbilities.push(ability);
      continue;
    }
    processor(ability);
    if (ability.isExpired) {
      expiredAbilities.push(ability);
    }
  }
  for (const expired of expiredAbilities) {
    this.revokeAbility(expired.id, 'expired', expired.expireReason);
  }
}

// tick() 和 receiveEvent() 复用此方法
tick(dt: number): void {
  this.processAbilities((ability) => ability.tick(dt));
}
```

### 5. 回调增强

```typescript
// AbilityRevokedCallback 新增 expireReason 参数
type AbilityRevokedCallback = (
  ability: Ability,
  reason: AbilityRevokeReason,
  abilitySet: AbilitySet<AttributesConfig>,
  expireReason?: string  // 新增
) => void;

// 使用示例
abilitySet.onAbilityRevoked((ability, reason, _, expireReason) => {
  if (reason === 'expired') {
    console.log(`${ability.configId} 过期原因: ${expireReason}`);
  }
});
```

## API Changes Summary

| Before | After |
|--------|-------|
| `getComponent<T>(type: string)` | `getComponent<T>(ctor: ComponentConstructor<T>)` |
| `getComponents()` 返回所有 | `getAllComponents()` 返回所有 |
| - | `getComponents<T>(ctor)` 返回指定类型 |
| `hasComponent(type: string)` | `hasComponent<T>(ctor)` |
| `expire()` | `expire(reason: string)` |
| `DurationComponent` | `TimeDurationComponent` |
| `duration()` | `timeDuration()` |

## Design Decisions

1. **Component 主动触发过期** - 谁持有状态谁负责，而非 Ability 轮询检查
2. **只记录第一个过期原因** - 多个 Component 可能同时触发，只保留首个
3. **TimeDurationComponent 命名** - 明确是基于时间的，回合制用 RoundDurationComponent
4. **expireReason 类型为 string** - 允许项目自定义过期原因

## Files Changed

- `src/core/abilities/Ability.ts` - getComponent/getComponents/expire
- `src/core/abilities/AbilityComponent.ts` - IAbilityForComponent.expire, ComponentTypes
- `src/core/abilities/AbilitySet.ts` - processAbilities, revokeAbility, callback
- `src/core/abilities/index.ts` - 导出 ComponentConstructor
- `src/stdlib/components/TimeDurationComponent.ts` - 新文件
- `src/stdlib/components/index.ts` - 更新导出
- 删除：`src/stdlib/components/DurationComponent.ts`
