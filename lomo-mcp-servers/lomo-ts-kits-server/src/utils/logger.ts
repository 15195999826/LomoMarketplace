/**
 * MCP Server 日志工具
 *
 * MCP 的 stdout 是 JSON-RPC 协议通道，所有日志必须走 stderr。
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3,
};

let currentLevel: LogLevel = 'INFO';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function formatTime(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level: LogLevel, module: string, msg: string, ...args: unknown[]) {
  if (!shouldLog(level)) return;
  const prefix = `[${formatTime()}][${level}][${module}]`;
  console.error(prefix, msg, ...args);
}

export function createLogger(module: string) {
  return {
    debug: (msg: string, ...args: unknown[]) => log('DEBUG', module, msg, ...args),
    info:  (msg: string, ...args: unknown[]) => log('INFO',  module, msg, ...args),
    warn:  (msg: string, ...args: unknown[]) => log('WARN',  module, msg, ...args),
    error: (msg: string, ...args: unknown[]) => log('ERROR', module, msg, ...args),
  };
}

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}
