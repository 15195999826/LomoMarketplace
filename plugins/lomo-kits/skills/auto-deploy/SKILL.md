---
name: auto-deploy
description: 自主部署-测试-修复循环。适用于：代码改完后需要部署到远程服务器（PM2/nginx/Docker），不想盯着每轮部署结果手动排错。
user_invocable: true
ai_invocable: false
---

# 自主部署-测试-修复循环

## 使用场景
- 改完代码要部署到服务器时
- 之前部署老是失败要反复调试时
- 不想盯着每轮部署结果时

## 使用方式
```
/auto-deploy                    # 部署当前项目
/auto-deploy lomo-bot           # 指定部署目标
/auto-deploy ov-webui to myserver  # 指定项目和服务器
```

## 工作流程

按以下循环执行，最多 5 轮，期间不要问我：

### 第 1 步：构建
- 运行项目的构建命令（npm run build / tsc 等）
- 如果构建失败，诊断并修复后重新构建

### 第 2 步：部署
- 根据项目类型执行部署（PM2 restart / scp + nginx reload / Docker 等）
- 参考项目 CLAUDE.md 中的部署说明确定目标

### 第 3 步：健康检查
- curl API 端点验证响应
- 检查 PM2 logs 或 Docker logs 有无错误
- 如果有 WebUI，验证页面能正常加载

### 第 4 步：判断
- 全部通过 → 结束，输出部署报告
- 有失败 → 从日志/错误中诊断根因，修复代码，回到第 1 步
- 连续 2 轮卡在同一个错误 → 停下来问我

### 第 5 步：最终报告
输出每轮的摘要：
- 第 N 轮：做了什么 → 结果如何 → 修了什么
- 最终状态：成功 / 失败（附未解决问题）
