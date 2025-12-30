/**
 * WebSocket 服务器
 * 处理浏览器扩展和 Claude Code CLI 之间的通信
 */

import { WebSocketServer, type WebSocket } from "ws";
import {
  type WSMessage,
  type BrowserCommandMessage,
  type BrowserResultMessage,
  serialize,
  deserialize,
  isTerminalInput,
  isTerminalResize,
  isBrowserResult,
  createTerminalOutput,
  createConnectionStatus,
  DEFAULT_WS_PORT,
} from "@lomo/browser-bridge";
import { ClaudeCodeManager } from "./terminal.js";

export interface BridgeServerOptions {
  port?: number;
}

/**
 * Bridge Server
 * 连接浏览器扩展和 Claude Code CLI
 */
export class BridgeServer {
  private wss: WebSocketServer | null = null;
  private browserClient: WebSocket | null = null;
  private terminalManager: ClaudeCodeManager;
  private port: number;

  // 待处理的浏览器命令
  private pendingBrowserCommands = new Map<
    string,
    {
      resolve: (result: unknown) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();

  constructor(options: BridgeServerOptions = {}) {
    this.port = options.port ?? DEFAULT_WS_PORT;
    this.terminalManager = new ClaudeCodeManager();
    this.setupTerminalEvents();
  }

  /**
   * 设置终端事件监听
   */
  private setupTerminalEvents(): void {
    // Claude Code 输出 → 发送给浏览器
    this.terminalManager.on("output", (data: string) => {
      this.sendToBrowser(createTerminalOutput(data));
    });

    // Claude Code 退出
    this.terminalManager.on("exit", (code) => {
      this.sendToBrowser(createConnectionStatus("disconnected", "terminal"));
      console.log(`[Bridge] Claude Code 退出，退出码: ${code}`);
    });

    // Claude Code 错误
    this.terminalManager.on("error", (err) => {
      console.error("[Bridge] Claude Code 错误:", err);
    });
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on("listening", () => {
          console.log(`[Bridge] WebSocket 服务器启动在端口 ${this.port}`);
          resolve();
        });

        this.wss.on("connection", (ws) => {
          this.handleConnection(ws);
        });

        this.wss.on("error", (error) => {
          console.error("[Bridge] WebSocket 服务器错误:", error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 处理新的 WebSocket 连接
   */
  private handleConnection(ws: WebSocket): void {
    console.log("[Bridge] 浏览器客户端已连接");

    // 保存浏览器客户端连接
    this.browserClient = ws;

    // 启动 Claude Code CLI
    if (!this.terminalManager.isRunning()) {
      this.terminalManager.start();
    }

    // 通知浏览器连接状态
    this.sendToBrowser(createConnectionStatus("connected", "terminal"));

    // 处理消息
    ws.on("message", (data: Buffer) => {
      try {
        const message = deserialize(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error("[Bridge] 解析消息失败:", error);
      }
    });

    // 处理断开连接
    ws.on("close", () => {
      console.log("[Bridge] 浏览器客户端断开连接");
      this.browserClient = null;
    });

    // 处理错误
    ws.on("error", (error) => {
      console.error("[Bridge] WebSocket 连接错误:", error);
    });
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(message: WSMessage): void {
    // 终端输入 → 发送给 Claude Code
    if (isTerminalInput(message)) {
      console.log("[Bridge] 收到终端输入");
      this.terminalManager.write(message.data);
      return;
    }

    // 终端尺寸变化
    if (isTerminalResize(message)) {
      console.log(`[Bridge] 终端尺寸变化: ${message.cols}x${message.rows}`);
      this.terminalManager.resize(message.cols, message.rows);
      return;
    }

    // 浏览器控制结果
    if (isBrowserResult(message)) {
      this.handleBrowserResult(message);
      return;
    }

    console.log("[Bridge] 收到未知消息类型:", message.type);
  }

  /**
   * 处理浏览器控制结果
   */
  private handleBrowserResult(result: BrowserResultMessage): void {
    const pending = this.pendingBrowserCommands.get(result.id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingBrowserCommands.delete(result.id);

      if (result.success) {
        pending.resolve(result.data);
      } else {
        pending.reject(new Error(result.error || "未知错误"));
      }
    }
  }

  /**
   * 发送消息到浏览器
   */
  sendToBrowser(message: WSMessage): void {
    if (this.browserClient?.readyState === 1) {
      // WebSocket.OPEN
      this.browserClient.send(serialize(message));
    }
  }

  /**
   * 发送浏览器控制命令并等待结果
   */
  async sendBrowserCommand(command: BrowserCommandMessage): Promise<unknown> {
    if (!this.browserClient || this.browserClient.readyState !== 1) {
      throw new Error("浏览器未连接");
    }

    return new Promise((resolve, reject) => {
      // 设置超时
      const timer = setTimeout(() => {
        this.pendingBrowserCommands.delete(command.id);
        reject(new Error("浏览器命令超时"));
      }, 30000);

      // 保存待处理的命令
      this.pendingBrowserCommands.set(command.id, { resolve, reject, timer });

      // 发送命令
      this.browserClient!.send(serialize(command));
    });
  }

  /**
   * 检查浏览器是否已连接
   */
  isBrowserConnected(): boolean {
    return this.browserClient?.readyState === 1;
  }

  /**
   * 停止服务器
   */
  stop(): void {
    console.log("[Bridge] 停止服务器...");

    // 清理待处理的命令
    for (const [id, pending] of this.pendingBrowserCommands) {
      clearTimeout(pending.timer);
      pending.reject(new Error("服务器关闭"));
    }
    this.pendingBrowserCommands.clear();

    // 停止 Claude Code
    this.terminalManager.stop();

    // 关闭 WebSocket 服务器
    this.wss?.close();
    this.wss = null;

    console.log("[Bridge] 服务器已停止");
  }

  /**
   * 获取终端管理器（供 MCP Server 使用）
   */
  getTerminalManager(): ClaudeCodeManager {
    return this.terminalManager;
  }
}
