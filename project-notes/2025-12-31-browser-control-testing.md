# Browser Control 测试与 Bug 修复

Date: 2025-12-31

## Completed Work

- [x] 修复 WebSocket 反复连接断开问题（App.tsx 回调函数稳定化，使用 useMemo）
- [x] 修复终端每字符发送无回显问题（改用 node-pty 替代 spawn+pipe）
- [x] 测试 PTY 终端交互 - 通过（输入回显正常，Claude Code 响应正常）
- [x] 测试终端尺寸调整 - 通过（resize 事件正常触发）
- [x] 测试连接稳定性 - 通过（长时间运行无断连）
- [x] 修复 Ctrl+C 退出卡住问题（Windows 上使用 taskkill 强制终止进程树 + 1秒超时强制退出）
- [x] 更新计划文档记录已知问题和测试结果

## Todo Items

- [ ] 修复 MCP 架构问题：MCP Server 无法连接 Bridge Server
  - 当前 MCP 模式启动时没有 Bridge Server 实例
  - 需要 Bridge Server 暴露 HTTP API，MCP Server 通过 HTTP 连接
- [ ] 实现 browser_* MCP 工具与当前浏览器的连接
- [ ] UI 优化（连接状态指示器、设置面板等）

## Key Decisions

- 使用 `node-pty` 提供真正的伪终端支持，而非 spawn+pipe
- Windows 上使用 `taskkill /PID /T /F` 强制终止进程树
- 添加 1 秒超时确保 SIGINT 后进程完全退出
- MCP Server 与 Bridge Server 的连接需要通过 HTTP API 实现（待开发）

## Notes

### Phase 1 完成功能

```
浏览器 Side Panel ←→ WebSocket ←→ Bridge Server ←→ PTY ←→ Claude Code CLI
     (xterm.js)                    (node-pty)
```

- 在浏览器 Side Panel 中运行 Claude Code CLI ✅
- 完整终端体验（输入回显、彩色输出、尺寸自适应）✅
- 稳定的 WebSocket 连接 ✅

### 已知架构问题

`browser-control` MCP Server 需要连接到 Bridge Server 才能发送命令给浏览器扩展，但 MCP Server 是由 Claude Code 通过 stdio 启动的独立进程，无法连接到 Bridge Server。

影响：Side Panel 中的 Claude Code 无法使用 `browser_*` 工具控制当前浏览器，会 fallback 到 `chrome-devtools` MCP（启动独立 Chrome 实例）。

### 相关文件

- `apps/browser-ext/` - Chrome 扩展
- `lomo-mcp-servers/browser-control-server/` - Bridge Server + MCP Server
- `packages/browser-bridge/` - 共享协议定义
- `plan_docs/BrowserControl_ClaudeCodeInBrowser.md` - 设计文档
