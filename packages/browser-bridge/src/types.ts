/**
 * Browser Bridge - Shared Types
 * 浏览器控制桥接的共享类型定义
 */

// ============================================
// WebSocket 消息类型
// ============================================

/** WebSocket 消息类型 */
export type MessageType =
  | "terminal_input"      // 用户终端输入
  | "terminal_output"     // 终端输出
  | "terminal_resize"     // 终端尺寸变化
  | "browser_command"     // 浏览器控制命令
  | "browser_result"      // 浏览器控制结果
  | "connection_status"   // 连接状态
  | "error";              // 错误消息

// ============================================
// 终端相关消息
// ============================================

/** 终端输入消息 */
export interface TerminalInputMessage {
  type: "terminal_input";
  data: string;  // 用户输入的字符
}

/** 终端输出消息 */
export interface TerminalOutputMessage {
  type: "terminal_output";
  data: string;  // Claude Code 的输出
}

/** 终端尺寸变化消息 */
export interface TerminalResizeMessage {
  type: "terminal_resize";
  cols: number;
  rows: number;
}

// ============================================
// 浏览器控制相关消息
// ============================================

/** 浏览器控制命令 */
export interface BrowserCommandMessage {
  type: "browser_command";
  id: string;  // 请求 ID，用于匹配响应
  action: BrowserAction;
}

/** 浏览器操作类型 */
export type BrowserAction =
  | { name: "screenshot"; params: ScreenshotParams }
  | { name: "click"; params: ClickParams }
  | { name: "type"; params: TypeParams }
  | { name: "scroll"; params: ScrollParams }
  | { name: "read_page"; params: ReadPageParams }
  | { name: "key"; params: KeyParams }
  | { name: "hover"; params: HoverParams }
  | { name: "navigate"; params: NavigateParams };

/** 截图参数 */
export interface ScreenshotParams {
  tabId?: number;
  fullPage?: boolean;
}

/** 点击参数 */
export interface ClickParams {
  coordinate?: [number, number];
  ref?: string;  // 元素引用 ID，如 ref_1
  button?: "left" | "right" | "middle";
  clickCount?: 1 | 2 | 3;
  modifiers?: string;  // "ctrl+shift"
}

/** 输入文本参数 */
export interface TypeParams {
  text: string;
}

/** 滚动参数 */
export interface ScrollParams {
  direction: "up" | "down" | "left" | "right";
  amount?: number;
  coordinate?: [number, number];
}

/** 读取页面参数 */
export interface ReadPageParams {
  filter?: "all" | "interactive";
  depth?: number;
}

/** 按键参数 */
export interface KeyParams {
  key: string;  // "Enter", "Tab", "ctrl+a"
  repeat?: number;
}

/** 悬停参数 */
export interface HoverParams {
  coordinate?: [number, number];
  ref?: string;
}

/** 导航参数 */
export interface NavigateParams {
  url: string;
}

/** 浏览器控制结果 */
export interface BrowserResultMessage {
  type: "browser_result";
  id: string;  // 对应请求 ID
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================
// 连接状态消息
// ============================================

/** 连接状态消息 */
export interface ConnectionStatusMessage {
  type: "connection_status";
  status: "connected" | "disconnected" | "reconnecting";
  source: "terminal" | "browser";
}

/** 错误消息 */
export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
}

// ============================================
// 联合类型
// ============================================

/** 所有 WebSocket 消息类型 */
export type WSMessage =
  | TerminalInputMessage
  | TerminalOutputMessage
  | TerminalResizeMessage
  | BrowserCommandMessage
  | BrowserResultMessage
  | ConnectionStatusMessage
  | ErrorMessage;

// ============================================
// 截图结果
// ============================================

/** 截图结果 */
export interface ScreenshotResult {
  base64: string;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** 页面元素信息 */
export interface PageElementInfo {
  role: string;
  name: string;
  ref: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes?: Record<string, string>;
  children?: PageElementInfo[];
}

/** 读取页面结果 */
export interface ReadPageResult {
  content: string;  // 格式化的页面结构
  elements?: PageElementInfo[];  // 结构化的元素列表
}
