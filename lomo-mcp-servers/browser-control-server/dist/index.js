#!/usr/bin/env node
/**
 * Browser Control Server
 * 主入口 - 启动 Bridge Server (WebSocket + 终端桥接)
 *
 * 使用方式：
 * 1. 作为独立服务运行：node dist/index.js
 *    - 启动 WebSocket 服务器，等待浏览器连接
 *    - 浏览器连接后自动启动 Claude Code CLI
 *
 * 2. 作为 MCP Server 运行：需要单独配置
 *    - 参考 plugins/browser-control/.mcp.json
 */
import { BridgeServer } from "./bridge/websocket.js";
import { BrowserControlMCPServer } from "./mcp/server.js";
import { DEFAULT_WS_PORT } from "@lomo/browser-bridge";
// 解析命令行参数
const args = process.argv.slice(2);
const mode = args.includes("--mcp") ? "mcp" : "bridge";
const port = parseInt(args.find((arg) => arg.startsWith("--port="))?.split("=")[1] ?? String(DEFAULT_WS_PORT), 10);
async function main() {
    console.log(`[Main] 启动模式: ${mode}`);
    if (mode === "mcp") {
        // MCP Server 模式（用于 Claude Code 调用）
        const mcpServer = new BrowserControlMCPServer();
        await mcpServer.startStdio();
    }
    else {
        // Bridge Server 模式（独立运行）
        const bridgeServer = new BridgeServer({ port });
        // 设置 MCP Server（可选，用于测试）
        const mcpServer = new BrowserControlMCPServer();
        mcpServer.setBridgeServer(bridgeServer);
        // 启动服务
        await bridgeServer.start();
        console.log(`
╔════════════════════════════════════════════════════════════╗
║  Browser Control Server 已启动                              ║
║                                                            ║
║  WebSocket 端口: ${port.toString().padEnd(40)}║
║                                                            ║
║  请打开 Chrome 扩展连接...                                  ║
╚════════════════════════════════════════════════════════════╝
`);
        // 优雅关闭
        process.on("SIGINT", () => {
            console.log("\n[Main] 收到 SIGINT，正在关闭...");
            bridgeServer.stop();
            process.exit(0);
        });
        process.on("SIGTERM", () => {
            console.log("\n[Main] 收到 SIGTERM，正在关闭...");
            bridgeServer.stop();
            process.exit(0);
        });
    }
}
main().catch((error) => {
    console.error("[Main] 启动失败:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map