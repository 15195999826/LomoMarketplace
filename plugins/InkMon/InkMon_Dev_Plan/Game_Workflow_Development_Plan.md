# InkWorld Plugin 开发规划

## 概述

**项目信息**：
- 🌍 **世界名称**: InkWorld
- 🐾 **生物名称**: InkMon
- 📁 **Plugin 位置**: `plugins/InkMon/`

**开发阶段**：
- ✅ **第一阶段**: 已完成，详见 [Progress_Tracking.md](Progress_Tracking.md)
- 📌 **第二阶段（当前）**: 数据库 + MCP Server
- 🔮 **第三阶段**: Web 应用
- 🎮 **第四阶段**: 战斗系统

---

## 第二阶段：数据库 + MCP Server

### 目录结构（新增）

```
├── mcp-server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── server.ts
│       ├── database/
│       │   ├── schema.ts
│       │   └── connection.ts
│       ├── tools/
│       │   ├── inkmon-tools.ts
│       │   ├── evolution-tools.ts
│       │   └── stats-tools.ts
│       └── types/
│           └── index.ts
├── data/
│   └── inkworld.db
└── .mcp.json
```

### 数据库设计 (SQLite)

| 表名 | 用途 |
|------|------|
| `elements` | 属性/元素 |
| `element_matchups` | 属性克制关系 |
| `inkmons` | InkMon 主表 |
| `evolution_chains` | 进化链关系 |
| `habitats` | 栖息地 |
| `ecology_relations` | 天敌/猎物关系 |

### MCP Server 工具

| 分类 | 工具 |
|------|------|
| InkMon 管理 | `create_inkmon`, `get_inkmon`, `update_inkmon_stats`, `list_inkmons`, `delete_inkmon` |
| 进化链 | `create_evolution_chain`, `get_evolution_chain` |
| 生态系统 | `create_habitat`, `assign_inkmon_habitat`, `create_ecology_relation` |
| 统计查询 | `get_element_statistics`, `get_stat_distribution`, `compare_inkmons` |

### 实现清单

- [ ] 初始化 MCP Server 项目
- [ ] 实现数据库 Schema
- [ ] 开发 MCP 工具
- [x] `/inkmon-add` 连接 MCP
- [ ] 创建 `/stats` Command
- [ ] 集成测试

---

## 第三阶段：Web 应用

- [ ] Vite + React 项目初始化
- [ ] InkMon 图鉴列表页
- [ ] InkMon 详情页
- [ ] 数据可视化

---

## 第四阶段：战斗系统

### 目录结构（新增）

```
├── agents/
│   ├── battle-analyst.md
│   └── balance-reviewer.md
└── mcp-server/src/tools/
    └── battle-tools.ts
```

### 数据库扩展

| 表名 | 用途 |
|------|------|
| `moves` | 技能表 |
| `inkmon_moves` | InkMon 可学习技能 |
| `battle_records` | 战斗记录 |

### MCP Server 工具（新增）

| 分类 | 工具 |
|------|------|
| 技能系统 | `create_move`, `assign_move_to_inkmon`, `get_inkmon_moves` |
| 战斗模拟 | `simulate_battle`, `get_battle_history`, `analyze_inkmon_performance` |
| 数值平衡 | `suggest_stat_adjustment`, `run_balance_test` |

### Agents

| Agent | 用途 |
|-------|------|
| `balance-reviewer` | 分析数值平衡，识别过强设计，建议调整 |
| `battle-analyst` | 分析战斗记录，识别策略模式，提供 meta 报告 |

### 战斗接口

**推荐方案**: 独立进程 + JSON 接口

```bash
battle-engine.exe --input battle.json --output result.json
```

- MCP Server: `child_process.spawn()`
- UE: `FPlatformProcess::CreateProc()`

### 实现清单

- [ ] 扩展数据库 Schema（技能、战斗记录）
- [ ] 开发技能系统 MCP 工具
- [ ] 设计战斗程序接口
- [ ] 实现 simulate_battle 工具
- [ ] 创建 `/battle` Command
- [ ] 创建 Agents
- [ ] 战斗模拟器 UI（Web 扩展）
- [ ] 集成测试

---

## 相关文档

- [Progress_Tracking.md](Progress_Tracking.md) - 第一阶段完成记录
- [AI_Image_Prompt_Template.md](AI_Image_Prompt_Template.md)
- [Web_Four_Views_Template.md](Web_Four_Views_Template.md)
