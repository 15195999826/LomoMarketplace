# InkWorld Plugin 实现计划

## 📋 概述

创建一个类似宝可梦世界模拟器的 Claude Code Plugin，为 **InkWorld** 游戏开发提供支持。

**项目信息**：
- 🌍 **世界名称**: InkWorld
- 🐾 **生物名称**: InkMon

**开发阶段**：
- 📌 **第一阶段（当前）**: InkMon 生物创建流程
  - 创建工作流：多轮讨论设计 InkMon → 生成 JSON 文档
  - 入库工作流：解析 JSON → 写入数据库
- 🔮 **第二阶段（后续）**: 战斗模拟、数据统计、数值平衡等

**Plugin 位置**: `plugins/InkMon/`

**技术背景**: 用户使用 UE (Unreal Engine) 制作游戏，并在 UE 中桥接了 TypeScript

---

## 📁 Plugin 目录结构

```
inkworld/
├── .claude-plugin/
│   └── plugin.json              # 插件清单
├── commands/                    # 斜杠命令 (用户显式调用)
│   └── inkmon.md                # /inkmon create | add <file.json>
├── skills/                      # Agent Skills (Claude 自动发现)
│   ├── designing-inkmon/        # InkMon 设计知识库
│   │   ├── SKILL.md             # 主文件：设计流程概览
│   │   ├── NAMING.md            # 命名规范和示例
│   │   ├── STATS.md             # 六维数值分配指南
│   │   ├── EVOLUTION.md         # 进化设计原则
│   │   ├── ELEMENTS.md          # 属性系统和克制关系
│   │   ├── ECOLOGY.md           # 生态关系设计
│   │   └── templates/
│   │       └── inkmon-schema.json  # InkMon JSON Schema
│   └── generating-image-prompts/   # 图片提示词生成
│       ├── SKILL.md
│       └── REFERENCE.md
├── agents/                      # Subagents (第二阶段)
│   ├── battle-analyst.md        # 战斗分析专家
│   └── balance-reviewer.md      # 数值平衡审查
├── mcp-server/                  # MCP Server 源码 (第二阶段)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # 入口
│       ├── server.ts            # MCP Server
│       ├── database/
│       │   ├── schema.ts        # 数据库 Schema
│       │   └── connection.ts    # 连接管理
│       ├── tools/               # MCP 工具
│       │   ├── inkmon-tools.ts
│       │   ├── battle-tools.ts
│       │   ├── evolution-tools.ts
│       │   └── stats-tools.ts
│       └── types/
│           └── index.ts
├── data/
│   ├── inkworld.db              # SQLite 数据库
│   └── inkmons/                 # 存放生成的 InkMon JSON 文件
├── web-app/                     # React SPA (独立子项目，第二阶段)
├── .mcp.json                    # MCP 配置
└── README.md
```

**重要规范**：
- 📝 **命名规范**: Skills 使用 gerund 形式 (如 `designing-inkmon`, `generating-image-prompts`)
- 📦 **文件大小限制**: SKILL.md 保持 500 行以内，详细内容拆分到独立文件
- 📂 **目录位置**: `commands/`, `skills/`, `agents/` 必须在 plugin 根目录，不能在 `.claude-plugin/` 内

---

## 🗄️ 数据库设计 (SQLite) - 第二阶段

> **注意**: 数据库和 MCP Server 将在第二阶段实现，第一阶段使用 JSON 文件存储

### 核心表

| 表名 | 用途 |
|------|------|
| `elements` | 属性/元素 (火、冰、土等) |
| `element_matchups` | 属性克制关系 |
| `inkmons` | InkMon 主表 (含六维数值) |
| `evolution_chains` | 进化链关系 |
| `evolution_methods` | 进化条件 |
| `habitats` | 栖息地 |
| `inkmon_habitats` | InkMon-栖息地关联 |
| `ecology_relations` | 天敌/猎物关系 |
| `moves` | 技能表 |
| `move_effects` | 技能效果 |
| `inkmon_moves` | InkMon 可学习技能 |
| `battle_records` | 战斗记录 |

