---
name: codex
description: 用 Codex (GPT-5.3) 在后台执行任务
---

用户希望将一个任务委派给 Codex (GPT-5.3-Codex) 在后台异步执行。
Codex 擅长终端操作、快速代码生成、CLI 工具链。

## 你的工作流（必须严格按顺序执行）

### Step 1: 理解需求 + 润色 Prompt
- 理解用户的任务意图
- 结合当前项目上下文（读相关文件）
- 写一个完整、具体、自包含的 prompt
- 后台 Agent 没有你的上下文，prompt 必须包含：
  - 具体文件路径和当前代码结构
  - 明确的产出要求（改哪些文件、创建什么）
  - 技术约束和注意事项

### Step 2: 创建异步任务
调用 MCP 工具 `create_async_task`：
- runtime: "claude-codex"
- prompt: 你在 Step 1 润色后的完整 prompt
- cwd: 当前工作目录

### Step 3: 启动后台监听 + 告知用户（必须执行）
拿到 taskId 后：
1. 立即用 Bash(run_in_background) 执行：
   curl -s localhost:3456/api/async-tasks/{taskId}/wait
2. 简短告诉用户：任务 ID、runtime、产出目录。然后结束，不要等待。

### Step 4: 后台任务完成后（你会自动收到通知）
上面的后台 Bash 会在任务完成时返回一段格式化文本，包含：
- 任务状态（成功/失败）
- 产出目录路径
- summary.md 内容摘要

收到这个通知后，你应该：
1. 阅读产出目录中的 summary.md，了解后台 Agent 做了什么
2. 如果用户在场，向用户汇报结果
3. 如果任务失败，分析原因并告知用户
