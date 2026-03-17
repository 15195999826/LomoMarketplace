---
name: ult
description: 创建多 Agent 协作团队
disable-model-invocation: true
---

使用 team-orchestrator MCP Server 的 `create_team` tool 创建一个多 Agent 协作团队。

## 参数

- **work_dir**: 使用当前工作目录（即你所在的项目根目录）的绝对路径
- **goal**: $ARGUMENTS

## 执行步骤

1. 立即调用 `create_team` tool，参数：
   - `goal`: 上面的 goal 内容
   - `work_dir`: 当前工作目录的绝对路径
2. 调用成功后，输出返回的 team ID 和状态
3. 告知用户可以用 `get_team_status` 查询进度，或在 WebUI http://localhost:3456 的「团队」Tab 查看

## 注意

- 不要询问确认，直接调用 tool
- 如果 goal 为空，提示用户用法：`/ult <任务目标描述>`