### inkmons 表关键字段

```sql
-- 基本信息
name, name_en, dex_number, description

-- 属性
primary_element, secondary_element

-- 六维数值
hp, attack, defense, sp_attack, sp_defense, speed
bst (Base Stat Total, 计算字段)

-- 设计相关
base_animal, design_features, color_palette, rarity

-- 图片资源
image_front, image_back, image_45
```

---

## 🔧 MCP Server 工具清单 - 第二阶段

> **注意**: MCP Server 将在第二阶段实现，用于数据库操作和战斗模拟

### InkMon 管理
- `create_inkmon` - 创建 InkMon
- `get_inkmon` - 获取 InkMon 信息
- `update_inkmon_stats` - 更新数值
- `list_inkmons` - 列表查询
- `delete_inkmon` - 删除 InkMon

### 进化链
- `create_evolution_chain` - 创建进化关系
- `get_evolution_chain` - 获取完整进化链

### 技能系统
- `create_move` - 创建技能
- `assign_move_to_inkmon` - 分配技能
- `get_inkmon_moves` - 获取技能列表

### 生态系统
- `create_habitat` - 创建栖息地
- `assign_inkmon_habitat` - 设置栖息地
- `create_ecology_relation` - 创建生态关系

### 统计查询
- `get_element_statistics` - 属性统计
- `get_stat_distribution` - 数值分布
- `compare_inkmons` - 比较 InkMon
- `find_similar_inkmons` - 查找相似

### 战斗模拟
- `simulate_battle` - 模拟战斗 (调用外部程序)
- `get_battle_history` - 战斗历史
- `analyze_inkmon_performance` - 表现分析

### 数值平衡
- `suggest_stat_adjustment` - 调整建议
- `run_balance_test` - 平衡测试

---

## 🎯 Command vs Skill vs Agent 选择指南

### 核心区别

| 特性 | Command | Skill | Agent |
|-----|---------|-------|-------|
| **调用方式** | 用户显式 `/command` | Claude 自动发现 | Claude 自动委派或用户请求 |
| **复杂度** | 简单提示 | 复杂多步骤流程 | 专业领域任务 |
| **文件结构** | 单个 .md 文件 | 目录 + SKILL.md + 支持文件 | 单个 .md 文件 |
| **上下文** | 主对话上下文 | 主对话上下文 | 独立上下文窗口 |
| **适用场景** | 频繁执行的固定操作 | 需要知识库支持的工作流 | 需要深度专业知识的任务 |
| **多轮讨论** | ❌ 一次性执行 | ✅ 在主对话中持续提供知识 | ⚠️ 独立上下文，讨论后需汇报 |

### 🐾 InkMon 完整创建流程设计（第一阶段重点）

**完整流程**：

```
┌─────────────────────────────────────────────────────────────┐
│                    创建工作流                                │
│  /inkmon create                                              │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────────────────────┐                    │
│  │  Skill: designing-inkmon (自动激活)  │                    │
│  │  提供知识支持：命名、六维、进化      │                    │
│  └─────────────────────────────────────┘                    │
│       │                                                      │
│       ▼                                                      │
│  [主对话中多轮讨论]                                          │
│    - 讨论概念和灵感来源                                      │
│    - 确定属性和六维数值                                      │
│    - 设计进化路线                                            │
│    - 生成图片提示词 → 图片生成工作流                        │
│       │                                                      │
│       ▼                                                      │
│  用户确认设计 → 将结果写入 xxx.json (固定结构)              │
│       │                                                      │
│       ▼                                                      │
│  创建工作流结束 ✓                                            │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    入库工作流                                │
│  /inkmon add xxx.json                                        │
│       │                                                      │
│       ▼                                                      │
│  解析 JSON 文档 → 调用 MCP 工具入库                         │
│       │                                                      │
│       ▼                                                      │
│  入库完成 ✓                                                  │
└─────────────────────────────────────────────────────────────┘
```

