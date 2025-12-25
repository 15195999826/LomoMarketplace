# InkMon Plugin

InkMon 生物设计助手插件，支持创建、进化、退化设计和数据管理。

## 功能

- `/inkmon-init` - 初始化项目环境（首次使用必须执行）
- `/inkmon-create` - 进入 InkMon 创建工作流
- `/inkmon-evo <name>` - 设计进化形态
- `/inkmon-devo <name>` - 设计退化形态
- `/inkmon-sync` - 快速同步（将新 JSON 文件入库）
- `/inkmon-sync-strict` - 严格同步（检查内容一致性并更新）

## 快速开始

### 1. 安装插件

```bash
/plugin marketplace add <marketplace-url>
/plugin install InkMon@lomoMarketplace
```

### 2. 安装 MCP Server

InkMon 需要配套的 MCP Server 来管理数据库。

```bash
# 克隆或下载 LomoMarketplace 仓库后
cd servers/inkmon-server
npm install
npm run build
```

### 3. 初始化项目

在你的 InkMon 项目目录中：

```bash
/inkmon-init
```

这会创建 `data/inkmons/` 目录，并提示你配置 MCP Server。

### 4. 配置 MCP Server

在项目根目录创建 `.mcp.json`：

**Windows**:
```json
{
  "mcpServers": {
    "inkmon-mcp": {
      "command": "cmd",
      "args": ["/c", "node", "E:/path/to/LomoMarketplace/servers/inkmon-server/build/index.js"]
    }
  }
}
```

### 5. 重启 Claude Code

配置后需要重启 Claude Code 以加载 MCP 配置。

### 6. 开始创建

```bash
/inkmon-create
```

## 数据存放规则

所有数据都存放在你的项目目录中：

```
你的项目/
├── .mcp.json           # MCP 配置
└── data/
    ├── inkmons/        # InkMon JSON 文件
    │   ├── MossBear.json
    │   └── ...
    └── inkmon.db       # SQLite 数据库（自动创建）
```

**优势**：每个项目有独立的 InkMon 数据库，便于管理不同的游戏项目。

## MCP Server

MCP Server 位于 `LomoMarketplace/lomo-mcp-servers/inkmon-server/`，提供以下工具：

| 工具 | 功能 |
|------|------|
| `add_inkmon` | 添加 InkMon 到数据库 |
| `get_inkmon` | 按英文名查询 InkMon |
| `get_next_dex_number` | 获取下一个可用图鉴编号 |
| `list_inkmons_name_en` | 列出所有已入库的英文名 |
| `update_inkmon` | 更新已存在的 InkMon |

## 相关文档

- [MCP Server 安装说明](../../servers/inkmon-server/README.md)
- [开发规划](InkMon_Dev_Plan/Game_Workflow_Development_Plan.md)
- [进度追踪](InkMon_Dev_Plan/Progress_Tracking.md)
