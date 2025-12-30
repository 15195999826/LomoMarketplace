# Directory Structure

## Tree Overview

```
LomoMarketplace/
├── packages/                         # NPM 包
│   ├── logic-game-framework/         # @lomo/logic-game-framework
│   │   ├── src/
│   │   │   ├── core/                 # 核心层（接口、基类）
│   │   │   └── stdlib/               # 标准库（可选实现）
│   │   └── tests/
│   ├── inkmon-core/                  # @inkmon/core
│   ├── inkmon-battle/                # @inkmon/battle (InkMon 战斗实现)
│   ├── hex-grid/                     # @lomo/hex-grid (六边形网格)
│   └── browser-bridge/               # @lomo/browser-bridge
├── plugins/                          # Claude Code 插件
│   ├── UE_ReactUMG/                  # ReactUMG 开发助手
│   │   ├── .claude-plugin/
│   │   ├── skills/
│   │   ├── agents/
│   │   └── commands/
│   └── InkMon/                       # InkMon 开发助手
│       ├── .claude-plugin/
│       ├── skills/
│       └── commands/
├── lomo-mcp-servers/                 # MCP 服务器
│   └── inkmon-server/                # InkMon MCP Server
├── inkmon-pokedex/                   # Next.js Web 图鉴
│   ├── app/                          # Next.js App Router
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   └── styles/
├── data/                             # 数据目录
│   ├── inkmon.db                     # SQLite 数据库
│   └── inkmons/                      # InkMon JSON 文件
├── dev_docs/                         # Claude Code 开发文档参考
├── plan_docs/                        # 设计文档
└── project-notes/                    # 会话笔记
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `packages/` | monorepo 中的 NPM 包，使用 pnpm workspace |
| `packages/logic-game-framework/` | 通用游戏逻辑框架，逻辑表演分离架构 |
| `packages/inkmon-core/` | InkMon 类型定义、Zod Schema、数据库查询 |
| `packages/inkmon-battle/` | InkMon 战斗系统，基于 logic-game-framework |
| `packages/hex-grid/` | 六边形网格坐标系统和算法 |
| `plugins/` | Claude Code 插件集合 |
| `lomo-mcp-servers/` | Model Context Protocol 服务器 |
| `inkmon-pokedex/` | Next.js Web 图鉴应用 |
| `data/` | SQLite 数据库和 InkMon JSON 源文件 |
| `dev_docs/` | Claude Code 插件开发参考文档 |
| `plan_docs/` | 架构设计文档 |

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | 根目录 workspace 配置和脚本 |
| `pnpm-workspace.yaml` | pnpm monorepo workspace 定义 |
| `.mcp.json` | MCP 服务器配置 |
| `CLAUDE.md` | Claude Code 项目指引 |
| `.claude-plugin/marketplace.json` | 插件市场元数据 |
| `tsconfig.json` | TypeScript 配置（各包独立） |

## Build Outputs

| Output | Source |
|--------|--------|
| `packages/*/dist/` | 各包的编译输出 |
| `inkmon-pokedex/.next/` | Next.js 构建产物 |
| `lomo-mcp-servers/inkmon-server/build/` | MCP 服务器编译输出 |