### 技术选型分析

| 组件 | 类型 | 选择理由 |
|-----|------|---------|
| `/inkmon create` | **Command** | 用户显式进入创建工作流 |
| `designing-inkmon` | **Skill** | 在多轮讨论中自动提供知识支持 |
| `generating-image-prompts` | **Skill** | 设计外观时自动激活 |
| `/inkmon add <file>` | **Command** | 用户显式触发入库操作 |

**为什么创建工作流用 Command + Skill 而不是 Agent？**

| 考虑因素 | Command + Skill | Agent |
|---------|----------------|-------|
| 多轮讨论 | ✅ 在主对话中持续讨论 | ❌ 独立上下文，讨论历史不共享 |
| 用户控制 | ✅ 用户主导讨论节奏 | ⚠️ Agent 自主执行 |
| 灵活调整 | ✅ 随时根据讨论修改设计 | ⚠️ 需要重新启动 Agent |
| 结果输出 | ✅ 可控制输出到文档 | ⚠️ 需要额外配置 |

### 决策流程图

```
用户请求来了
    │
    ├─ 是否需要多轮讨论 + 知识支持？
    │   └─ 是 → Skill (如 InkMon 创建)
    │
    ├─ 是否需要用户显式控制执行？
    │   └─ 是 → Command (如 CRUD 操作)
    │
    ├─ 是否需要独立上下文 + 自主决策？
    │   └─ 是 → Agent (如 平衡审查)
    │
    └─ 简单查询或对话 → 无需特殊组件
```

---

## 📋 InkMon JSON Schema 定义

InkMon 设计完成后，将以固定的 JSON 格式保存，便于程序化解析和入库。

### Schema 结构

```json
{
  "inkmon": {
    "name": "火焰猴",
    "name_en": "Flamonkey",
    "dex_number": 001,
    "description": "栖息在火山地带的猴类 InkMon，尾巴上燃烧着永不熄灭的火焰。",

    "elements": {
      "primary": "fire",
      "secondary": null
    },

    "stats": {
      "hp": 45,
      "attack": 65,
      "defense": 40,
      "sp_attack": 80,
      "sp_defense": 50,
      "speed": 90,
      "bst": 370
    },

    "design": {
      "base_animal": "猴子",
      "features": ["火焰尾巴", "红色皮毛", "敏捷身形"],
      "color_palette": ["#FF4500", "#FFD700", "#8B0000"],
      "rarity": "common"
    },

    "evolution": {
      "stage": 1,
      "evolves_from": null,
      "evolves_to": "Infernoape",
      "evolution_method": "level_32"
    },

    "ecology": {
      "habitat": "火山地带",
      "diet": "杂食",
      "predators": [],
      "prey": ["虫类 InkMon"]
    },

    "image_prompts": {
      "front": "A fiery monkey creature with bright red fur...",
      "back": "Back view of Flamonkey showing its flaming tail...",
      "45_degree": "45-degree angle view of Flamonkey..."
    }
  }
}
```

### 字段说明

