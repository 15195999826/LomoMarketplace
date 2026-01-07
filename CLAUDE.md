# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Language & Response Style
- Always respond in Chinese for explanations
- Technical terms and code can remain in English
- Use emoji (📝🔧⚡🎯) for better readability
- Provide actionable solutions, not just descriptions

## Repository Overview

**LomoMarketplace** is a multi-purpose monorepo containing:

1. **Claude Code Plugins** - Custom plugins extending Claude Code functionality
2. **Logic Game Framework** - Logic-performance separated game framework (`@lomo/logic-game-framework`)
3. **InkMon Ecosystem** - Complete InkMon project stack (core lib, MCP server, web pokedex)

## Repository Structure

```
LomoMarketplace/
├── apps/
│   └── hex-atb-battle/           # Framework example project (ATB battle demo)
├── plugins/                      # Claude Code Plugins
│   ├── UE_ReactUMG/              # ReactUMG development plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/               # Auto-activate skills
│   │   ├── agents/               # Specialized agents
│   │   └── commands/             # Slash commands
│   └── InkMon/                   # InkMon development plugin
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/
│       └── commands/
├── packages/
│   ├── logic-game-framework/     # @lomo/logic-game-framework
│   │   ├── src/
│   │   │   ├── core/             # Core layer (interfaces, base classes)
│   │   │   └── stdlib/           # Standard library (implementations)
│   │   └── tests/
│   └── inkmon-core/              # @inkmon/core (types, DB operations)
├── lomo-mcp-servers/
│   └── inkmon-server/            # InkMon MCP Server
├── inkmon-pokedex/               # Next.js Web Pokedex
├── data/
│   ├── inkmon.db                 # SQLite database
│   └── inkmons/                  # InkMon JSON files
├── plan_docs/                    # Design documents
├── dev_docs/                     # Claude Code documentation reference
├── .mcp.json                     # MCP server configuration
└── .claude-plugin/
    └── marketplace.json          # Marketplace metadata
```

## Key Components

### 1. Logic Game Framework (`@lomo/logic-game-framework`)

> ⚠️ **开发中** - 此框架正在积极开发中，API 可能随时变更，不考虑向后兼容。

A logic-performance separated game framework for turn-based/ATB games.

**Architecture:**
- **Core Layer** (`core/`) - Interfaces, base classes, mechanisms (don't modify, extend only)
- **StdLib Layer** (`stdlib/`) - Standard implementations (optional, replaceable)

**Key Concepts:**
| Module | Purpose |
|--------|---------|
| `Actor` | Game entity base class (OOP design) |
| `System` | Global logic processor |
| `AttributeSet` | 4-layer attribute calculation with Modifier aggregation |
| `Ability` | Skill/Buff container (EC pattern with Components) |
| `Action` | Effect execution primitives |
| `BattleEvent` | Logic layer output for presentation |

**Attribute Formula:**
```
CurrentValue = ((Base + AddBase) × MulBase + AddFinal) × MulFinal
```

**Usage:**
```typescript
import { Actor, AttributeSet } from '@lomo/logic-game-framework'
import { BattleUnit, DamageAction } from '@lomo/logic-game-framework/stdlib'
```

**Commands:**
```bash
pnpm --filter @lomo/logic-game-framework build      # 构建
pnpm --filter @lomo/logic-game-framework test:run   # 运行测试（单次）
pnpm --filter @lomo/logic-game-framework test       # 运行测试（watch 模式）
```

**Example Project:** `apps/hex-atb-battle/` - 完整的六边形 ATB 战斗示例，展示框架的实际使用方式。

### 2. InkMon Ecosystem

**@inkmon/core** - Shared library with Zod schemas, types, SQLite queries
**inkmon-server** - MCP server providing InkMon data tools
**inkmon-pokedex** - Next.js web application

**MCP Tools:**
- `get_inkmon` - Get InkMon by English name
- `list_inkmons_name_en` - List all InkMon names
- `sync_inkmon` - Sync JSON file to database
- `get_next_dex_number` - Get next available dex number

### 3. Claude Code Plugins

**Plugin Structure:**
- `.claude-plugin/plugin.json` - Manifest (name, version, description)
- `commands/` - Slash commands (Markdown files)
- `agents/` - Specialized agents
- `skills/` - Auto-activate skills
- `hooks/` - Event hooks

**Important**: Place `commands/`, `agents/`, `skills/`, `hooks/` at plugin root, NOT inside `.claude-plugin/`.

## UE_ReactUMG Plugin

**Lightweight Skills** (Auto-activate):
- `handling-colors` - SlateColor vs LinearColor
- `handling-tarrays` - Must use UE.NewArray()
- `configuring-slots` - CanvasPanelSlot mapping
- `avoiding-pitfalls` - Component gotchas
- `using-keys` - Key usage rules
- `using-refs` - React ref vs PuerTS $ref

**Specialized Agents**:
- `simple-plan-reactumg` - Quick planning
- `plan-reactumg` - Formal planning with documentation
- `debug-reactumg` - Debug UI issues

## Development Workflow

### Environment
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- `INKMON_DB_PATH` environment variable for database path

### Common Commands
```bash
pnpm install                                         # Install dependencies
pnpm build:all                                       # Build everything
pnpm build:core                                      # Build @inkmon/core
pnpm build:mcp                                       # Build MCP server
pnpm dev:web                                         # Start web dev server
pnpm --filter @lomo/logic-game-framework test:run    # Run framework tests (单次)
```

### Testing Plugins Locally
```bash
claude --plugin-dir ./plugins/UE_ReactUMG
claude --plugin-dir ./plugins/InkMon
```

## Conventions

1. **Database**: Always use `@inkmon/core` for DB operations
2. **Testing**: New logic in `logic-game-framework` should have Vitest tests
3. **Coding Style**: Functional React, strict TypeScript, Zod validation
4. **Plugin Naming**: Commands namespaced as `/plugin-name:command-name`

## Documentation References

- `plan_docs/LogicPerformanceSeparation_AbilitySystem.md` - Framework design doc
- `dev_docs/` - Claude Code plugin development docs

## Dev Helper

本项目使用 dev-helper 进行项目管理。

### 必须激活的 Skill

探索项目时必须激活：`skill:exploring-project`

### 可用命令

| 命令 | 说明 |
|------|------|
| `/update-arch` | 更新项目架构文档 |
| `/session-summary [主题]` | 总结当前对话 |
| `/whats-next` | 查看待办事项和工作建议 |
| `/track-module <模块名>` | 追踪复杂模块 |
| `/archive-notes [--dry-run]` | 归档已完成的会话笔记 |
