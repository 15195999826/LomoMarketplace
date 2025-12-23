# Lomo Marketplace

Lomo's Claude Code Plugin Marketplace - 为 Claude Code 提供定制化插件支持。

## 插件列表

### 1. UE_ReactUMG
Unreal Engine ReactUMG 开发助手插件，提供 UE 和 ReactUMG 相关的开发辅助命令。

**功能特性：**
- UE 项目开发辅助
- ReactUMG UI 组件开发
- Blueprint 和 C++ 代码支持

### 2. InkMon
InkMon 项目开发助手插件，为 InkMon 项目提供专用的开发工具和命令。

**功能特性：**
- InkMon 项目特定功能
- 开发工作流优化

## 安装方法

### 添加 Marketplace

```bash
# 使用 Git URL（推荐）
/plugin marketplace add http://git.o.com/lmm/lomoMarketplace.git

# 或使用本地路径
/plugin marketplace add ./lomoMarketplace
```

### 安装插件

```bash
# 安装 UE_ReactUMG 插件
/plugin install UE_ReactUMG@lomoMarketplace

# 安装 InkMon 插件
/plugin install InkMon@lomoMarketplace

# 安装所有插件
/plugin install UE_ReactUMG@lomoMarketplace InkMon@lomoMarketplace
```

## 项目结构

```
lomoMarketplace/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace 配置
├── plugins/
│   ├── UE_ReactUMG/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json       # 插件配置
│   │   ├── commands/             # 命令目录
│   │   └── README.md
│   └── InkMon/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── commands/
│       └── README.md
└── README.md
```

## 开发指南

### 添加新命令

在对应插件的 `commands/` 目录下创建 `.md` 文件：

```markdown
# commands/example.md

执行某个特定任务的提示词...
```

命令将自动以 `/插件名:命令名` 的格式注册。

### 更新插件

1. 修改插件文件
2. 更新版本号（plugin.json 和 marketplace.json）
3. 提交到 Git 仓库
4. 用户使用 `/plugin update` 更新

## 维护者

- **Name:** Lomo
- **Email:** lomo@example.com

## 版本

当前版本：v1.0.0

## 许可证

请根据项目需求添加适当的许可证。
