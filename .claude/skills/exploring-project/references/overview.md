# Project Overview

## Project Name

**LomoMarketplace** - Claude Code Plugin Marketplace & InkMon Ecosystem

## Description

LomoMarketplace 是一个多功能 monorepo 项目，包含：
- Claude Code 插件系统 - 为 Claude Code 提供定制化扩展能力
- Logic Game Framework - 逻辑表演分离的通用游戏框架
- InkMon 生态系统 - 完整的 InkMon 项目技术栈（核心库、MCP 服务器、Web 图鉴）

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript |
| Runtime | Node.js >= 20.0.0 |
| Framework | Next.js (Web), Custom Game Framework |
| Build Tool | TypeScript Compiler (tsc) |
| Package Manager | pnpm >= 9.0.0 (monorepo) |
| Database | SQLite (better-sqlite3) |
| Validation | Zod |
| Testing | Vitest |

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `better-sqlite3` | SQLite 数据库操作 |
| `zod` | 运行时类型验证 |
| `next` | Web 应用框架 (inkmon-pokedex) |
| `vitest` | 单元测试框架 |
| `@modelcontextprotocol/sdk` | MCP 服务器开发 |

## Entry Points

| File | Description |
|------|-------------|
| `packages/logic-game-framework/src/index.ts` | 游戏逻辑框架入口 |
| `packages/inkmon-core/src/index.ts` | InkMon 核心库入口 |
| `lomo-mcp-servers/inkmon-server/src/index.ts` | MCP 服务器入口 |
| `inkmon-pokedex/app/page.tsx` | Web 图鉴首页 |

## Package Exports

### @lomo/logic-game-framework
```typescript
// Core exports (不可修改，只能扩展)
import { Actor, AttributeSet, Ability } from '@lomo/logic-game-framework'
// StdLib exports (可选实现)
import { BattleUnit, DamageAction } from '@lomo/logic-game-framework/stdlib'
```

### @inkmon/core
```typescript
import { InkMonSchema, getAllInkMons, getInkMonByName } from '@inkmon/core'
```

### @lomo/hex-grid
```typescript
import { HexCoord, HexGridModel, HexUtils } from '@lomo/hex-grid'
```
