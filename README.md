# Lomo Marketplace

Lomo's Claude Code Plugin Marketplace - 为 Claude Code 提供定制化插件支持，同时包含 InkMon 项目完整技术栈和通用游戏逻辑框架。

## 📖 项目概览

LomoMarketplace 是一个多功能 monorepo 项目，包含：

- **Claude Code 插件** - 为 Claude Code 提供定制化扩展能力
- **Logic Game Framework** - 逻辑表演分离的通用游戏框架
- **InkMon 生态** - 完整的 InkMon 项目技术栈
  - InkMon Core - 核心库（类型定义、数据库操作）
  - InkMon MCP Server - Model Context Protocol 服务器
  - InkMon Pokedex - Web 图鉴应用

## 📁 项目结构

```
LomoMarketplace/
├── plugins/                      # Claude Code 插件
│   ├── UE_ReactUMG/              # UE ReactUMG 开发助手
│   └── InkMon/                   # InkMon 开发助手
├── packages/
│   ├── logic-game-framework/     # @lomo/logic-game-framework 游戏逻辑框架
│   └── inkmon-core/              # @inkmon/core 核心库
├── lomo-mcp-servers/
│   └── inkmon-server/            # InkMon MCP 服务器
├── inkmon-pokedex/               # Web 图鉴应用（Next.js）
├── data/                         # 数据目录
│   ├── inkmon.db                 # SQLite 数据库
│   └── inkmons/                  # InkMon JSON 文件
├── plan_docs/                    # 设计文档
├── dev_docs/                     # Claude Code 开发文档参考
├── .mcp.json                     # MCP 服务器配置
└── CLAUDE.md                     # Claude Code 项目指引
```

## 🚀 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### 安装依赖

```bash
git clone <repo-url>
cd LomoMarketplace
pnpm install
```

### 环境变量配置

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `INKMON_DB_PATH` | InkMon 数据库文件路径 | `E:\path\to\data\inkmon.db` |

**Windows 设置（永久）：**
```cmd
setx INKMON_DB_PATH "E:\talk\LomoMarketplace\data\inkmon.db"
```

> ⚠️ 设置系统环境变量后需要**重启终端**才能生效

---

## 📦 各组件使用

### 1. Logic Game Framework

逻辑表演分离的通用游戏框架，支持回合制/ATB 等多种玩法。

```typescript
import { Actor, AttributeSet } from '@lomo/logic-game-framework'
import { BattleUnit, DamageAction } from '@lomo/logic-game-framework/stdlib'
```

**核心特性：**
- 逻辑层完全确定性，可独立于渲染运行
- 四层属性系统（Base + AddBase × MulBase + AddFinal × MulFinal）
- Action 链式回调机制
- Ability EC 组件模式

**开发命令：**
```bash
pnpm --filter @lomo/logic-game-framework build    # 构建
pnpm --filter @lomo/logic-game-framework test     # 测试
```

### 2. Claude Code 插件

安装 Claude Code 插件：

```bash
# 添加 Marketplace
/plugin marketplace add <repo-path>

# 安装插件
/plugin install UE_ReactUMG@lomoMarketplace
/plugin install InkMon@lomoMarketplace
```

**插件列表：**

| 插件 | 说明 |
|------|------|
| `UE_ReactUMG` | Unreal Engine ReactUMG 开发助手 |
| `InkMon` | InkMon 项目开发助手 |

### 3. InkMon MCP 服务器

在项目根目录的 `.mcp.json` 中配置（已预配置）：

```json
{
  "mcpServers": {
    "inkmon-mcp": {
      "command": "node",
      "args": ["lomo-mcp-servers/inkmon-server/build/index.js"]
    }
  }
}
```

**首次使用需构建：**
```bash
pnpm build:mcp
```

**可用工具：**
- `ping` - 测试连接
- `get_inkmon` - 获取 InkMon 详情
- `list_inkmons_name_en` - 列出所有 InkMon
- `sync_inkmon` - 同步 InkMon 到数据库
- `get_next_dex_number` - 获取下一个图鉴编号

### 4. Web 图鉴

```bash
# 开发服务器
pnpm dev:web

# 生产构建
pnpm build:web
```

访问 `http://localhost:3000` 查看图鉴。

---

## 🔧 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装所有依赖 |
| `pnpm build:core` | 构建 @inkmon/core 核心库 |
| `pnpm build:mcp` | 构建 MCP 服务器 |
| `pnpm build:web` | 构建 Web 应用 |
| `pnpm build:all` | 构建全部项目 |
| `pnpm dev:web` | 启动 Web 开发服务器 |
| `pnpm --filter @lomo/logic-game-framework test` | 运行框架测试 |

---

## 🔗 相关文档

- [Logic Game Framework 设计文档](./plan_docs/LogicPerformanceSeparation_AbilitySystem.md)
- [InkMon 插件 README](./plugins/InkMon/README.md)
- [UE_ReactUMG 插件 README](./plugins/UE_ReactUMG/README.md)
- [Claude Code 开发文档](./dev_docs/)

---

## 维护者

- **Name:** Lomo

## 许可证

MIT License
