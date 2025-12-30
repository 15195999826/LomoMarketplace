# Inkmon Core Details

<!-- region Generated Config Start -->
```yaml
description: "InkMon 核心库，包含类型定义、Zod 验证 Schema、SQLite 数据库操作和文件同步功能"
tracked_paths:
  - "packages/inkmon-core/src/"
last_updated: "2025-12-31"
```
<!-- region Generated Config End -->

<!-- SECTION: core-concepts -->
<!-- TRACKED_FILES: types.ts, schema.ts, validators.ts -->
## 1. Core Concepts

| Concept | Responsibility |
|---------|----------------|
| `InkMon` | 主数据模型，包含名称、属性、六维数值、进化、生态等完整信息 |
| `InkMonSchema` | Zod Schema，定义数据结构和验证规则 |
| `Element` | 14 种属性类型（火、水、草等） |
| `EvolutionStage` | 进化阶段（baby/mature/adult），决定 BST 范围 |
| `BST_RANGES` | 各进化阶段的种族值范围约束 |
| `DatabaseSync` | Node.js 原生 SQLite 同步 API 单例 |

### InkMon 数据结构层次

```
InkMon
├── 基础信息: name, name_en, dex_number, description
├── elements: { primary, secondary }
├── stats: { hp, attack, defense, sp_attack, sp_defense, speed, bst }
├── design: { base_animal, features[], color_palette[] }
├── evolution: { stage, evolves_from, evolves_to[], evolution_method }
├── ecology: { habitat, diet, predators[], prey[], symbiosis[], competition[] }
└── image_prompts: { design }
```

### 验证层次

1. **Schema 验证** - Zod 类型和格式校验
2. **业务规则验证** - BST 计算、范围、风格锚点词
<!-- END_SECTION -->

<!-- SECTION: design-decisions -->
<!-- TRACKED_FILES: database.ts, queries.ts -->
## 2. Design Decisions

### 2.1 同步 SQLite API
**Decision**: 使用 Node.js 原生 `node:sqlite` 的 `DatabaseSync` 同步 API
**Rationale**: 简化代码结构，避免异步复杂性；MCP 服务器场景无需高并发

### 2.2 数据库单例模式
**Decision**: 全局单例 `db` 变量 + `getDatabase()` 懒加载
**Rationale**: 确保连接复用，支持通过 `setDatabasePath()` 在首次访问前配置路径

### 2.3 JSON 字段存储
**Decision**: 数组字段（features, evolves_to, predators 等）存储为 JSON 字符串
**Rationale**: SQLite 不原生支持数组，JSON 序列化保持灵活性

### 2.4 双层验证
**Decision**: Zod Schema + 业务规则分离验证
**Rationale**:
- Zod: 类型安全和基础格式校验
- validateInkMon: 业务逻辑（BST 计算、范围、风格锚点词）

### 2.5 文件-数据库同步策略
**Decision**: `compareInkMon()` 深度比较 + `syncInkMonFromFile()` 智能同步
**Rationale**: 支持增量更新，避免重复写入一致数据
<!-- END_SECTION -->

<!-- SECTION: api-interfaces -->
<!-- TRACKED_FILES: index.ts, types.ts, queries.ts, file-ops.ts -->
## 3. Core Interfaces

```typescript
// 核心类型
type Element = "fire" | "water" | "grass" | ... | "dragon";  // 14种
type EvolutionStage = "baby" | "mature" | "adult";
type DietType = "herbivore" | "carnivore" | "omnivore" | "special";

// 主数据模型
interface InkMon {
  name: string;           // 中文名 (2-4字符)
  name_en: string;        // 英文名 (仅字母, max 12)
  dex_number: number;     // 图鉴编号
  description: string;    // 描述 (max 200)
  elements: { primary: Element; secondary: Element | null };
  stats: { hp, attack, defense, sp_attack, sp_defense, speed, bst };
  design: { base_animal, features[], color_palette[] };
  evolution: { stage, evolves_from, evolves_to[], evolution_method };
  ecology: { habitat, diet, predators[], prey[], symbiosis?, competition? };
  image_prompts: { design };
}

// 轻量列表项
interface InkMonListItem { dex_number, name, name_en, primary_element, ... }

// 操作结果类型
interface AddInkMonResult { success: boolean; message: string; id?: number }
interface SyncResult { success, action: "added"|"updated"|"skipped"|"failed", ... }
```

### 3.1 数据库操作 API

| API | Description |
|-----|-------------|
| `getDatabase()` | 获取 SQLite 连接单例 |
| `setDatabasePath(path)` | 设置自定义数据库路径（需在首次访问前调用） |
| `initializeDatabase()` | 创建表结构和索引 |
| `closeDatabase()` | 关闭数据库连接 |

### 3.2 查询 API

