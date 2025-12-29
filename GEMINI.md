# LomoMarketplace Project Context

## Overview
LomoMarketplace is a monorepo project serving as a marketplace for Claude Code plugins and hosting the "InkMon" ecosystem. It integrates custom agent plugins, a logic-separated battle framework, and a web-based Pokedex.

## Architecture & Tech Stack

*   **Monorepo Strategy**: Managed via `pnpm` workspaces.
*   **Language**: TypeScript (primary).
*   **Core Technologies**:
    *   **Frontend**: Next.js (App Router), React, CSS Modules.
    *   **Backend/Services**: Node.js, MCP SDK (Model Context Protocol).
    *   **Database**: SQLite (via `node:sqlite`), JSON persistence for local files.
    *   **Testing**: Vitest.
    *   **Validation**: Zod.

## Workspace Structure

```
E:\talk\LomoMarketplace/
├── packages/
│   ├── inkmon-core/          # @inkmon/core: Shared library (types, DB logic)
│   └── logic-game-framework/ # @lomo/logic-game-framework: Logic-performance separated game framework
├── lomo-mcp-servers/
│   └── inkmon-server/        # inkmon-mcp-server: MCP implementation for InkMon
├── inkmon-pokedex/           # Next.js Web Application
├── plugins/                  # Claude Code Plugins
│   ├── UE_ReactUMG/          # Unreal Engine ReactUMG development helper
│   └── InkMon/               # InkMon development helper
├── data/                     # Data persistence
│   ├── inkmon.db             # SQLite database
│   └── inkmons/              # JSON data files for InkMon
├── dev_docs/                 # Development documentation for Claude Code
├── .mcp.json                 # MCP Server configuration for local testing
├── pnpm-workspace.yaml       # Workspace definition
└── package.json              # Root scripts and workspace filters
```

## Development Workflow

### Prerequisites
*   Node.js >= 20.0.0
*   pnpm >= 9.0.0

### Setup & Environment
1.  **Install dependencies**: `pnpm install`
2.  **Environment Variables**:
    *   `INKMON_DB_PATH`: Absolute path to `data/inkmon.db`. Used by `inkmon-pokedex` and `inkmon-server`.
    *   Windows Example: `setx INKMON_DB_PATH "E:\talk\LomoMarketplace\data\inkmon.db"`

### Key Commands (Root)
*   **Install**: `pnpm install`
*   **Build All**: `pnpm build:all`
*   **Build Core**: `pnpm build:core`
*   **Build MCP**: `pnpm build:mcp`
*   **Build Web**: `pnpm build:web`
*   **Dev Web**: `pnpm dev:web` (Starts Next.js at `localhost:3000`)
*   **Test Framework**: `pnpm --filter @lomo/logic-game-framework test`

## Component Details

### 1. InkMon Web Pokedex (`inkmon-pokedex/`)
*   **Framework**: Next.js 15+ (App Router).
*   **Data Flow**: Uses `@inkmon/core` for database access. APIs are under `app/api/`.
*   **Styling**: CSS Modules, global variables in `styles/variables.css`.

### 2. Logic Game Framework (`packages/logic-game-framework/`)
*   **Concept**: Logic-performance separation. The core logic is independent of rendering/visuals.
*   **Testing**: Comprehensive unit tests in `tests/` using `Vitest`.
*   **Structure**: `core/` for base engine, `stdlib/` for standard implementations.

### 3. InkMon Core (`packages/inkmon-core/`)
*   **Purpose**: Single source of truth for schemas (Zod), types, and SQLite queries.
*   **Sync Logic**: Includes utilities to sync JSON file data (`data/inkmons/*.json`) into the SQLite database.

### 4. Claude Code Plugins (`plugins/`)
*   **Architecture**: Plugins include `commands/`, `skills/`, and `agents/`.
*   **Config**: Each has a `.claude-plugin/plugin.json`.
*   **Marketplace**: Root configuration in `.claude-plugin/marketplace.json`.

## Conventions & Standards
*   **Response Language**: Explanations in Chinese (中文), code and technical terms in English (per `CLAUDE.md`).
*   **Coding Style**: Functional React components, strict TypeScript types, Zod for runtime validation.
*   **Database**: Use `@inkmon/core` for all DB operations to ensure schema consistency.
*   **Testing**: New logic in `logic-game-framework` or `core` should be accompanied by Vitest tests.