| 字段组 | 字段 | 类型 | 说明 |
|-------|------|------|------|
| **基本信息** | `name` | string | 中文名称 |
| | `name_en` | string | 英文名称 |
| | `dex_number` | number | 图鉴编号 |
| | `description` | string | 描述 |
| **属性** | `elements.primary` | string | 主属性 |
| | `elements.secondary` | string\|null | 副属性 |
| **六维** | `stats.hp` | number | 生命值 |
| | `stats.attack` | number | 物理攻击 |
| | `stats.defense` | number | 物理防御 |
| | `stats.sp_attack` | number | 特殊攻击 |
| | `stats.sp_defense` | number | 特殊防御 |
| | `stats.speed` | number | 速度 |
| | `stats.bst` | number | 种族值总和 |
| **设计** | `design.base_animal` | string | 基础动物 |
| | `design.features` | string[] | 设计特征 |
| | `design.color_palette` | string[] | 配色方案 (HEX) |
| | `design.rarity` | string | 稀有度 |
| **进化** | `evolution.stage` | number | 进化阶段 (1/2/3) |
| | `evolution.evolves_from` | string\|null | 进化自 |
| | `evolution.evolves_to` | string\|null | 进化为 |
| | `evolution.evolution_method` | string | 进化条件 |
| **生态** | `ecology.habitat` | string | 栖息地 |
| | `ecology.diet` | string | 食性 |
| | `ecology.predators` | string[] | 天敌 |
| | `ecology.prey` | string[] | 猎物 |
| **图片** | `image_prompts.*` | string | 图片生成提示词 |

**使用 JSON 的优势**：
- ✅ 固定结构，确保数据完整性
- ✅ 易于程序化解析和入库
- ✅ 可进行 Schema 校验
- ✅ 与数据库字段一一对应

---

## 💻 Commands 设计（第一阶段）

### `/inkmon` Command

**文件位置**: `commands/inkmon.md`

**完整 frontmatter 和内容**:

```yaml
---
description: InkMon creature management (create workflow, add to database)
argument-hint: create | add <file.json>
allowed-tools: Read, Write, mcp__inkworld__*
model: sonnet
---

# InkMon Management

根据参数执行不同操作：

## create - 进入创建工作流

开始 InkMon 设计讨论。我会：
1. 询问设计灵感和概念
2. 引导确定属性和六维数值
3. 协助设计进化路线
4. 生成图片提示词
5. 最终将设计结果保存为 JSON 文档 (遵循固定 Schema)

**Skill 支持**: `designing-inkmon` 和 `generating-image-prompts` 会自动激活提供知识支持

## add <file.json> - 执行入库（第二阶段）

解析指定的 InkMon JSON 文档，校验 Schema 后入库。

**示例**:
```bash
/inkmon add data/inkmons/flamonkey.json
```

**校验内容**:
- JSON 格式正确性
- 必填字段完整性
- 数值合理性 (BST、进化链等)
```

### Frontmatter 字段说明

| 字段 | 说明 | 示例 |
|-----|------|------|
| `description` | 命令描述（第三人称） | InkMon creature management |
| `argument-hint` | 参数提示 | create \| add <file.json> |
| `allowed-tools` | 允许的工具（逗号分隔） | Read, Write, mcp__inkworld__* |
| `model` | 指定模型 | sonnet / opus / haiku |

---

## 🎨 Skills 设计（第一阶段）

### 1. `designing-inkmon` Skill

**目录结构**:
```
skills/designing-inkmon/
├── SKILL.md              # 主文件 (≤500 行)
├── NAMING.md             # 命名规范
├── STATS.md              # 六维数值分配
├── EVOLUTION.md          # 进化设计
├── ELEMENTS.md           # 属性克制关系
├── ECOLOGY.md            # 生态关系
└── templates/
    └── inkmon-schema.json
```

#### SKILL.md (主文件)

```yaml
---
name: designing-inkmon
description: Guides the InkMon creature design process through multi-turn discussion. Use when user is in the InkMon creation workflow, discussing creature concepts, stats, evolution, or appearance design.
allowed-tools: Read, Write
---

# Designing InkMon

帮助用户通过多轮讨论设计新的 InkMon 生物。

## 设计流程

1. **概念讨论** - 确定灵感来源和设计方向
2. **属性确定** - 参考 [STATS.md](STATS.md) 分配六维
3. **进化规划** - 参考 [EVOLUTION.md](EVOLUTION.md)
4. **外观设计** - 生成图片提示词
5. **JSON输出** - 按固定 Schema 生成 InkMon JSON 文件

## 快速参考

- 命名规范: [NAMING.md](NAMING.md)
- 六维分配: [STATS.md](STATS.md)
- 进化设计: [EVOLUTION.md](EVOLUTION.md)
- 属性克制: [ELEMENTS.md](ELEMENTS.md)
- 生态关系: [ECOLOGY.md](ECOLOGY.md)
- JSON Schema: [templates/inkmon-schema.json](templates/inkmon-schema.json)

## 设计原则

- 保持视觉识别度
- 数值符合 BST 分布规律
- 进化链保持一致性
- 生态关系合理
```

