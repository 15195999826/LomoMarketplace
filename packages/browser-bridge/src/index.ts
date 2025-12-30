/**
 * Browser Bridge
 * 浏览器控制桥接的共享类型和协议
 */

// 导出所有类型
export type {
  MessageType,
  TerminalInputMessage,
  TerminalOutputMessage,
  TerminalResizeMessage,
  BrowserCommandMessage,
  BrowserAction,
  ScreenshotParams,
  ClickParams,
  TypeParams,
  ScrollParams,
  ReadPageParams,
  KeyParams,
  HoverParams,
  NavigateParams,
  BrowserResultMessage,
  ConnectionStatusMessage,
  ErrorMessage,
  WSMessage,
  ScreenshotResult,
  PageElementInfo,
  ReadPageResult
} from "./types.js";

// 导出协议工具函数
export {
  serialize,
  deserialize,
  createTerminalInput,
  createTerminalOutput,
  createTerminalResize,
  createBrowserCommand,
  createBrowserResult,
  createBrowserError,
  createConnectionStatus,
  createError,
  isTerminalInput,
  isTerminalOutput,
  isTerminalResize,
  isBrowserCommand,
  isBrowserResult,
  isConnectionStatus,
  isError,
  DEFAULT_WS_PORT,
  RECONNECT_INTERVAL,
  BROWSER_COMMAND_TIMEOUT
} from "./protocol.js";
