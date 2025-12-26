# InkMon MCP Server

InkMon 数据管理 MCP Server，提供 InkMon 的增删改查功能。

## 安装

```bash
cd servers/inkmon-server
npm install
npm run build
```

## 配置

在你的项目根目录创建 `.mcp.json`：

### Windows

```json
{
  "mcpServers": {
    "inkmon-mcp": {
      "command": "cmd",
      "args": ["/c", "node", "E:/talk/LomoMarketplace/servers/inkmon-server/build/index.js"]
    }
  }
}
```

### macOS / Linux

```json
{
  "mcpServers": {
    "inkmon-mcp": {
      "command": "node",
      "args": ["/path/to/LomoMarketplace/servers/inkmon-server/build/index.js"]
    }
  }
}
```

## 数据存储

Server 会在**当前工作目录**（你的项目目录）的 `data/` 目录下创建数据库：

```
你的项目/
├── .mcp.json           # MCP 配置
└── data/
    ├── inkmons/        # InkMon JSON 文件
    └── inkmon.db       # SQLite 数据库（自动创建）
```

## 提供的工具

| 工具 | 功能 |
|------|------|
| `add_inkmon` | 添加 InkMon 到数据库 |
| `get_inkmon` | 按英文名查询 InkMon |
| `get_next_dex_number` | 获取下一个可用图鉴编号 |
| `ping` | 测试连接 |

## 使用方法

1. 安装并构建 Server
2. 在项目中创建 `.mcp.json` 配置
3. 重启 Claude Code 加载 MCP 配置
4. 使用 InkMon 插件的命令（如 `/inkmon-create`）

或者使用 `/inkmon-init` 命令自动完成配置。