#### NAMING.md

```markdown
# InkMon 命名规范

## 命名原则

- **中文名**: 2-4个字，朗朗上口，体现特征
- **英文名**: 结合特征词的创意组合词

## 命名来源组合

| 基础动物 | + | 属性特征 | = | 名称示例 |
|---------|---|---------|---|---------|
| 猴子 Monkey | + | 火焰 Flame | = | 火焰猴 Flamonkey |
| 熊 Bear | + | 苔藓 Moss | = | 苔藓熊 Mossbear |
| 狐狸 Fox | + | 冰 Ice | = | 冰狐 Icefox |

## 命名技巧

- 可用谐音、双关
- 避免过长或难读
- 进化后名称应体现成长感

## 进化链命名示例

**火焰猴进化链**:
1. Flamonkey (火焰猴) - 幼年，可爱
2. Infernoape (炼狱猿) - 成长，力量感
3. Pyrochamp (焰王) - 完全体，威严
```

#### STATS.md

```markdown
# InkMon 六维数值分配

## 六维定义

| 属性 | 含义 | 影响 |
|-----|------|-----|
| HP | 生命值 | 可承受伤害量 |
| Attack | 物理攻击 | 物理技能伤害 |
| Defense | 物理防御 | 减少物理伤害 |
| Sp.Attack | 特殊攻击 | 特殊技能伤害 |
| Sp.Defense | 特殊防御 | 减少特殊伤害 |
| Speed | 速度 | 决定出手顺序 |

## BST (Base Stat Total) 分布

| 稀有度 | BST 范围 | 示例 |
|-------|---------|------|
| Common | 250-350 | 基础形态 |
| Uncommon | 350-450 | 一次进化 |
| Rare | 450-550 | 完全体 |
| Legendary | 550-680 | 传说级 |

## 属性倾向模板

| 类型 | 特点 | 六维分配倾向 |
|-----|------|-------------|
| 物攻手 | 高攻速 | Atk↑ Spd↑ SpA↓ |
| 特攻手 | 高特攻 | SpA↑ Spd↑ Atk↓ |
| 坦克 | 高耐久 | HP↑ Def↑ SpD↑ Spd↓ |
| 均衡型 | 无明显短板 | 各项均衡 |

## 数值分配建议

1. **避免全能型** - 每个 InkMon 应有明显的强项和弱项
2. **符合设计概念** - 笨重的生物速度低，敏捷的生物防御低
3. **进化梯度** - 每次进化 BST 增加 80-120
4. **总和控制** - 确保不超过稀有度对应的 BST 上限
```

#### EVOLUTION.md

```markdown
# InkMon 进化设计

## 进化阶段

| 阶段 | 特点 | BST 参考 |
|-----|------|---------|
| Stage 1 | 幼年形态，可爱 | 250-320 |
| Stage 2 | 成长形态，力量感 | 350-420 |
| Stage 3 | 完全体，威严 | 450-550 |

## 进化条件类型

| 类型 | 描述 | 示例 |
|-----|------|-----|
| `level_N` | 达到N级进化 | level_16, level_32 |
| `item_X` | 使用道具X | item_fire_stone |
| `trade` | 交换进化 | trade |
| `friendship` | 亲密度满进化 | friendship_high |
| `location` | 特定地点进化 | location_volcano |

## 设计原则

- 进化应体现成长和强化
- 保持设计一致性（颜色、特征延续）
- 最终形态应有"完成感"
- 不是所有 InkMon 都需要三段进化
```

