# Detailed Patterns and Examples / 详细模式和示例

## Anti-Patterns to Avoid / 需要避免的反模式

### 1. The "Just In Case" Pattern / "以防万一"模式

❌ **Bad / 糟糕:**
```typescript
function getUser(id: string) {
  if (!id) return null;  // When would this happen?
  if (typeof id !== 'string') return null;  // TypeScript already guarantees this
  if (id.length === 0) return null;  // Covered by !id
  if (id.length > 100) return null;  // Why 100? Magic number
  // ... actual logic
}
```

✅ **Good / 好:**
```typescript
function getUser(id: string) {
  return db.users.get(id);
}
```

**Why / 为什么:** Trust the type system. Validate at system boundaries only.
信任类型系统。只在系统边界验证。

### 2. The "Abstraction for One" Pattern / "为一个抽象"模式

❌ **Bad / 糟糕:**
```typescript
// Created interface for single implementation
interface IUserRepository {
  findById(id: string): User;
}

class UserRepository implements IUserRepository {
  findById(id: string): User { ... }
}

// Used in exactly one place
const repo: IUserRepository = new UserRepository();
```

✅ **Good / 好:**
```typescript
const userRepository = {
  findById(id: string): User { ... }
};
```

**Why / 为什么:** Don't design for hypothetical future requirements.
不要为假设的未来需求设计。

### 3. The "Configuration Everything" Pattern / "配置一切"模式

❌ **Bad / 糟糕:**
```typescript
const config = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 5000,
  enableLogging: true,
  logLevel: 'info',
  // ... 20 more options
};

function fetchData(url: string, options: typeof config) {
  // Complex logic handling all options
}
```

✅ **Good / 好:**
```typescript
async function fetchData(url: string) {
  const response = await fetch(url);
  return response.json();
}
```

**Why / 为什么:** Add configuration only when proven necessary.
只在证明必要时添加配置。

## Good Patterns / 好模式

### 1. Data Structure First / 数据结构优先

**Scenario / 场景:** Implementing a game inventory

**Bad approach / 糟糕方法:** Start with Item class, ItemManager, InventorySlot...

**Good approach / 好方法:**
```typescript
// First, define the core data structure
type Inventory = Map<ItemId, number>;  // Simple: item ID → quantity

// Then, operations are trivial
const addItem = (inv: Inventory, id: ItemId, qty: number) =>
  inv.set(id, (inv.get(id) ?? 0) + qty);

const removeItem = (inv: Inventory, id: ItemId, qty: number) => {
  const current = inv.get(id) ?? 0;
  if (current <= qty) inv.delete(id);
  else inv.set(id, current - qty);
};
```

### 2. Eliminate Special Cases / 消除特殊情况

**Scenario / 场景:** Different damage calculations for different attack types

❌ **Bad / 糟糕:**
```typescript
function calculateDamage(attacker, defender, attackType) {
  if (attackType === 'physical') {
    return attacker.atk - defender.def;
  } else if (attackType === 'magical') {
    return attacker.matk - defender.mdef;
  } else if (attackType === 'true') {
    return attacker.atk;  // Ignores defense
  } else if (attackType === 'percent') {
    return defender.maxHp * 0.1;
  }
  // More special cases...
}
```

✅ **Good / 好:**
```typescript
// Data structure encodes the behavior
type DamageFormula = (attacker: Stats, defender: Stats) => number;

const damageFormulas: Record<AttackType, DamageFormula> = {
  physical: (a, d) => a.atk - d.def,
  magical: (a, d) => a.matk - d.mdef,
  true: (a, d) => a.atk,
  percent: (a, d) => d.maxHp * 0.1,
};

const calculateDamage = (attacker, defender, type: AttackType) =>
  damageFormulas[type](attacker, defender);
```

### 3. Fail Fast / 快速失败

**Scenario / 场景:** Required configuration

❌ **Bad / 糟糕:**
```typescript
function initialize(config?: Config) {
  if (!config) {
    console.warn('No config provided, using defaults');
    config = getDefaultConfig();
  }
  if (!config.apiKey) {
    console.warn('No API key, some features may not work');
  }
  // Continues with potentially broken state
}
```

