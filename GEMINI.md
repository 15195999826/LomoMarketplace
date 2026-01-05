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
│   └── logic-game-framework/ # `@lomo/logic-game-framework`: Logic-performance separated game framework
├── lomo-mcp-servers/
│   └── inkmon-server/        # inkmon-mcp-server: MCP implementation for InkMon
├── inkmon-pokedex/           # Next.js Web Application
├── apps/
│   └── hex-atb-battle/       # Framework validation app (CLI/Text UI)
├── plugins/                  # Claude Code Plugins
│   ├── UE_ReactUMG/          # Unreal Engine ReactUMG development helper
│   ├── InkMon/               # InkMon development helper
│   ├── linus-coding-standards/ # Coding philosophy plugin
│   └── typescript-style/     # TypeScript strict style plugin
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
*   **Test Framework**: `pnpm --filter logic-game-framework test`

## Component Details

### 1. InkMon Web Pokedex (`inkmon-pokedex/`)
*   **Framework**: Next.js 15+ (App Router).
*   **Data Flow**: Uses `@inkmon/core` for database access. APIs are under `app/api/`.
*   **Styling**: CSS Modules, global variables in `styles/variables.css`.

### 2. Logic Game Framework (`packages/logic-game-framework/`)
*   **Concept**: Logic-performance separation. The core logic is independent of rendering/visuals.
*   **Testing**: Comprehensive unit tests in `tests/` using `Vitest`.
*   **Structure**: `core/` for base engine, `stdlib/` for standard implementations.

### 3. Hex ATB Battle (`apps/hex-atb-battle/`)
*   **Purpose**: Framework validation project for `logic-game-framework`.
*   **Core Principle**: **"Fix framework issues in the framework"**. If an API design issue is found while working on this app, modify the `logic-game-framework` package, not just the app.
*   **Structure**:
    *   `main.ts`: Entry point (GameWorld + loop).
    *   `battle/`: GameplayInstance implementation.
    *   `actors/`, `actions/`, `skills/`: Game entities.
*   **Commands**: `pnpm dev` (watch), `pnpm start` (single run).

### 4. InkMon Core (`packages/inkmon-core/`)
*   **Purpose**: Single source of truth for schemas (Zod), types, and SQLite queries.
*   **Sync Logic**: Includes utilities to sync JSON file data (`data/inkmons/*.json`) into the SQLite database.

## Conventions & Standards

### General
*   **Response Language**: Explanations in Chinese (中文), code and technical terms in English.
*   **Database**: Use `@inkmon/core` for all DB operations to ensure schema consistency.

### Linus Coding Standards (Philosophy)
*   **Data Structures First**: Design the data structure before the code. Bad data structures lead to complex code.
*   **Simplicity**: Eliminate special cases. If you have many `if-else` for types, your data structure is likely wrong.
*   **Fail Fast**: Assertions over defensive code. If something shouldn't happen, crash/error immediately rather than hiding it with null checks.
*   **No "Just In Case"**: Don't implement features "for the future". Solve the real problem at hand.
*   **Validation**: Validate at system boundaries (Zod), trust the type system internally.

### TypeScript Style Guide (Strict)
*   **Naming**:
    *   `camelCase`: variables, functions (`userName`, `fetchUser`).
    *   `PascalCase`: classes, types, interfaces (`UserService`, `ApiResponse`).
    *   `UPPER_SNAKE_CASE`: constants (`MAX_RETRY`).
    *   Booleans: Use prefixes `is`, `has`, `can`, `should` (`isActive`, `hasPermission`).
*   **Types**:
    *   **NO `any`**. Use `unknown` with type guards/Zod if necessary.
    *   Use `type` by default. Use `interface` only for declaration merging or class contracts.
    *   **Runtime Validation**: Use `Zod` for all external data (API responses, config, file inputs).
*   **Structure**:
    *   Prefer **Named Exports**. Avoid `default` exports.
    *   Use `import type { ... }` for type-only imports.
    *   Use `async/await` instead of `.then()` chains.
*   **Error Handling**:
    *   Use `Result` types (success/failure union) for expected errors.
    *   Use `Error` classes for unexpected system exceptions.