#### ELEMENTS.md

```markdown
# InkMon 属性系统

## 属性列表

| 属性 | 英文 | 代表色 |
|-----|------|-------|
| 火 | Fire | #FF4500 |
| 水 | Water | #1E90FF |
| 草 | Grass | #228B22 |
| 电 | Electric | #FFD700 |
| 冰 | Ice | #87CEEB |
| 岩 | Rock | #8B4513 |
| 地 | Ground | #D2691E |
| 飞 | Flying | #87CEFA |
| 虫 | Bug | #9ACD32 |
| 毒 | Poison | #9400D3 |
| 暗 | Dark | #2F4F4F |
| 光 | Light | #FFFACD |
| 钢 | Steel | #708090 |
| 龙 | Dragon | #4B0082 |

## 属性克制表

### 效果倍率

| 倍率 | 描述 |
|-----|------|
| 2x | 效果绝佳 (克制) |
| 1x | 效果普通 |
| 0.5x | 效果不佳 (被抵抗) |
| 0x | 完全无效 (免疫) |

### 克制关系 (攻击方 → 防守方)

| 攻击属性 | 克制 (2x) | 被抵抗 (0.5x) | 免疫 (0x) |
|---------|----------|--------------|----------|
| 火 | 草、虫、冰、钢 | 火、水、岩、龙 | - |
| 水 | 火、岩、地 | 水、草、龙 | - |
| 草 | 水、岩、地 | 火、草、毒、飞、虫、龙、钢 | - |
| 电 | 水、飞 | 电、草、龙 | 地 |
| 冰 | 草、地、飞、龙 | 火、水、冰、钢 | - |
| 岩 | 火、冰、飞、虫 | 钢、地 | - |
| 地 | 火、电、毒、岩、钢 | 草、虫 | 飞 |
| 飞 | 草、虫 | 电、岩、钢 | - |
| 虫 | 草、暗、光 | 火、飞、毒、岩、钢 | - |
| 毒 | 草 | 毒、地、岩 | 钢 |
| 暗 | 光 | 暗、钢 | - |
| 光 | 暗 | 光、钢 | - |
| 钢 | 冰、岩 | 火、水、电、钢 | - |
| 龙 | 龙 | 钢 | - |

## 双属性计算

当 InkMon 有两个属性时，伤害倍率相乘：
- 火 vs 草/虫 = 2x × 2x = 4x
- 电 vs 水/飞 = 2x × 2x = 4x
- 电 vs 地/岩 = 0x (免疫优先)
```

#### ECOLOGY.md

```markdown
# InkMon 生态关系

## 栖息地类型

| 栖息地 | 常见属性 | 特点 |
|-------|---------|-----|
| 森林 | 草、虫 | 郁郁葱葱 |
| 火山 | 火、岩 | 高温环境 |
| 海洋 | 水 | 水生生物 |
| 山脉 | 岩、飞 | 高海拔 |
| 洞穴 | 暗、岩 | 阴暗潮湿 |
| 沙漠 | 地、火 | 干燥炎热 |
| 冰原 | 冰 | 极寒地带 |

## 生态关系

| 关系 | 描述 |
|-----|------|
| predator | 捕食者 - 会捕食某些 InkMon |
| prey | 猎物 - 被某些 InkMon 捕食 |
| symbiosis | 共生 - 互利共存 |
| competition | 竞争 - 争夺资源 |

## 食性

| 类型 | 描述 |
|-----|------|
| herbivore | 草食性 |
| carnivore | 肉食性 |
| omnivore | 杂食性 |
```

### 2. `generating-image-prompts` Skill

**目录结构**:
```
skills/generating-image-prompts/
├── SKILL.md
└── REFERENCE.md
```

#### SKILL.md

