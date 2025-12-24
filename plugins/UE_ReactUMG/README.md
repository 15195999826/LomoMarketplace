# UE_ReactUMG

Unreal Engine ReactUMG 开发助手插件，帮助 AI 高效、准确地开发 ReactUMG UI 组件。

## 功能特性

### 轻量 Skills（日常自动激活）

在日常开发中自动提供关键提醒，低上下文消耗：

| Skill | 用途 |
|-------|------|
| `color-types` | 颜色类型速查（SlateColor vs LinearColor） |
| `tarray-handling` | TArray 必须用 UE.NewArray() |
| `slot-layout` | CanvasPanelSlot 映射规则 |
| `component-tips` | ComboBoxString 等组件陷阱 |
| `key-rules` | key 使用规范（禁止坐标作为 key） |
| `ref-usage` | React ref vs PuerTS $ref 区分 |

### Agents（按需调用）

| Agent | 用途 | 调用方式 |
|-------|------|----------|
| `plan-reactumg` | 规划新 UI 功能 | 输入需求，输出完整开发计划 |
| `debug-reactumg` | 调试 UI 问题 | 描述问题，输出修复建议 |

**Agents 会自动加载完整知识库**，包含所有开发规则、代码示例和架构原理。

## 解决的常见问题

### 颜色不生效
- SlateColor 必须用 `{SpecifiedColor: {R,G,B,A}}`
- LinearColor 直接用 `{R,G,B,A}`
- WidgetStyle 中必须加 `ColorUseRule: 0`

### 组件不更新
- 禁止用坐标作为 key
- ref 回调应在构造函数中绑定

### 类型错误
- TArray 必须用 `UE.NewArray()`
- ComboBoxString 必须用 ref + AddOption()
- UE API out 参数用 `$ref/$unref`

### 位置/尺寸不对
- CanvasPanelSlot: Point Anchors = Position/Size, Range Anchors = Margin

## 使用示例

### 日常开发
轻量 Skills 会在你开发 ReactUMG UI 时自动激活，提供关键提醒。

### 规划新功能
```
> 使用 plan-reactumg agent 帮我设计一个带拖拽功能的装备面板
```

### 调试问题
```
> 使用 debug-reactumg agent 分析为什么我的 FocusedForegroundColor 不生效
```

## 插件结构

```
UE_ReactUMG/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── color-types/SKILL.md
│   ├── tarray-handling/SKILL.md
│   ├── slot-layout/SKILL.md
│   ├── component-tips/SKILL.md
│   ├── key-rules/SKILL.md
│   ├── ref-usage/SKILL.md
│   ├── reactumg-full-knowledge/SKILL.md    # 完整知识（供 Agent 使用）
│   └── reactumg-architecture/SKILL.md      # 架构知识（供 Agent 使用）
├── agents/
│   ├── PlanReactUMG.md
│   └── DebugReactUMG.md
└── README.md
```

## 知识来源

本插件的知识来自 DESKTK 项目的实践经验：
- `reactumg_development_guide.md` - 完整开发指南
- `reactumg_architecture.md` - 架构原理详解
- `react_umg_component_index.md` - 组件 API 索引

## 安装

```bash
/plugin marketplace add <marketplace-url>
/plugin install UE_ReactUMG@lomoMarketplace
```

## 版本

- **v2.0.0** - 完整重构，添加 Skills + Agents 架构
- **v1.0.0** - 初始版本

## 维护者

- **Name**: Lomo
