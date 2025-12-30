---
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git show:*)
description: 分析最近 N 条 git 提交，总结项目变化
argument-hint: "[N] 提交数量，默认10"
---

## Context

- Current branch: !`git branch --show-current`
- Repository root: !`git rev-parse --show-toplevel`

## Your task

用户请求分析最近 git 提交的项目变化。

**参数**: $ARGUMENTS（如果为空，默认为 10）

### 步骤

1. 确定提交数量 N（用户指定或默认 10）
2. 执行 `git log -n N --pretty=format:"%h | %s | %an | %ar"` 获取提交列表
3. 执行 `git log -n N --stat --pretty=format:"━━━ %h: %s ━━━"` 获取文件变更统计
4. 用中文总结项目变化：
   - 按类型分类 (feat/fix/refactor/docs/chore 等)
   - 指出主要功能变更
   - 列出受影响的模块/目录
   - 如有重大变更或风险点，特别说明