```yaml
---
name: generating-image-prompts
description: Generates two-phase image prompts for InkMon design. Use when designing creature appearances, creating visual concepts, or generating art descriptions for InkMon.
allowed-tools: Read
---

# Generating Image Prompts

为 InkMon 生成高质量的图片提示词。

## 生成流程

1. **第一阶段**: 基于设计概念生成初始提示词
2. **第二阶段**: 根据生成的图片优化提示词

## 提示词结构

- 生物外观描述
- 姿态和动作
- 环境和背景
- 艺术风格
- 技术参数

详细参考: [REFERENCE.md](REFERENCE.md)
```

### Description 规范

所有 Skills/Commands/Agents 的 `description` 必须：
- ✅ 使用第三人称
- ✅ 说明"做什么"和"何时使用"
- ✅ 包含触发关键词

**示例**:
```yaml
# ✅ 正确
description: Guides the InkMon creature design process through multi-turn discussion. Use when user is in the InkMon creation workflow, discussing creature concepts, stats, evolution, or appearance design.

# ❌ 错误
description: InkMon design helper
```

---

## 📂 第二阶段功能预留

第一阶段完成 InkMon 创建和入库工作流后，第二阶段将实现以下功能：

### 推荐组件类型

| 任务 | 推荐类型 | 选择理由 |
|-----|----------|---------|
| InkMon 增删改查 | Command `/inkmon` (已有) | 用户显式操作已有数据 |
| 战斗模拟 | Command `/battle` | 用户指定对战双方 |
| 数据统计 | Command `/stats` | 用户主动查询 |
| 数值平衡检查 | Agent `balance-reviewer` | 需要全局审视 |
| 战斗策略参考 | Skill `planning-battle-strategy` | 讨论时自动提供 |

### Agents 设计（第二阶段）

#### `balance-reviewer` Agent

**文件位置**: `agents/balance-reviewer.md`

```yaml
---
name: balance-reviewer
description: Expert in analyzing InkMon stat balance and power levels. Use PROACTIVELY when reviewing game balance, identifying overpowered designs, or suggesting stat adjustments.
tools: Read, Write, mcp__inkworld__*
model: sonnet
skills: designing-inkmon
---

You are an expert InkMon balance reviewer.

When invoked:
1. Analyze InkMon stat distribution across the database
2. Identify power level outliers
3. Review type matchup coverage
4. Suggest stat adjustments for balance
5. Generate balance reports

## Balance Principles
- No InkMon should dominate in all scenarios
- Type coverage should be balanced
- Evolution power creep should follow guidelines
- Legendary InkMon justify their higher BST
```

#### `battle-analyst` Agent

**文件位置**: `agents/battle-analyst.md`

```yaml
---
name: battle-analyst
description: Analyzes battle simulation results and provides strategic insights. Use when reviewing battle records, analyzing team compositions, or identifying meta trends.
tools: Read, mcp__inkworld__*
model: sonnet
---

You are an InkMon battle analyst.

When invoked:
1. Analyze battle simulation results
2. Identify winning strategies and patterns
3. Review team composition effectiveness
4. Provide meta trend reports
```

---

## ⚔️ 战斗接口架构（第二阶段）

### 背景需求
- UE 游戏需要高性能战斗计算 (C++ 优先)
- Claude Code MCP Server 需要调用同样的战斗逻辑
- 避免维护两套代码

### 可选方案

| 方案 | UE 调用 | MCP Server 调用 | 优缺点 |
|------|---------|-----------------|--------|
| **共享库 (DLL)** | 直接链接 | N-API/node-ffi | 性能最优，但跨平台复杂 |
| **独立进程 + CLI** | 子进程调用 | child_process | 简单，略有性能开销 |
| **WebAssembly** | WASM runtime | Node.js WASM | 跨平台好，性能次优 |
| **HTTP 微服务** | HTTP 客户端 | HTTP 客户端 | 最灵活，需要额外进程 |

### 推荐方案: 独立进程 + JSON 接口

