---
name: parallel-refactor
description: 并行子 Agent 多文件重构。适用于：跨前后端的大改动，怕 Claude 改错组件或范围失控时。
user_invocable: true
ai_invocable: false
---

# 并行子 Agent 多文件重构

## 使用场景
- 需要同时改前端 + 后端 + 类型定义的大重构
- 之前 Claude 经常改错组件，想让每个 Agent 只管自己的范围
- 想加速多文件改动（并行比串行快）

## 使用方式
```
/parallel-refactor 把 Worker 状态从字符串改成枚举
/parallel-refactor 重构认证模块，后端改 JWT，前端改登录流程
```

## 工作流程

### 第 1 步：分析范围
读取相关代码，确定需要修改的文件，按职责划分成 2-4 个独立的 Agent 范围。

典型划分：
- **Agent 1 - 后端**：src/ 下的服务端代码
- **Agent 2 - 前端**：web/src/ 下的 UI 代码
- **Agent 3 - 类型/配置**：共享类型定义、配置文件

### 第 2 步：确认方案（等我审批）
列出：
- 每个 Agent 的名称、负责范围、要改的文件列表
- 各 Agent 之间的依赖关系（谁先谁后）
- 预期的改动摘要

**等我说"开始"后再动手。**

### 第 3 步：并行执行
用 Agent 工具 spawn 子 Agent，每个 Agent：
1. 只修改自己范围内的文件，严禁越界
2. 改完后运行 `tsc --noEmit` 验证类型正确
3. 报告完成状态

### 第 4 步：协调检查
所有 Agent 完成后：
1. 检查跨边界的一致性（接口、类型、import）
2. 运行完整构建
3. 如果有冲突或不一致，修复后再次验证
4. 输出最终 diff 摘要