✅ **Good / 好:**
```typescript
function initialize(config: Config) {
  // If config is required, make it required
  // If apiKey is required, crash if missing
  if (!config.apiKey) {
    throw new Error('API key is required');
  }
  // Guaranteed valid state
}
```

## Real-World Examples / 真实案例

### Example 1: Simplifying a "Smart" System / 简化一个"智能"系统

**Before / 之前:**
```typescript
class SmartNotificationManager {
  private queue: Notification[] = [];
  private batchSize = 10;
  private debounceMs = 100;
  private priorities: Map<string, number> = new Map();

  addNotification(n: Notification) {
    this.queue.push(n);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    // Complex debouncing logic
    // Priority sorting
    // Batching logic
    // Error recovery
    // ... 200 lines
  }
}
```

**After / 之后:**
```typescript
const notify = (message: string) => {
  toast.show(message);
};
```

**Why this works / 为什么这样做:**
- The "smart" batching solved imaginary performance problems
- "智能"批处理解决的是假想的性能问题
- Users never complained about notification performance
- 用户从未抱怨过通知性能
- Simple solution: just show the notification
- 简单方案：直接显示通知

### Example 2: Over-Abstracted State Management / 过度抽象的状态管理

**Before / 之前:**
```typescript
// Custom state management "framework"
const createStore = <T>(initial: T) => {
  let state = initial;
  const subscribers: Set<(s: T) => void> = new Set();

  return {
    getState: () => state,
    setState: (partial: Partial<T>) => {
      state = { ...state, ...partial };
      subscribers.forEach(s => s(state));
    },
    subscribe: (fn: (s: T) => void) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    // ... more "features"
  };
};
```

**After / 之后:**
```typescript
// Just use React state
const [user, setUser] = useState<User | null>(null);
```

**Why / 为什么:**
- Don't reinvent framework features
- 不要重新发明框架功能
- React's useState/useContext covers 90% of cases
- React 的 useState/useContext 覆盖 90% 的场景

### Example 3: "Flexible" API Design / "灵活"的 API 设计

**Before / 之前:**
```typescript
interface QueryOptions {
  where?: Record<string, unknown>;
  orderBy?: string | string[];
  limit?: number;
  offset?: number;
  include?: string[];
  select?: string[];
  groupBy?: string[];
  having?: Record<string, unknown>;
}

function query(table: string, options: QueryOptions) {
  // 300 lines handling all combinations
}
```

**After / 之后:**
```typescript
// Specific functions for specific needs
const getUserById = (id: string) => db.users.get(id);
const getRecentUsers = (limit: number) =>
  db.users.orderBy('createdAt').desc().limit(limit);
const searchUsers = (name: string) =>
  db.users.filter(u => u.name.includes(name));
```

**Why / 为什么:**
- Generic flexibility often unused
- 通用的灵活性往往用不上
- Specific functions are clearer and more type-safe
- 具体函数更清晰、类型更安全

## Decision Framework / 决策框架

When facing a design decision:

面对设计决策时：

```
1. What is the SIMPLEST thing that could work?
   能工作的最简单方案是什么？

2. What problem am I ACTUALLY solving?
   我实际在解决什么问题？

3. Is this problem REAL or imaginary?
   这个问题是真实的还是假想的？

4. If I do nothing, what happens?
   如果我什么都不做，会怎样？

5. Can I delete code instead of adding code?
   我能删除代码而不是添加代码吗？
```

## Summary Table / 总结表

| Smell / 代码味道 | Question / 问题 | Action / 行动 |
|-----------------|----------------|---------------|
| Lots of if/else | Can data structure encode this? | Refactor to data |
| 大量 if/else | 数据结构能编码这个吗？ | 重构为数据 |
| Interface with one impl | Is abstraction needed? | Delete interface |
| 单实现的接口 | 需要抽象吗？ | 删除接口 |
| Config with 20 options | Which are actually used? | Remove unused |
| 20个选项的配置 | 哪些实际在用？ | 删除未用的 |
| Defensive null checks | Is null actually possible? | Trust the type |
| 防御性空检查 | null 真的可能吗？ | 信任类型 |
| "Smart" optimization | Is there a performance problem? | Profile first |
| "智能"优化 | 有性能问题吗？ | 先分析性能 |