1. **C++ 战斗核心**: 编译为独立可执行文件 `battle-engine.exe`
2. **接口格式**: 命令行参数 + JSON stdin/stdout
3. **调用方式**:
   ```bash
   battle-engine.exe --input battle.json --output result.json
   # 或
   echo '{"team1":...}' | battle-engine.exe
   ```
4. **MCP Server**: 使用 `child_process.spawn()` 调用
5. **UE**: 使用 `FPlatformProcess::CreateProc()` 调用

**优点**: 代码复用、跨平台、调试方便
**缺点**: 每次战斗有进程启动开销 (可通过常驻进程优化)

---

## ✅ 实现检查清单

### 第一阶段：InkMon 创建 + 入库工作流（当前重点）

#### 基础设施
- [ ] 创建 Plugin 目录结构 `plugins/InkMon/`
- [ ] 编写 `.claude-plugin/plugin.json`
- [ ] 创建 `commands/`, `skills/`, `data/` 目录

#### Commands 实现
- [ ] 创建 `commands/inkmon.md`
  - [ ] 实现 `/inkmon create` - 进入创建工作流
  - [ ] 实现 `/inkmon add <file.json>` - 执行入库（预留接口）
  - [ ] 添加 frontmatter (description, argument-hint, allowed-tools, model)

#### Skills 实现
- [ ] 创建 `skills/designing-inkmon/` 目录
  - [ ] 编写 SKILL.md (主文件，≤500行)
  - [ ] 编写 NAMING.md (命名规范)
  - [ ] 编写 STATS.md (六维数值分配)
  - [ ] 编写 EVOLUTION.md (进化设计)
  - [ ] 编写 ELEMENTS.md (属性克制关系)
  - [ ] 编写 ECOLOGY.md (生态关系)
  - [ ] 创建 templates/inkmon-schema.json
- [ ] 创建 `skills/generating-image-prompts/` 目录
  - [ ] 编写 SKILL.md
  - [ ] 编写 REFERENCE.md

#### 数据目录
- [ ] 创建 `data/inkmons/` 目录用于存放 JSON 文件

#### 测试
- [ ] 测试 `/inkmon create` 工作流
- [ ] 验证 JSON Schema 生成正确性
- [ ] 测试 Skill 自动激活

### 第二阶段：数据库 + 战斗系统（后续）

#### MCP Server
- [ ] 初始化 MCP Server 项目 (npm init, TypeScript)
- [ ] 实现数据库 Schema
- [ ] 实现 MCP Server 框架
- [ ] 开发 InkMon 管理工具
- [ ] 开发进化链工具
- [ ] 开发生态系统工具
- [ ] 开发统计查询工具
- [ ] 配置 `.mcp.json`

#### Commands
- [ ] 扩展 `/inkmon add` 实现（连接 MCP Server）
- [ ] 创建 `/battle` Command
- [ ] 创建 `/stats` Command

#### Agents
- [ ] 创建 `agents/balance-reviewer.md`
- [ ] 创建 `agents/battle-analyst.md`

#### 战斗系统
- [ ] 设计战斗程序调用接口
- [ ] 实现 simulate_battle 工具
- [ ] 实现战斗记录存储
- [ ] 实现平衡分析工具

#### 集成测试
- [ ] 测试 MCP 工具调用
- [ ] 端到端功能测试
- [ ] 性能测试

### 第三阶段：Web 应用（可选）
- [ ] Vite + React 项目初始化
- [ ] InkMon 图鉴列表页
- [ ] InkMon 详情页
- [ ] 数据可视化
- [ ] 战斗模拟器 UI

---

## 📌 已确认事项

- [x] Plugin 位置: `plugins/InkMon/`
- [x] 第一阶段重点: InkMon 创建工作流（Command + Skill）
- [x] JSON 文件作为第一阶段数据存储
- [x] 第二阶段实现 MCP Server 和数据库
- [x] 战斗接口: 独立进程 + JSON (第二阶段设计)
