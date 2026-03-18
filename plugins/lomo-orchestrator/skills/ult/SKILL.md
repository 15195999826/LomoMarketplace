---
name: ult
description: 创建多 Agent 协作团队
disable-model-invocation: true
---

使用 team-orchestrator MCP Server 的 `create_team` tool 创建一个多 Agent 协作团队。

## 参数

- **work_dir**: 使用当前工作目录（即你所在的项目根目录）的绝对路径
- **goal**: $ARGUMENTS（去掉模式标记后的内容）
- **mode**: 根据用户输入判断（见下方规则）

## 模式判断规则

检查 $ARGUMENTS 是否包含模式关键词：
- 包含 `--opus` 或 `opus模式` → mode 为 `"opus"`（全部 Agent 使用 Opus 4.6）
- 包含 `--adaptive` 或 `自适应` → mode 为 `"adaptive"`（按任务类型分配最佳模型）
- **都不包含** → 不传 mode 参数（服务端默认 adaptive）

将模式关键词从 goal 中移除，只保留任务描述。

## 执行步骤

1. 立即调用 `create_team` tool，参数：
   - `goal`: 清理后的任务描述
   - `work_dir`: 当前工作目录的绝对路径
   - `mode`: 按上述规则判断（可选）
2. 调用成功后，输出返回的 team ID、模式和状态
3. 告知用户可以用 `get_team_status` 查询进度，或在 WebUI http://localhost:3456 的「团队」Tab 查看

## 用法示例

```
/ult 实现用户认证模块              → adaptive 模式（默认）
/ult --opus 重构整个路由系统        → opus 模式
/ult 自适应 搭建前端项目脚手架      → adaptive 模式
```

## 注意

- 不要询问确认，直接调用 tool
- 如果 goal 为空，提示用户用法：`/ult <任务目标描述>` 并说明可选模式标记
