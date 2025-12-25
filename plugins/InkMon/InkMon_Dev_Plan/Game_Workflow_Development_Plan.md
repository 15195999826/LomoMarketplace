# InkWorld Plugin 开发规划

## 概述

**项目信息**：
- 🌍 **世界名称**: InkWorld
- 🐾 **生物名称**: InkMon
- 📁 **Plugin 位置**: `plugins/InkMon/`

**开发阶段**：
- ✅ **第一阶段**: 已完成，详见 [Progress_Tracking.md](Progress_Tracking.md)
- ✅ **第二阶段**: 已完成，数据库 + MCP Server
- ✅ **第三阶段**: 已完成，Next.js Web 图鉴应用
- 📌 **第四阶段（当前）**: 战斗系统

---

## 第二阶段：数据库 + MCP Server ✅ 已完成

### 实际目录结构

```
LomoMarketplace/
├── lomo-mcp-servers/           # MCP Servers (git submodule)
│   └── inkmon-mcp/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
├── data/
│   ├── inkmon.db               # SQLite 数据库
│   └── inkmons/                # JSON 文件备份
└── .mcp.json
```

### 数据库设计 (SQLite)

采用简化的单表设计，InkMon 数据以 JSON 形式存储：

| 表名 | 用途 |
|------|------|
| `inkmons` | InkMon 主表（完整 JSON 数据） |

### 已实现的 MCP 工具

| 分类 | 工具 | 说明 |
|------|------|------|
| 基础 | `ping` | 测试连接 |
| 管理 | `add_inkmon` | 添加 InkMon |
| 管理 | `get_inkmon` | 按英文名查询 |
| 管理 | `list_inkmons_name_en` | 列出所有英文名 |
| 管理 | `update_inkmon` | 更新 InkMon |
| 辅助 | `get_next_dex_number` | 获取下一个图鉴编号 |

### 已实现的 Commands

| Command | 说明 |
|---------|------|
| `/inkmon-sync` | 快速同步 - 将新 JSON 文件入库 |
| `/inkmon-sync-strict` | 严格同步 - 检查内容一致性 |

### 实现清单

- [x] 初始化 MCP Server 项目
- [x] 实现数据库 Schema
- [x] 开发 MCP 工具
- [x] 创建同步 Commands

---

## 第三阶段：Web 应用 ✅ 已完成

### 架构

采用 **Monorepo + pnpm workspaces** 架构：
- `packages/inkmon-core/` - 共享包（类型、数据库、查询逻辑）
- `lomo-mcp-servers/inkmon-server/` - MCP Server（依赖 @inkmon/core）
- `inkmon-pokedex/` - Next.js 15 Web 应用（依赖 @inkmon/core）

### 实现清单

- [x] pnpm Monorepo 初始化
- [x] 创建 @inkmon/core 共享包
- [x] 重构 MCP Server 使用共享包
- [x] Next.js 15 项目创建 (App Router)
- [x] API Routes (`/api/inkmon`, `/api/inkmon/[nameEn]`)
- [x] 墨水风 CSS 样式系统
- [x] 图鉴列表页（PokedexGrid）
- [x] 详情页（Stats, Design, Ecology）

### 启动命令

```bash
# 开发模式
pnpm dev:web

# 生产构建
pnpm build:all
```

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
