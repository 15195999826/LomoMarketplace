/**
 * WebSocket 服务器
 * 处理浏览器扩展和 Claude Code CLI 之间的通信
 */
import { type WSMessage, type BrowserCommandMessage } from "@lomo/browser-bridge";
import { ClaudeCodeManager } from "./terminal.js";
export interface BridgeServerOptions {
    port?: number;
}
/**
 * Bridge Server
 * 连接浏览器扩展和 Claude Code CLI
 */
export declare class BridgeServer {
    private wss;
    private browserClient;
    private terminalManager;
    private port;
    private pendingBrowserCommands;
    constructor(options?: BridgeServerOptions);
    /**
     * 设置终端事件监听
     */
    private setupTerminalEvents;
    /**
     * 启动服务器
     */
    start(): Promise<void>;
    /**
     * 处理新的 WebSocket 连接
     */
    private handleConnection;
    /**
     * 处理收到的消息
     */
    private handleMessage;
    /**
     * 处理浏览器控制结果
     */
    private handleBrowserResult;
    /**
     * 发送消息到浏览器
     */
    sendToBrowser(message: WSMessage): void;
    /**
     * 发送浏览器控制命令并等待结果
     */
    sendBrowserCommand(command: BrowserCommandMessage): Promise<unknown>;
    /**
     * 检查浏览器是否已连接
     */
    isBrowserConnected(): boolean;
    /**
     * 停止服务器
     */
    stop(): void;
    /**
     * 获取终端管理器（供 MCP Server 使用）
     */
    getTerminalManager(): ClaudeCodeManager;
}
//# sourceMappingURL=websocket.d.ts.map