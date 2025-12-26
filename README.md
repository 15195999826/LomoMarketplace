# Lomo Marketplace

Lomo's Claude Code Plugin Marketplace - 为 Claude Code 提供定制化插件支持，同时包含 InkMon 项目的完整技术栈。

## 📖 项目概览

LomoMarketplace 是一个多功能 monorepo 项目，包含：

- **Claude Code 插件** - 为 Claude Code 提供定制化扩展能力
- **InkMon MCP 服务器** - 提供 InkMon 数据管理的 MCP 工具
- **InkMon Web 图鉴** - 在线浏览和管理 InkMon（开发中）

## 📁 项目结构

```
LomoMarketplace/
├── plugins/                  # Claude Code 插件
│   ├── UE_ReactUMG/          # UE ReactUMG 开发助手
│   └── InkMon/               # InkMon 开发助手
├── packages/
│   └── inkmon-core/          # InkMon 核心库（数据库操作、类型定义）
├── lomo-mcp-servers/
│   └── inkmon-server/        # InkMon MCP 服务器
├── inkmon-pokedex/           # Web 图鉴应用（Next.js）
├── data/                     # 数据目录
│   ├── inkmon.db             # SQLite 数据库
│   └── inkmons/              # InkMon JSON 文件
├── dev_docs/                 # Claude Code 开发文档参考
├── .mcp.json                 # MCP 服务器配置
└── CLAUDE.md                 # Claude Code 项目指引
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

**临时设置（当前终端）：**
```cmd
set INKMON_DB_PATH=E:\talk\LomoMarketplace\data\inkmon.db
```

> ⚠️ 设置系统环境变量后需要**重启终端**才能生效

---

## 📦 各组件使用

### 1. Claude Code 插件

安装 Claude Code 插件：

```bash
# 添加 Marketplace
/plugin marketplace add <repo-path>

# 安装插件
/plugin install UE_ReactUMG@lomoMarketplace
/plugin install InkMon@lomoMarketplace

# 或一次性安装所有
/plugin install UE_ReactUMG@lomoMarketplace InkMon@lomoMarketplace
```

**插件列表：**

| 插件 | 说明 |
|------|------|
| `UE_ReactUMG` | Unreal Engine ReactUMG 开发助手 |
| `InkMon` | InkMon 项目开发助手 |

### 2. MCP 服务器

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
- `add_inkmon` - 添加新 InkMon
- `update_inkmon` - 更新 InkMon
- `get_next_dex_number` - 获取下一个图鉴编号

### 3. Web 图鉴（开发中）

```bash
# 开发服务器
pnpm dev:web

# 生产构建
pnpm build:web
```

> 📝 **TODO**: Web 图鉴功能正在开发中，敬请期待

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

---

## 🔗 相关文档

- [InkMon 插件 README](./plugins/InkMon/README.md)
- [UE_ReactUMG 插件 README](./plugins/UE_ReactUMG/README.md)
- [Claude Code 开发文档](./dev_docs/)

---

## 维护者

- **Name:** Lomo
- **Email:** lomo@example.com

## 版本

当前版本：v1.0.0

## 许可证

请根据项目需求添加适当的许可证。