| API | Description |
|-----|-------------|
| `getAllInkMons()` | 获取所有 InkMon 列表项 |
| `getInkMonsPaginated(page, pageSize)` | 分页查询 |
| `getInkMonByNameEn(nameEn)` | 按英文名查询完整数据 |
| `getInkMonByDexNumber(dex)` | 按图鉴号查询 |
| `searchInkMons(query)` | 搜索（中/英文名、图鉴号） |
| `filterInkMons(options)` | 按属性/阶段筛选 |
| `listInkMonNamesEn()` | 列出所有英文名 |
| `getNextDexNumber()` | 获取下一个可用图鉴号 |
| `getInkMonCount()` | 获取总数 |

### 3.3 写入 API

| API | Description |
|-----|-------------|
| `addInkMon(inkmon)` | 新增（含验证） |
| `updateInkMon(inkmon)` | 更新（按 name_en） |
| `deleteInkMon(nameEn)` | 删除 |

### 3.4 文件操作 API

| API | Description |
|-----|-------------|
| `readInkMonFile(nameEn)` | 读取 JSON 文件并验证 |
| `listLocalInkMonFiles()` | 列出本地所有 JSON 文件 |
| `compareInkMon(nameEn)` | 比较文件与数据库差异 |
| `batchCompareInkMons()` | 批量比较所有文件 |
| `syncInkMonFromFile(nameEn)` | 同步文件到数据库 |
<!-- END_SECTION -->

<!-- SECTION: formulas-algorithms -->
<!-- TRACKED_FILES: validators.ts, types.ts -->
## 4. Formulas / Core Algorithms

### 4.1 BST (Base Stat Total) 计算

```
BST = HP + Attack + Defense + Sp.Attack + Sp.Defense + Speed
```

### 4.2 BST 范围约束

| Evolution Stage | Min BST | Max BST |
|-----------------|---------|---------|
| baby | 250 | 350 |
| mature | 350 | 450 |
| adult | 450 | 550 |

### 4.3 风格锚点词验证

`image_prompts.design` 必须包含以下 5 个词：
- `low poly`
- `faceted`
- `sharp edges`
- `ink sketch texture`
- `non-reflective surface`

### 4.4 文件同步状态机

```
compareInkMon(nameEn)
        │
        ├─ 文件不存在 ──→ 检查 DB
        │                    ├─ DB 有 → "not_in_file"
        │                    └─ DB 无 → error
        │
        ├─ 文件存在 + DB 无 ──→ "not_in_db"
        │
        └─ 两者都有 ──→ deepCompare()
                            ├─ 无差异 → "identical"
                            └─ 有差异 → "different" + differences[]
```
<!-- END_SECTION -->

## 5. Usage Examples

```typescript
import {
  setDatabasePath,
  initializeDatabase,
  getInkMonByNameEn,
  addInkMon,
  syncInkMonFromFile,
  validateInkMon,
  type InkMon
} from '@inkmon/core';

// 1. 初始化数据库（可选自定义路径）
setDatabasePath('/custom/path/inkmon.db');
initializeDatabase();

// 2. 查询 InkMon
const inkmon = getInkMonByNameEn('Flamefox');
if (inkmon) {
  console.log(`${inkmon.name} (${inkmon.stats.bst} BST)`);
}

// 3. 验证并添加新 InkMon
const newInkMon: InkMon = { /* ... */ };
const errors = validateInkMon(newInkMon);
if (errors.length === 0) {
  const result = addInkMon(newInkMon);
  console.log(result.message);
}

// 4. 从文件同步到数据库
const syncResult = syncInkMonFromFile('Flamefox');
console.log(`${syncResult.action}: ${syncResult.message}`);
```

## 6. Extension Guide

### 6.1 添加新属性类型

编辑 `types.ts`:
```typescript
export const VALID_ELEMENTS = [
  // ... 现有属性
  "cosmic",  // 添加新属性
] as const;
```

同时更新 `schema.ts` 中的 CHECK 约束。

### 6.2 添加新验证规则

编辑 `validators.ts`:
```typescript
export function validateInkMon(inkmon: InkMon): ValidationError[] {
  const errors: ValidationError[] = [];

  // 添加自定义验证
  if (inkmon.ecology.predators.includes(inkmon.name_en)) {
    errors.push({
      field: "ecology.predators",
      message: "不能以自己为捕食者"
    });
  }

  // ... 现有验证
}
```

### 6.3 添加新查询方法

编辑 `queries.ts`，遵循现有模式：
```typescript
export function getInkMonsByHabitat(habitat: string): InkMonListItem[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT ... FROM inkmons WHERE habitat = ?
  `).all(habitat) as InkMonListRow[];
  return rows.map(rowToListItem);
}
```

## 7. Common Issues

| Issue | Solution |
|-------|----------|
| `setDatabasePath` 不生效 | 必须在首次调用 `getDatabase()` 之前设置 |
| BST 验证失败 | 检查六维之和是否等于声明的 bst 值 |
| 风格锚点词验证失败 | 确保 `image_prompts.design` 包含全部 5 个锚点词 |
| UNIQUE 约束冲突 | `name_en` 和 `dex_number` 必须唯一 |
| 同步显示 "skipped" | 文件与数据库内容一致，无需更新 |
| JSON 解析错误 | 检查 color_palette 是否为 `#RRGGBB` 格式 |
