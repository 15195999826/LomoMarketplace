/**
 * Browser Bridge - Protocol
 * WebSocket 消息协议工具函数
 */

import type {
  WSMessage,
  TerminalInputMessage,
  TerminalOutputMessage,
  TerminalResizeMessage,
  BrowserCommandMessage,
  BrowserResultMessage,
  ConnectionStatusMessage,
  ErrorMessage,
  BrowserAction
} from "./types.js";

// ============================================
// 序列化/反序列化
// ============================================

/** 序列化消息为 JSON 字符串 */
export function serialize(message: WSMessage): string {
  return JSON.stringify(message);
}

/** 反序列化 JSON 字符串为消息对象 */
export function deserialize(data: string): WSMessage {
  return JSON.parse(data) as WSMessage;
}

// ============================================
// 消息创建工厂函数
// ============================================

/** 生成唯一 ID */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** 创建终端输入消息 */
export function createTerminalInput(data: string): TerminalInputMessage {
  return {
    type: "terminal_input",
    data
  };
}

/** 创建终端输出消息 */
export function createTerminalOutput(data: string): TerminalOutputMessage {
  return {
    type: "terminal_output",
    data
  };
}

/** 创建终端尺寸变化消息 */
export function createTerminalResize(cols: number, rows: number): TerminalResizeMessage {
  return {
    type: "terminal_resize",
    cols,
    rows
  };
}

/** 创建浏览器控制命令 */
export function createBrowserCommand(action: BrowserAction): BrowserCommandMessage {
  return {
    type: "browser_command",
    id: `cmd_${generateId()}`,
    action
  };
}

/** 创建浏览器控制结果（成功） */
export function createBrowserResult(id: string, data?: unknown): BrowserResultMessage {
  return {
    type: "browser_result",
    id,
    success: true,
    data
  };
}

/** 创建浏览器控制结果（失败） */
export function createBrowserError(id: string, error: string): BrowserResultMessage {
  return {
    type: "browser_result",
    id,
    success: false,
    error
  };
}

/** 创建连接状态消息 */
export function createConnectionStatus(
  status: "connected" | "disconnected" | "reconnecting",
  source: "terminal" | "browser"
): ConnectionStatusMessage {
  return {
    type: "connection_status",
    status,
    source
  };
}

/** 创建错误消息 */
export function createError(code: string, message: string): ErrorMessage {
  return {
    type: "error",
    code,
    message
  };
}

// ============================================
// 消息类型守卫
// ============================================

/** 检查是否为终端输入消息 */
export function isTerminalInput(msg: WSMessage): msg is TerminalInputMessage {
  return msg.type === "terminal_input";
}

/** 检查是否为终端输出消息 */
export function isTerminalOutput(msg: WSMessage): msg is TerminalOutputMessage {
  return msg.type === "terminal_output";
}

/** 检查是否为终端尺寸变化消息 */
export function isTerminalResize(msg: WSMessage): msg is TerminalResizeMessage {
  return msg.type === "terminal_resize";
}

/** 检查是否为浏览器命令消息 */
export function isBrowserCommand(msg: WSMessage): msg is BrowserCommandMessage {
  return msg.type === "browser_command";
}

/** 检查是否为浏览器结果消息 */
export function isBrowserResult(msg: WSMessage): msg is BrowserResultMessage {
  return msg.type === "browser_result";
}

/** 检查是否为连接状态消息 */
export function isConnectionStatus(msg: WSMessage): msg is ConnectionStatusMessage {
  return msg.type === "connection_status";
}

/** 检查是否为错误消息 */
export function isError(msg: WSMessage): msg is ErrorMessage {
  return msg.type === "error";
}

// ============================================
// 常量
// ============================================

/** 默认 WebSocket 端口 */
export const DEFAULT_WS_PORT = 9222;

/** WebSocket 重连间隔（毫秒） */
export const RECONNECT_INTERVAL = 3000;

/** 浏览器命令超时时间（毫秒） */
export const BROWSER_COMMAND_TIMEOUT = 30000;
