/**
 * Browser Control MCP Server
 * 提供浏览器控制工具给 Claude Code
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { BridgeServer } from "../bridge/websocket.js";
export declare class BrowserControlMCPServer {
    private server;
    private bridgeServer;
    constructor();
    /**
     * 设置 Bridge Server 引用
     */
    setBridgeServer(bridgeServer: BridgeServer): void;
    /**
     * 发送命令到浏览器并等待结果
     */
    private sendToBrowser;
    /**
     * 注册 MCP 处理器
     */
    private registerHandlers;
    private handleScreenshot;
    private handleClick;
    private handleType;
    private handleScroll;
    private handleReadPage;
    private handleKey;
    private handleNavigate;
    /**
     * 启动 MCP Server（stdio 模式）
     */
    startStdio(): Promise<void>;
    /**
     * 获取 Server 实例（供测试使用）
     */
    getServer(): Server;
}
//# sourceMappingURL=server.d.ts.map