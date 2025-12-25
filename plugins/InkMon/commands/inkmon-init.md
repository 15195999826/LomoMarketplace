---
description: Initialize InkMon development environment in current project
allowed-tools: Read, Write, Bash, mcp__inkmon-mcp__ping
model: sonnet
---

# InkMon Init - 初始化项目环境

在当前项目中初始化 InkMon 开发环境。

## 执行步骤

1. **创建目录结构**
   ```bash
   mkdir -p data/inkmons
   ```

2. **检查 .mcp.json**
   - 如果不存在，提示用户创建
   - 提供配置模板

3. **验证 MCP 连接**
   - 使用 ping 工具测试连接
   - 如果失败，说明需要配置 MCP Server

## .mcp.json 配置模板

**所有平台通用** (Windows / macOS / Linux):
```json
{
  "mcpServers": {
    "inkmon-mcp": {
      "command": "node",
      "args": ["<inkmon-server-path>/build/index.js"]
    }
  }
}
```

> 注意：`<inkmon-server-path>` 需要替换为实际的 inkmon-server 路径，可以是相对路径或绝对路径。

## 注意事项

- 需要先安装 inkmon-server（见 https://github.com/15195999826/lomo-mcp-servers）
- 配置 `.mcp.json` 后需要**重启 Claude Code** 以加载配置
- 数据库文件 `data/inkmon.db` 会在首次使用 MCP 工具时自动创建

## 成功输出示例

```
[OK] InkMon 项目初始化完成！

已创建：
- data/inkmons/          # JSON 数据目录

待配置：
- .mcp.json              # 请按模板配置 MCP Server

下一步：
1. 创建 .mcp.json 配置文件
2. 重启 Claude Code 以加载 MCP Server
3. 使用 /inkmon-create 开始创建 InkMon
```
